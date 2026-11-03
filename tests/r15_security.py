#!/usr/bin/env python3
"""Real staging service, credential rotation, namespace and privilege tests."""
import json,os,subprocess,sys,time,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'));sys.path.insert(0,str(ROOT/'ops'))
from r0_http import Browser,csrf
from r0_environment import save_json,snapshot

def main():
    os.umask(0o077);state=Path(sys.argv[1]).resolve();assert str(state)=='/home/muflih/.local/state/sia-r15/20261031'
    unit='sia-r15-stage-20261031.service';base='http://127.0.0.1:18115';results=[];creds=json.loads((state/'private/fixture-login.json').read_text());known=[];passwords=[]
    def root(*args):return subprocess.run(['sudo','-n',*args],capture_output=True)
    def ctl(action):return root('python3',str(ROOT/'ops/release/r15_service_control.py'),action,'--state',str(state))
    def probe():
        r=ctl('read-probe');assert r.returncode==0;return json.loads(r.stdout)
    def check(value):assert value
    def test(name,fn):
        try:fn();results.append({'test':name,'status':'PASS'})
        except Exception as error:results.append({'test':name,'status':'FAIL','error_type':type(error).__name__})
        print(results[-1]['status']+' '+name,flush=True)
    def login(key):
        b=Browser(base);page=b.request('/auth/login.php');token=csrf(page[2]);known.append(token.encode());r=b.request('/auth/login.php','POST',{'csrf_token':token,'username':creds[key],'password':creds['password']});check(r[0]==302);known.extend(c.value.encode() for c in b.jar);return b
    config_path=state/'private/runtime.json'
    def config():return json.loads(config_path.read_text())
    def sync(value,want=0):save_json(config_path,value);r=ctl('sync');check((r.returncode==0) if want==0 else (r.returncode!=0))
    check(ctl('restore-a').returncode==0)
    current=probe();check(current['status']=='PASS' and not current['runtime_slot_b'])
    for key,value in current['checks'].items():test('worker_namespace_'+key,lambda value=value:check(value))
    test('runtime_uid_is_dedicated_nonroot',lambda:check(current['uid'] not in [0,1000]))
    test('http_binding_loopback_only',lambda:check('127.0.0.1:18115' in subprocess.check_output(['ss','-ltn','( sport = :18115 )']).decode() and '0.0.0.0:18115' not in subprocess.check_output(['ss','-ltn','( sport = :18115 )']).decode()))
    for name in ['runtime.json','migration-owner.json','runtime-next.json']:
        path='/etc/sia-r15-staging/20261031/'+name
        test('source_secret_'+name+'_root_0600',lambda path=path:check(root('stat','-c','%u:%a',path).stdout.strip()==b'0:600'))
        test('unauthorized_identity_cannot_read_'+name,lambda path=path:check(root('-u','nobody','test','-r',path).returncode==1))
    pid=subprocess.check_output(['systemctl','show',unit,'--property=MainPID','--value']).decode().strip();credential='/run/credentials/'+unit+'/app-config'
    test('operator_can_locate_loaded_credential_inside_namespace',lambda:check(root('nsenter','--target',pid,'--mount','--','test','-r',credential).returncode==0))
    test('other_identity_denied_loaded_credential_inside_namespace',lambda:check(root('nsenter','--target',pid,'--mount','--','setpriv','--reuid=65534','--regid=65534','--clear-groups','test','-r',credential).returncode!=0))
    test('namespace_canary_is_readable_on_host',lambda:check(root('-u','nobody','test','-r','/home/.sia-r15-namespace-canary-20261031').returncode==0))
    admin=login('admin');teacher=login('teacher_a');student=login('student_a');head=login('head')
    test('four_roles_login_on_hardened_service',lambda:check(all(b.request(path)[0]==200 for b,path in [(admin,'/admin/index.php'),(teacher,'/guru/index.php'),(student,'/siswa/index.php'),(head,'/kepsek/index.php')])))
    def restart_session():
        check(ctl('restart').returncode==0);check(probe()['status']=='PASS');check(admin.request('/admin/index.php')[0]==200)
    test('service_restart_preserves_authorized_session_and_credential_access',restart_session)
    before=snapshot(state/'private/inspector.json')
    def controlled_migration():
        env=os.environ.copy();env['SIA_CONFIG_FILE']=str(config_path)
        runtime=subprocess.run(['php',str(ROOT/'ops/database/migrate_r1.php'),'--apply','--expected-database=r1_testing_20261030'],env=env,capture_output=True);check(runtime.returncode==2)
        owner=root('env','SIA_CONFIG_FILE=/etc/sia-r15-staging/20261031/migration-owner.json','php',str(ROOT/'ops/database/migrate_r1.php'),'--apply','--expected-database=r1_testing_20261030');check(owner.returncode==0);check(snapshot(state/'private/inspector.json')==before)
    test('migration_owner_path_only_runtime_rejected_no_schema_drift',controlled_migration)
    def core_refuses_profile(user):
        file=state/'private'/('invalid-core-'+('root' if user else 'empty')+'.json');save_json(file,{'APP_ENV':'testing','DB_NAME':'r1_testing_20261030','DB_USER':user,'DB_PASS':'SYNTHETIC_UNUSED','DB_SOCKET':'/path/that/does/not/exist.sock'})
        env={k:v for k,v in os.environ.items() if not k.startswith('SIA_')};env['SIA_CONFIG_FILE']=str(file)
        code="require $argv[1];try{db();exit(3);}catch(PDOException $e){exit(4);}catch(RuntimeException $e){exit(0);}"
        check(subprocess.run(['php','-r',code,str(ROOT/'config/config.php')],env=env,capture_output=True).returncode==0)
    test('application_core_refuses_root_before_database_connection',lambda:core_refuses_profile('root'))
    test('application_core_has_no_implicit_default_database_account',lambda:core_refuses_profile(''))
    # Root-only reads are captured in memory to scan logs; never printed or persisted.
    for filename in ['runtime-slot-a.json','runtime-next.json','migration-owner.json']:
        r=root('cat','/etc/sia-r15-staging/20261031/'+filename);check(r.returncode==0);secret=json.loads(r.stdout)['DB_PASS'].encode();known.append(secret);passwords.append(secret)
    def rotate_b():
        check(ctl('rotate').returncode==0);check(probe()['runtime_slot_b']);check(admin.request('/admin/index.php')[0]==200);check(login('teacher_a').request('/guru/index.php')[0]==200)
    test('controlled_rotation_a_to_b_uses_new_identity_without_session_loss',rotate_b)
    def rollback_a():check(ctl('restore-a').returncode==0);check(not probe()['runtime_slot_b']);check(admin.request('/admin/index.php')[0]==200)
    test('controlled_credential_configuration_rollback_to_a',rollback_a)
    test('rotation_b_can_be_reapplied',rotate_b)
    valid=config()
    def refuse_root_profile():
        try:sync({**valid,'DB_USER':'root'},want=1);check(Browser(base).request('/auth/login.php')[0]==200)
        finally:sync(valid)
    test('root_database_profile_rejected_before_install',refuse_root_profile)
    def wrong_credential():
        try:
            sync({**valid,'DB_PASS':'INVALID_SYNTHETIC_CREDENTIAL'},want=1)
            check(subprocess.check_output(['systemctl','show',unit,'--property=ActiveState','--value']).strip()==b'failed');check(probe()['status']=='FAIL')
            try:Browser(base).request('/auth/login.php')
            except Exception:return
            raise AssertionError('Service used a fallback credential')
        finally:sync(valid)
    test('wrong_db_credential_fails_closed_no_old_or_root_fallback',wrong_credential)
    def absent_credential():
        source='/etc/sia-r15-staging/20261031/runtime.json';held=source+'.withheld'
        check(root('mv',source,held).returncode==0)
        try:
            check(ctl('restart').returncode!=0)
            check(subprocess.check_output(['systemctl','show',unit,'--property=MainPID','--value']).strip()==b'0')
        finally:check(root('mv',held,source).returncode==0);check(ctl('restart').returncode==0)
    test('missing_secret_stops_service_no_implicit_fallback',absent_credential)
    test('authorized_credential_restored_after_failure_and_restart',lambda:check(probe()['status']=='PASS' and probe()['runtime_slot_b'] and login('admin').request('/admin/index.php')[0]==200))
    for path in ['/runtime.json','/migration-owner.json','/credentials/app-config','/.env','/.git/config','/db_sia_smkn2_magelang.sql','/logs/php-errors.log','/ops/release/r15_service_probe.php']:
        test('http_secret_protection_'+path,lambda path=path:check(all(Browser(base).request(path,method)[0]==404 for method in ['GET','HEAD'])))
    def no_leak():
        journal=root('journalctl','-u',unit,'--no-pager','-o','json');check(journal.returncode==0);logs=ctl('read-log').stdout;known.append(creds['password'].encode());check(all(secret not in journal.stdout and secret not in logs for secret in known));check(b'PHP Fatal error' not in logs)
        page=Browser(base).request('/auth/login.php')[2].encode();check(all(secret not in page for secret in passwords))
    test('known_password_cookie_and_csrf_values_absent_from_logs',no_leak)
    test('security_tests_do_not_mutate_academic_database',lambda:check(snapshot(state/'private/inspector.json')==before))
    report={'passed':sum(t['status']=='PASS' for t in results),'failed':sum(t['status']=='FAIL' for t in results),'skipped':0,'tests':results,'staging_unit':unit,'port':18115,'production_touched':False,'final_runtime_slot_b':probe().get('runtime_slot_b',False),'startup_probe':probe()};save_json(state/'reports/security-tests.json',report);print(f"{report['passed']} PASS, {report['failed']} FAIL, 0 SKIP");return bool(report['failed'])

if __name__=='__main__':sys.exit(main())
