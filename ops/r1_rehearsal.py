#!/usr/bin/env python3
"""Create-only rehearsal of R1 on a private copy of the active database.

All source queries/dumps are read-only. DDL, accounts and grants are limited to
the existing socket-only staging instance. Never reuses or resets a database.
"""
import argparse, hashlib, json, os, re, secrets, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'ops'))
from r0_environment import cnf,mysql,save_json,snapshot

def query(config,sql,args=None):
    r=subprocess.run(['php',str(ROOT/'ops/read_only_query.php'),str(config)],input=json.dumps({'sql':sql,'args':args or []}).encode(),capture_output=True)
    if r.returncode:raise RuntimeError('Read-only review failed; details redacted')
    return json.loads(r.stdout)

def projection(config,columns):
    result={}
    for table in sorted({r['TABLE_NAME'] for r in columns}):
        fields=[r['COLUMN_NAME'] for r in columns if r['TABLE_NAME']==table]
        quote=lambda n:'`'+n.replace('`','``')+'`'
        rows=query(config,'SELECT '+','.join(map(quote,fields))+' FROM '+quote(table))
        hashes=sorted(hashlib.sha256(json.dumps(r,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()).hexdigest() for r in rows)
        result[table]={'rows':len(rows),'sha256':hashlib.sha256(''.join(hashes).encode()).hexdigest()}
    return result

def main():
    os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('--state',required=True);p.add_argument('--stage-admin-config',required=True);a=p.parse_args()
    state=Path(a.state).resolve();assert state.stat().st_uid==os.getuid() and not(state.stat().st_mode&0o077)
    source=state/'private/active-config.json';active=json.loads(source.read_text());admin=json.loads(Path(a.stage_admin_config).read_text())
    assert admin.get('DB_SOCKET') and not admin.get('DB_HOST') and admin['DB_SOCKET']!=active.get('DB_SOCKET')
    client=state/'private/stage-admin.cnf';cnf(client,admin)
    assert mysql(client,'SELECT @@skip_networking;').strip()==b'1'
    database='r1_review_20261030'
    assert mysql(client,"SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='"+database+"';").strip()==b'0','Refusing existing database'
    for user in ['r1_review_owner','r1_review_app']:
        assert mysql(client,"SELECT COUNT(*) FROM mysql.user WHERE User='"+user+"';").strip()==b'0','Refusing existing account'
    before=snapshot(source);save_json(state/'reports/source-before-copy.json',before)
    columns=query(source,'SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION')
    original=projection(source,columns);save_json(state/'reports/original-column-projection.json',original)
    active_client=state/'private/active-client.cnf';cnf(active_client,active)
    views=[n for n,v in before['tables'].items() if v['type']=='VIEW']
    dump=state/'backups/clone-tables-no-drop.sql'
    args=['mariadb-dump','--defaults-extra-file='+str(active_client),'--single-transaction','--skip-lock-tables','--skip-add-drop-table','--skip-add-locks','--skip-disable-keys','--skip-comments','--skip-triggers','--skip-routines','--skip-events']
    args+=['--ignore-table='+active['DB_NAME']+'.'+name for name in views]
    with dump.open('xb') as out:
        r=subprocess.run(args+[active['DB_NAME']],stdout=out,stderr=subprocess.PIPE)
    assert r.returncode==0
    sql=dump.read_text();assert not re.search(r'\b(DROP\s+TABLE|TRUNCATE)\b',sql,re.I)
    sql=sql.replace('`'+active['DB_NAME']+'`','`'+database+'`');dump.write_text(sql)
    mysql(client,'CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
    mysql(client,database=database,source=dump)
    inspector={**admin,'DB_NAME':database};save_json(state/'private/clone-inspector.json',inspector)
    objects=[]
    for name in views:
        row=query(source,'SHOW CREATE VIEW `'+name.replace('`','``')+'`')[0];objects.append(row['Create View'])
    for row in query(source,'SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()'):
        item=query(source,'SHOW CREATE TRIGGER `'+row['TRIGGER_NAME'].replace('`','``')+'`')[0];objects.append(item['SQL Original Statement'])
    for row in query(source,'SELECT ROUTINE_NAME,ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE()'):
        item=query(source,'SHOW CREATE '+row['ROUTINE_TYPE']+' `'+row['ROUTINE_NAME'].replace('`','``')+'`')[0];objects.append(item['Create '+row['ROUTINE_TYPE'].title()])
    normalized=[]
    for sql in objects:
        sql=sql.replace('`'+active['DB_NAME']+'`','`'+database+'`')
        sql=re.sub(r'DEFINER=`[^`]+`@`[^`]+`','',sql)
        assert not re.search(r'\b(DROP\s+TABLE|TRUNCATE)\b',sql,re.I)
        normalized.append(sql)
        # CREATE objects may contain internal semicolons; PDO executes one object.
    save_json(state/'private/clone-objects.json',normalized)
    helper="""$c=json_decode(file_get_contents($argv[1]),true);$p=new PDO('mysql:unix_socket='.$c['DB_SOCKET'].';dbname='.$c['DB_NAME'],$c['DB_USER'],$c['DB_PASS'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);if((int)$p->query('SELECT @@skip_networking')->fetchColumn()!==1)exit(2);foreach(json_decode(file_get_contents($argv[2]),true) as $s)$p->exec($s);"""
    r=subprocess.run(['php','-r',helper,str(state/'private/clone-inspector.json'),str(state/'private/clone-objects.json')],capture_output=True);assert r.returncode==0,'Clone objects failed; private details redacted'
    assert original==projection(state/'private/clone-inspector.json',columns),'Restore data mismatch'
    ownerpass=secrets.token_hex(32);apppass=secrets.token_hex(32)
    mysql(client,"CREATE USER 'r1_review_owner'@'localhost' IDENTIFIED BY '"+ownerpass+"';GRANT SELECT,INSERT,CREATE,ALTER,INDEX,REFERENCES ON `"+database+"`.* TO 'r1_review_owner'@'localhost';CREATE USER 'r1_review_app'@'localhost' IDENTIFIED BY '"+apppass+"';GRANT SELECT ON `"+database+"`.* TO 'r1_review_app'@'localhost';")
    owner={'APP_ENV':'staging','DB_SOCKET':admin['DB_SOCKET'],'DB_NAME':database,'DB_USER':'r1_review_owner','DB_PASS':ownerpass,'ALLOW_SCHEMA_CHANGES':'1'};save_json(state/'private/clone-owner.json',owner)
    env={k:v for k,v in os.environ.items() if not k.startswith('SIA_')};env['SIA_CONFIG_FILE']=str(state/'private/clone-owner.json')
    for _ in range(2):
        r=subprocess.run(['php',str(ROOT/'ops/migrate_r1.php'),'--apply','--expected-database='+database],env=env,capture_output=True);assert r.returncode==0,'Rehearsal migration failed; details redacted'
    migrated=projection(state/'private/clone-inspector.json',columns);save_json(state/'reports/migrated-original-column-projection.json',migrated)
    assert migrated==original,'Migration changed original data'
    base_columns=query(state/'private/clone-inspector.json','SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION')
    assert all(row in base_columns for row in columns),'Existing column changed'
    for table in ['jurusan','kelas','guru','siswa','mata_pelajaran','jadwal','users','tahun_ajaran','nilai','absensi','jurnal_kelas','bobot_penilaian','ekstrakurikuler','nilai_ekskul','kalender_akademik','catatan_evaluasi']:
        mysql(client,'GRANT INSERT,UPDATE ON `'+database+'`.`'+table+'` TO \'r1_review_app\'@\'localhost\';')
    mysql(client,'GRANT INSERT ON `'+database+'`.audit_aktivitas TO \'r1_review_app\'@\'localhost\';GRANT DELETE ON `'+database+'`.catatan_evaluasi TO \'r1_review_app\'@\'localhost\';')
    runtime={**owner,'DB_USER':'r1_review_app','DB_PASS':apppass,'ALLOW_SCHEMA_CHANGES':'0','SESSION_NAME':'SIA_R1_REVIEW','SESSION_PATH':str(state/'sessions'),'COOKIE_SECURE':'0','SECURITY_STATE_PATH':str(state/'security'),'SECURITY_LOG':str(state/'logs/clone-security.jsonl')};save_json(state/'private/clone-runtime.json',runtime);cnf(state/'private/clone-runtime.cnf',runtime)
    foreign=query(state/'private/clone-inspector.json','SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL')
    for fk in foreign:
        t,c,parent,ref=[fk[k].replace('`','``') for k in ['TABLE_NAME','COLUMN_NAME','REFERENCED_TABLE_NAME','REFERENCED_COLUMN_NAME']]
        assert int(query(state/'private/clone-inspector.json',f'SELECT COUNT(*) AS orphan_count FROM `{t}` c LEFT JOIN `{parent}` p ON p.`{ref}`=c.`{c}` WHERE c.`{c}` IS NOT NULL AND p.`{ref}` IS NULL')[0]['orphan_count'])==0
    denied={}
    for name,sql in [('ddl','CREATE TABLE r1_forbidden_probe(id INT)'),('audit_update','UPDATE audit_aktivitas SET action=action WHERE 1=0'),('historical_delete','DELETE FROM nilai WHERE 1=0'),('other_database','SELECT * FROM mysql.user LIMIT 0')]:
        r=subprocess.run(['mariadb','--defaults-extra-file='+str(state/'private/clone-runtime.cnf'),database],input=sql.encode(),capture_output=True);denied[name]=r.returncode!=0
    assert all(denied.values()),'Excess runtime permissions'
    after=snapshot(source);save_json(state/'reports/source-after-copy.json',after);assert before==after,'Active data drift during rehearsal'
    save_json(state/'reports/clone-after-migration.json',snapshot(state/'private/clone-inspector.json'))
    report={'status':'PASS','copy_data_exact':True,'original_columns_unchanged':True,'original_data_unchanged_after_migration':True,'source_unchanged':True,'migration_applied_twice':True,'old_tables':len(original),'original_rows':sum(v['rows'] for n,v in original.items() if before['tables'][n]['type']=='BASE TABLE'),'foreign_keys_checked':len(foreign),'views_restored':len(views),'objects_restored':len(objects),'runtime_denials':denied,'runtime_nonroot':True,'owner_separate':True,'production_grants_changed':False,'no_drop_table_or_truncate':True,'clone_only_definer_and_database_normalization':True}
    save_json(state/'reports/migration-rehearsal.json',report);print('PASS: exact private restore, additive R1 migration, original rows/columns preserved, all FK valid, runtime least privilege, active unchanged.')

if __name__=='__main__':main()
