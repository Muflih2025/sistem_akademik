#!/usr/bin/env python3
"""Read-only final integrity checks; optional restart of the guarded 18125 unit."""
import argparse,hashlib,json,pathlib,subprocess,sys,os,datetime
from zoneinfo import ZoneInfo
ROOT=pathlib.Path(__file__).resolve().parents[1]
STATE=pathlib.Path('/home/muflih/.local/state/sia-academic-dev/20261031')
sys.path[:0]=[str(ROOT/'tests'),str(ROOT/'ops')]
from r0_environment import snapshot,save_json
from r1_integrity import manifest
from academic_http import Browser,csrf

def main():
 os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('--restart-development',action='store_true');args=p.parse_args()
 c=json.loads((STATE/'private/runtime.json').read_text());assert c['APP_ENV']=='testing'and c['DB_NAME']=='sia_academic_dev_20261031'and c['DB_SOCKET']and c['DB_USER']!='root'
 def db(sql,params=[]):
  r=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private/inspector.json')],input=json.dumps({'sql':sql,'args':params}),text=True,capture_output=True,check=True);return json.loads(r.stdout)
 checks={};before=snapshot(STATE/'private/inspector.json')
 if args.restart_development:
  creds=json.loads((STATE/'private/test-accounts.json').read_text());b=Browser();r=b.request('/auth/login.php');assert b.request('/auth/login.php','POST',{'csrf_token':csrf(r[2].decode()),'username':creds['head'],'password':creds['password']})[0]==302
  subprocess.run(['python3',str(ROOT/'ops/academic/academic_server.py'),'restart'],capture_output=True,check=True)
  checks['development_restart_session_survives']=b.request('/guru-mengajar?tanggal=2026-10-30&jam_ke=1')[0]==200
  checks['restart_preserves_complete_development_snapshot']=snapshot(STATE/'private/inspector.json')==before
 protected=json.loads((STATE/'private/simulation-school-protected.json').read_text());excel=[r['nis']for r in protected['siswa']]
 proof=json.loads((STATE/'reports/cleanup-backup-restore.json').read_text());backup_config=STATE/'private'/('cleanup-restored-'+proof['restore_database'].rsplit('_',1)[1]+'.json')
 def archived(sql,params=[]):
  r=subprocess.run(['php',str(ROOT/'ops/database/read_only_query.php'),str(backup_config)],input=json.dumps({'sql':sql,'args':params}),text=True,capture_output=True,check=True);return json.loads(r.stdout)
 key_names={'kelas':'id_kelas','jurusan':'id_jurusan','ak_ruang':'id_ruang','ak_jam_belajar':'id'}
 for t,rows in protected.items():
  current=db('SELECT * FROM '+t+(' WHERE nis IN('+','.join('?'for _ in excel)+') ORDER BY nis'if t in ['siswa','ak_anggota_kelas']else' ORDER BY 1'),excel if t in ['siswa','ak_anggota_kelas']else[]);checks['protected_'+t+'_unchanged']=current==rows
  if t in ['siswa','ak_anggota_kelas']:sql='SELECT * FROM '+t+' WHERE nis IN('+','.join('?'for _ in excel)+') ORDER BY nis';ids=excel
  else:ids=[r[key_names[t]]for r in rows];sql='SELECT * FROM '+t+' WHERE '+key_names[t]+' IN('+','.join('?'for _ in ids)+') ORDER BY 1'
  checks['pre_cleanup_backup_matches_protected_'+t]=archived(sql,ids)==rows
 plan=json.loads((STATE/'private/cleanup-5days-plan.json').read_text());core=plan['core_users'];sql='SELECT * FROM users WHERE id_user IN('+','.join('?'for _ in core)+') ORDER BY id_user';checks['core_accounts_passwords_roles_unchanged']=db(sql,core)==archived(sql,core)
 for t in ['audit_aktivitas','ak_riwayat']:
  pk=next(iter(plan['tables'][t]['protected'][0]));limit=max(row[pk]for row in plan['tables'][t]['protected']);columns=[r['Field']for r in db('SHOW COLUMNS FROM '+t)];expr='SHA2(JSON_ARRAY('+','.join('`'+v+'`'for v in columns)+'),256)';sql='SELECT `'+pk+'`, '+expr+' AS row_hash FROM '+t+' WHERE `'+pk+'`<=? ORDER BY `'+pk+'`';checks['all_pre_cleanup_'+t+'_rows_byte_equal']=db(sql,[limit])==archived(sql,[limit])
 foreign=db('SELECT CONSTRAINT_NAME,TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION');groups={}
 for r in foreign:groups.setdefault((r['TABLE_NAME'],r['CONSTRAINT_NAME'],r['REFERENCED_TABLE_NAME']),[]).append(r)
 orphans=0
 for(child,key,parent),cols in groups.items():
  q=lambda s:'`'+s.replace('`','``')+'`';join=' AND '.join('c.'+q(x['COLUMN_NAME'])+'=p.'+q(x['REFERENCED_COLUMN_NAME'])for x in cols);nonnull=' AND '.join('c.'+q(x['COLUMN_NAME'])+' IS NOT NULL'for x in cols)
  orphans+=db('SELECT COUNT(*) n FROM '+q(child)+' c LEFT JOIN '+q(parent)+' p ON '+join+' WHERE '+nonnull+' AND p.'+q(cols[0]['REFERENCED_COLUMN_NAME'])+' IS NULL')[0]['n']
 checks['foreign_keys_enabled_no_orphans']=db('SELECT @@foreign_key_checks n')[0]['n']==1 and orphans==0
 grantee="'"+c['DB_USER']+"'@'localhost'";priv={r['PRIVILEGE_TYPE']for r in db('SELECT PRIVILEGE_TYPE FROM information_schema.SCHEMA_PRIVILEGES WHERE GRANTEE=? UNION SELECT PRIVILEGE_TYPE FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE=?',[grantee,grantee])}
 checks['runtime_no_DDL_no_grant']=not priv.intersection({'CREATE','ALTER','DROP','INDEX','REFERENCES','GRANT OPTION','TRIGGER','EVENT','CREATE ROUTINE','ALTER ROUTINE'})
 checks['runtime_not_root_distinct_deployment']=c['DB_USER']!='root'and c['DB_USER']!=json.loads((STATE/'private/owner.json').read_text())['DB_USER']
 baseline=STATE/'reports/kelas10-baseline'
 for name,target in [('source','/home/muflih/Sistem-Informasi-Akademik-Sekolah-Laravel'),('active-release','/home/muflih/.local/share/sia-releases/r0-531d2f8')]:checks[name+'_unchanged']=manifest(pathlib.Path(target))==json.loads((baseline/(name+'-before.json')).read_text())
 expected=json.loads((STATE/'reports/week-baseline/target-before-document-update.json').read_text());actual=manifest(pathlib.Path('/home/muflih/sistem_akademik'));delta=sorted(k for k in expected.keys()|actual.keys()if expected.get(k)!=actual.get(k));checks['target_only_requested_manual_document_changed']=delta==['test.md']
 service=subprocess.check_output(['systemctl','show','sistem-akademik.service','--property=User','--property=ActiveState','--property=MainPID','--property=ExecMainStartTimestamp']);checks['active_8085_PID_start_user_unchanged']=service==(baseline/'service-before.txt').read_bytes();checks['active_service_configuration_unchanged']=hashlib.sha256(pathlib.Path('/etc/systemd/system/sistem-akademik.service.d/90-r0.conf').read_bytes()).hexdigest()==(baseline/'service-before.sha256').read_text()
 active=snapshot(pathlib.Path('/home/muflih/.local/state/sia-r0/activation-20261030/private/active-config.json'));checks['active_DB_every_schema_row_object_unchanged']=active==json.loads((baseline/'active-database-before.json').read_text());checks['active_18_assignments_preserved']=active['tables']['jadwal']['rows']==18
 original=json.loads((STATE/'private/before-cleanup-snapshot.json').read_text());checks['audit_logs_not_deleted']=before['tables']['audit_aktivitas']['rows']>=original['tables']['audit_aktivitas']['rows']and before['tables']['ak_riwayat']['rows']>=original['tables']['ak_riwayat']['rows']
 refused=subprocess.run(['php',str(ROOT/'ops/academic/academic_fixture_cleanup.php'),'--apply-approved-fixtures-only'],capture_output=True);checks['cleanup_cannot_be_replayed']=refused.returncode!=0 and snapshot(STATE/'private/inspector.json')==before
 phpfiles=list(ROOT.rglob('*.php'));checks['PHP_syntax']=all(subprocess.run(['php','-l',str(f)],capture_output=True).returncode==0 for f in phpfiles)
 jsfiles=[ROOT/'assets/js/academic.js',*ROOT.glob('tests/*.cjs')];checks['JS_syntax']=all(subprocess.run(['node','--check',str(f)],capture_output=True).returncode==0 for f in jsfiles)
 checks['git_whitespace']=subprocess.run(['git','diff','--check'],cwd=ROOT,capture_output=True).returncode==0
 counts={t:db('SELECT COUNT(*) n FROM '+t)[0]['n']for t in ['siswa','kelas','guru','jurusan','mata_pelajaran','tahun_ajaran','ak_ruang','ak_pertemuan','ak_nilai','ak_absensi_harian','ak_rapor_snapshot']}
 report={'status':'PASS'if all(checks.values())else'FAIL','checked_at':datetime.datetime.now(ZoneInfo('Asia/Jakarta')).isoformat(),'checks':checks,'foreign_keys_checked':len(groups),'orphan_rows':orphans,'php_files':len(phpfiles),'javascript_files':len(jsfiles),'counts':counts,'active_snapshot_sha256':hashlib.sha256(json.dumps(active,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'target_changes':delta,'active_8085_modified':False};save_json(STATE/'reports/week-integrity.json',report);print(json.dumps(report));return 0 if all(checks.values())else 1

if __name__=='__main__':
 try:raise SystemExit(main())
 except Exception as e:print('FAIL week integrity '+type(e).__name__+'; private details omitted',file=sys.stderr);raise SystemExit(1)
