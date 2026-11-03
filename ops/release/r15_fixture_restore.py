#!/usr/bin/env python3
"""Create-only backup/restore verification on the socket-only SYNTHETIC server."""
import argparse,hashlib,json,os,re,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'ops'))
from r0_environment import mysql,save_json,snapshot
from r1_rehearsal import query,projection

def main():
    os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('--state',required=True);p.add_argument('--destination',required=True);a=p.parse_args();state=Path(a.state).resolve();dest=a.destination
    assert str(state)=='/home/muflih/.local/state/sia-r15/20261031' and re.fullmatch('r15_restore_[a-z0-9_]+',dest)
    source=state/'private/inspector.json';config=json.loads(source.read_text());assert config['DB_NAME']=='r1_testing_20261030' and config.get('DB_SOCKET') and not config.get('DB_HOST')
    client=state/'private/stage-admin.cnf';assert mysql(client,'SELECT @@skip_networking;').strip()==b'1'
    assert mysql(client,"SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='"+dest+"';").strip()==b'0','Refusing overwrite/reset'
    before=snapshot(source);columns=query(source,'SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION');original=projection(source,columns)
    views=[name for name,info in before['tables'].items() if info['type']=='VIEW'];dump=state/'backups'/(dest+'-tables.sql');assert not dump.exists()
    command=['mariadb-dump','--defaults-extra-file='+str(client),'--single-transaction','--skip-lock-tables','--skip-add-drop-table','--skip-add-locks','--skip-disable-keys','--skip-comments','--skip-triggers','--skip-routines','--skip-events']
    command+=['--ignore-table=r1_testing_20261030.'+view for view in views]
    with dump.open('xb') as stream:r=subprocess.run(command+['r1_testing_20261030'],stdout=stream,stderr=subprocess.PIPE)
    assert r.returncode==0;sql=dump.read_text();assert not re.search(r'\b(DROP\s+TABLE|TRUNCATE)\b',sql,re.I)
    dump.write_text(sql.replace('`r1_testing_20261030`','`'+dest+'`'));mysql(client,'CREATE DATABASE `'+dest+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');mysql(client,database=dest,source=dump)
    restored={**config,'DB_NAME':dest};inspection=state/'private'/(dest+'-inspector.json');save_json(inspection,restored)
    objects=[]
    for view in views:objects.append(query(source,'SHOW CREATE VIEW `'+view+'`')[0]['Create View'])
    for row in query(source,'SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()'):objects.append(query(source,'SHOW CREATE TRIGGER `'+row['TRIGGER_NAME']+'`')[0]['SQL Original Statement'])
    for row in query(source,'SELECT ROUTINE_NAME,ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE()'):objects.append(query(source,'SHOW CREATE '+row['ROUTINE_TYPE']+' `'+row['ROUTINE_NAME']+'`')[0]['Create '+row['ROUTINE_TYPE'].title()])
    objects=[re.sub(r'DEFINER=`[^`]+`@`[^`]+`','',sql.replace('`r1_testing_20261030`','`'+dest+'`')) for sql in objects];objectfile=state/'private'/(dest+'-objects.json');save_json(objectfile,objects)
    php="$c=json_decode(file_get_contents($argv[1]),true);$p=new PDO('mysql:unix_socket='.$c['DB_SOCKET'].';dbname='.$c['DB_NAME'],$c['DB_USER'],$c['DB_PASS'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);if((int)$p->query('SELECT @@skip_networking')->fetchColumn()!==1)exit(2);foreach(json_decode(file_get_contents($argv[2]),true) as $s)$p->exec($s);"
    result=subprocess.run(['php','-r',php,str(inspection),str(objectfile)],capture_output=True);assert result.returncode==0
    exact=projection(inspection,columns)==original;assert exact and snapshot(source)==before
    keys=query(inspection,'SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL')
    for fk in keys:
        t,c,parent,target=[fk[key] for key in ['TABLE_NAME','COLUMN_NAME','REFERENCED_TABLE_NAME','REFERENCED_COLUMN_NAME']]
        assert int(query(inspection,f'SELECT COUNT(*) AS n FROM `{t}` c LEFT JOIN `{parent}` p ON c.`{c}`=p.`{target}` WHERE c.`{c}` IS NOT NULL AND p.`{target}` IS NULL')[0]['n'])==0
    report={'status':'PASS','synthetic_only':True,'source_unchanged':True,'destination_new_only':True,'data_exact':exact,'tables':sum(t['type']=='BASE TABLE' for t in before['tables'].values()),'views':len(views),'objects_restored':len(objects),'foreign_keys':len(keys),'rows':sum(t.get('rows',0) for t in before['tables'].values()),'backup_sha256':hashlib.sha256(dump.read_bytes()).hexdigest(),'destination':dest,'production_touched':False};save_json(state/'reports/fixture-restore.json',report);print('PASS: synthetic backup restored into a NEW database; all original columns/data, objects and FK verified; source unchanged.')

if __name__=='__main__':main()
