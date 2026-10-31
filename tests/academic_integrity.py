#!/usr/bin/env python3
"""Integrity, privileges, restore and controlled LOCAL restart; never 8085 writes."""
import argparse,gzip,hashlib,json,os,re,secrets,subprocess,sys,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'ops'));sys.path.insert(0,str(ROOT/'tests'))
from r0_environment import mysql,save_json,snapshot
from r1_integrity import manifest
from academic_http import STATE,Browser,csrf

def main():
 os.umask(0o077);results=[];tag=secrets.token_hex(3)
 parser=argparse.ArgumentParser();parser.add_argument('--baseline-directory');options=parser.parse_args()
 baseline=Path(options.baseline_directory).resolve() if options.baseline_directory else STATE/'reports'
 if not baseline.is_relative_to((STATE/'reports').resolve()):raise ValueError('Baseline must be private local evidence')
 def check(v,message='Expected condition not met'):
  if not v:raise AssertionError(message)
 def test(name,fn):
  try:fn();results.append({'test':name,'status':'PASS'})
  except Exception as e:results.append({'test':name,'status':'FAIL','error_type':type(e).__name__,'detail':str(e) if isinstance(e,AssertionError) else 'Private operation details omitted'})
  print(results[-1]['status']+' '+name,flush=True)
 def command(args,**kwargs):
  r=subprocess.run(args,capture_output=True,**kwargs)
  if r.returncode:raise RuntimeError('Local verification command failed')
  return r.stdout
 def db(sql,args=None,config='inspector.json'):
  return json.loads(command(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private'/config)],input=json.dumps({'sql':sql,'args':args or []}).encode()))
 cfg_path=STATE/'private/runtime.json';runtime=json.loads(cfg_path.read_text());assert runtime['DB_NAME']=='sia_academic_dev_20261031' and runtime['DB_USER']=='ak_dev_runtime_1031' and runtime.get('DB_SOCKET')
 # Structural and referential constraints for every FK, including the retained schema.
 foreign=db("SELECT CONSTRAINT_NAME,TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME,ORDINAL_POSITION FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION")
 groups={}
 for row in foreign:groups.setdefault((row['TABLE_NAME'],row['CONSTRAINT_NAME'],row['REFERENCED_TABLE_NAME']),[]).append(row)
 for (child,key,parent),columns in groups.items():
  def orphan(child=child,parent=parent,columns=columns):
   quote=lambda s:'`'+s.replace('`','``')+'`';join=' AND '.join('c.'+quote(x['COLUMN_NAME'])+'=p.'+quote(x['REFERENCED_COLUMN_NAME']) for x in columns);notnull=' AND '.join('c.'+quote(x['COLUMN_NAME'])+' IS NOT NULL' for x in columns)
   count=next(iter(db('SELECT COUNT(*) n FROM '+quote(child)+' c LEFT JOIN '+quote(parent)+' p ON '+join+' WHERE '+notnull+' AND p.'+quote(columns[0]['REFERENCED_COLUMN_NAME'])+' IS NULL')[0].values()));check(count==0)
  test('foreign_key_no_orphans_'+child+'_'+key,orphan)
 grantee="'"+runtime['DB_USER']+"'@'localhost'"
 privileges=db('SELECT PRIVILEGE_TYPE FROM information_schema.SCHEMA_PRIVILEGES WHERE GRANTEE=? UNION SELECT PRIVILEGE_TYPE FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE=?',[grantee,grantee]);types={row['PRIVILEGE_TYPE'] for row in privileges}
 test('runtime_no_DDL_no_grant_privileges',lambda:check(not types.intersection({'CREATE','ALTER','DROP','INDEX','REFERENCES','GRANT OPTION','TRIGGER','EVENT','CREATE ROUTINE','ALTER ROUTINE'})))
 test('runtime_and_deployment_distinct_principals',lambda:check(runtime['DB_USER']!=json.loads((STATE/'private/owner.json').read_text())['DB_USER']))
 test('runtime_not_root_and_staging_socket_only',lambda:check(runtime['DB_USER']!='root' and db('SELECT @@skip_networking n',config='runtime.json')[0]['n']==1))
 for table in ['ak_aturan_nilai','ak_rapor_snapshot','ak_riwayat','ak_jam_belajar','ak_kenaikan_batch','ak_kenaikan_detail']:
  test('append_only_runtime_grants_'+table,lambda table=table:check({r['PRIVILEGE_TYPE'] for r in db('SELECT PRIVILEGE_TYPE FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',[grantee,table])}=={'SELECT','INSERT'}))
 # Fresh private backup and create-only restore on the socket-only synthetic server.
 client=Path('/home/muflih/.local/state/sia-r0/20261030-r0/private/stage-admin.cnf');check(mysql(client,'SELECT @@skip_networking').strip()==b'1')
 before=snapshot(STATE/'private/inspector.json');backup=STATE/'backups'/('academic-'+tag+'.sql.gz')
 dump=command(['mariadb-dump','--defaults-extra-file='+str(client),'--single-transaction','--skip-lock-tables','--skip-add-drop-table','--skip-add-locks','--skip-disable-keys','--skip-comments',runtime['DB_NAME']])
 check(not backup.exists())
 with gzip.open(backup,'xb')as stream:stream.write(dump)
 test('backup_readable_and_source_unchanged',lambda:check(gzip.open(backup,'rb').read()==dump and snapshot(STATE/'private/inspector.json')==before))
 restored_name='sia_academic_test_restore_'+tag;check(mysql(client,"SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='"+restored_name+"'").strip()==b'0')
 mysql(client,'CREATE DATABASE `'+restored_name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
 temporary=STATE/'private'/('restore-'+tag+'.sql');temporary.write_bytes(dump)
 try:mysql(client,database=restored_name,source=temporary)
 finally:temporary.unlink()
 inspector=json.loads((STATE/'private/inspector.json').read_text());restored_config=STATE/'private'/('restored-'+tag+'.json');save_json(restored_config,{**inspector,'DB_NAME':restored_name})
 restored=snapshot(restored_config);test('restore_exact_all_table_schema_data_objects',lambda:check(restored==before))
 restore_report={'database':runtime['DB_NAME'],'restore_database':restored_name,'backup':str(backup),'backup_sha256':hashlib.sha256(backup.read_bytes()).hexdigest(),'exact_snapshot_match':restored==before,'tables':len(before['tables']),'rows':sum(x.get('rows',0) for x in before['tables'].values())};save_json(STATE/'reports/restore-latest.json',restore_report)
 # Actual restart of only the owned localhost dev unit. Its probes run in the namespace.
 creds=json.loads((STATE/'private/test-accounts.json').read_text())
 def login():
  b=Browser();r=b.request('/auth/login.php');r=b.request('/auth/login.php','POST',{'csrf_token':csrf(r[2].decode()),'username':creds['teacher'],'password':creds['password']});check(r[0]==302);return b
 b=login();before_restart=snapshot(STATE/'private/inspector.json')
 test('local_development_restart',lambda:command(['python3',str(ROOT/'ops/academic_server.py'),'restart']))
 test('login_session_survives_local_restart',lambda:check(b.request('/academic/index.php?view=pertemuan&id_jadwal=1&tanggal=2026-10-30')[0]==200))
 test('restart_preserves_all_database_hashes',lambda:check(snapshot(STATE/'private/inspector.json')==before_restart))
 probe=json.loads(command(['sudo','-n','cat','/var/lib/sia-academic-dev-20261031/startup-probe.json']))
 for key,value in probe.items():test('namespace_probe_'+key,lambda value=value:check(value is True))
 props=command(['systemctl','show','sia-academic-dev-20261031.service','--property=DynamicUser','--property=ProtectHome','--property=ProtectSystem','--property=NoNewPrivileges','--property=User']).decode()
 test('dev_process_R15_hardening_properties',lambda:check(all(x in props for x in ['DynamicUser=yes','User=sia-academic-dev','ProtectHome=yes','ProtectSystem=strict','NoNewPrivileges=yes'])))
 test('development_bound_to_loopback_only',lambda:check('127.0.0.1:18125' in command(['ss','-ltn','( sport = :18125 )']).decode() and '0.0.0.0:18125' not in command(['ss','-ltn','( sport = :18125 )']).decode()))
 # Wrong credentials must fail startup, with no fallback to a different DB.
 try:
  bad={**runtime,'DB_PASS':secrets.token_hex(32)};save_json(cfg_path,bad)
  failed=subprocess.run(['python3',str(ROOT/'ops/academic_server.py'),'refresh'],capture_output=True)
  test('wrong_runtime_credential_startup_fails_closed',lambda:check(failed.returncode!=0))
 finally:
  save_json(cfg_path,runtime);command(['python3',str(ROOT/'ops/academic_server.py'),'refresh'])
 test('known_configuration_recovers_development_only',lambda:check(login().request('/academic/index.php')[0]==200))
 test('failed_startup_did_not_mutate_database',lambda:check(snapshot(STATE/'private/inspector.json')==before_restart))
 # CLI migrations cannot be pointed at the active DB/environment, even with a staging owner.
 for kind,change in [('production_environment',{'APP_ENV':'production'}),('active_database_name',{'DB_NAME':'db_sia_smkn2_magelang'})]:
  owner=json.loads((STATE/'private/owner.json').read_text());path=STATE/'private'/('refused-'+kind+'.json');save_json(path,{**owner,**change})
  r=subprocess.run(['php',str(ROOT/'ops/migrate_academic.php'),'--apply','--expected-database='+change.get('DB_NAME',runtime['DB_NAME'])],env={**os.environ,'SIA_CONFIG_FILE':str(path)},capture_output=True)
  test('migration_guard_'+kind,lambda r=r:check(r.returncode==2))
 # Syntax checks are reported separately from functional assertions.
 php_files=list(ROOT.rglob('*.php'));lint=[subprocess.run(['php','-l',str(file)],capture_output=True).returncode for file in php_files]
 test('php_lint_all_'+str(len(php_files))+'_files',lambda:check(all(code==0 for code in lint)))
 for file in ['assets/js/academic.js','ops/academic_pdf.cjs','tests/academic_browser.cjs']:test('javascript_syntax_'+file,lambda file=file:command(['node','--check',str(ROOT/file)]))
 log=command(['sudo','-n','python3',str(ROOT/'ops/academic_runtime.py'),'read-log'])
 secret_values=[creds['password'],runtime['DB_PASS'],json.loads((STATE/'private/owner.json').read_text())['DB_PASS']]
 def no_secrets():
  for secret in secret_values:
   if len(secret)>=12:check(secret.encode()not in log)
   else:check(not re.search(rb'(?:["\'](?:password|new_password)["\']\s*:\s*["\']'+re.escape(secret.encode())+rb'["\']|(?:^|[&\s])password='+re.escape(secret.encode())+rb'(?:[&\s]|$))',log))
 test('no_passwords_in_development_PHP_log',no_secrets)
 test('no_PHP_fatal_errors_in_development_log',lambda:check(b'Fatal error' not in log and b'Parse error' not in log))
 # Compare all protected resources against the pre-development private baselines.
 for name,root in [('target','/home/muflih/sistem_akademik'),('source','/home/muflih/Sistem-Informasi-Akademik-Sekolah-Laravel'),('active-release','/home/muflih/.local/share/sia-releases/r0-531d2f8')]:
  after=manifest(Path(root));save_json(STATE/'reports'/(name+'-after.json'),after)
  test('unchanged_'+name+'_every_file_hash',lambda after=after,name=name:check(after==json.loads((baseline/(name+'-before.json')).read_text())))
 test('unchanged_target_existing_git_changes',lambda:check(command(['git','-C','/home/muflih/sistem_akademik','status','--short'])==(baseline/'git-target-before.txt').read_bytes()))
 service=command(['systemctl','show','sistem-akademik.service','--property=User','--property=ActiveState','--property=MainPID','--property=ExecMainStartTimestamp'])
 test('unchanged_8085_service_PID_start_time_user_state',lambda:check(service==(baseline/'service-before.txt').read_bytes()))
 test('unchanged_8085_service_configuration',lambda:check(hashlib.sha256(Path('/etc/systemd/system/sistem-akademik.service.d/90-r0.conf').read_bytes()).hexdigest()==(baseline/'service-before.sha256').read_text()))
 active=snapshot(Path('/home/muflih/.local/state/sia-r0/activation-20261030/private/active-config.json'));save_json(STATE/'reports/active-database-after.json',active)
 test('unchanged_active_database_every_schema_row_view_trigger_routine_hash',lambda:check(active==json.loads((baseline/'active-database-before.json').read_text())))
 def legacy_count():
  source=Path('/home/muflih/.local/state/sia-r0/activation-20261030/private/active-config.json')
  rows=json.loads(command(['php',str(ROOT/'ops/read_only_query.php'),str(source)],input=json.dumps({'sql':'SELECT COUNT(*) AS total FROM jadwal'}).encode()))
  check(rows[0]['total']==18)
 test('18_legacy_assignments_preserved_active_read_only_count',legacy_count)
 test('no_new_academic_tables_added_to_active_DB',lambda:check('ak_penugasan' not in active['tables'] and 'ak_pertemuan' not in active['tables']))
 report={'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results),'skipped':0,'tests':results,'baseline_directory':str(baseline),'php_lint_files':len(php_files),'foreign_keys_checked':len(groups),'active_database_unchanged':active==json.loads((baseline/'active-database-before.json').read_text()),'restore':restore_report};save_json(STATE/'reports/academic-integrity-tests.json',report);print(f"{report['passed']} PASS, {report['failed']} FAIL, 0 SKIP");return 1 if report['failed']else 0

if __name__=='__main__':
 try:sys.exit(main())
 except Exception as error:print('FAIL integrity runner '+type(error).__name__+'; sensitive details omitted.',file=sys.stderr);sys.exit(2)
