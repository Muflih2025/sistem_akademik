#!/usr/bin/env python3
"""Actual code/config rollback on the hardened staging service; never 8085."""
import json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'));sys.path.insert(0,str(ROOT/'ops'))
from r0_http import Browser,csrf
from r0_environment import snapshot,save_json

def main():
    os.umask(0o077);state=Path(sys.argv[1]);assert str(state)=='/home/muflih/.local/state/sia-r15/20261031';base='http://127.0.0.1:18115';results=[];creds=json.loads((state/'private/fixture-login.json').read_text())
    def ctl(action):return subprocess.run(['sudo','-n','python3',str(ROOT/'ops/release/r15_service_control.py'),action,'--state',str(state)],capture_output=True)
    def check(value):assert value
    def test(name,fn):
        try:fn();results.append({'test':name,'status':'PASS'})
        except Exception as error:results.append({'test':name,'status':'FAIL','error_type':type(error).__name__})
        print(results[-1]['status']+' '+name,flush=True)
    def login():
        b=Browser(base);page=b.request('/auth/login.php');check(b.request('/auth/login.php','POST',{'csrf_token':csrf(page[2]),'username':creds['admin'],'password':creds['password']})[0]==302);return b
    before=snapshot(state/'private/inspector.json');old_config=json.loads((state/'private/runtime.json').read_text());old=login()
    try:
        test('staging_application_rollback_command',lambda:check(ctl('rollback-code').returncode==0))
        config=json.loads((state/'private/runtime.json').read_text())
        test('rollback_rotates_session_name_and_path',lambda:check(config['SESSION_NAME']!=old_config['SESSION_NAME'] and config['SESSION_PATH']!=old_config['SESSION_PATH']))
        test('old_application_session_not_reused_by_r0',lambda:check(old.request('/admin/index.php')[0]==302))
        r0=login()
        test('r0_login_and_admin_read_with_nonroot_runtime',lambda:check(r0.request('/admin/index.php')[0]==200 and r0.request('/admin/master.php?table=siswa')[0]==200))
        def denied_role():
            response=r0.request('/guru/index.php');check(response[0]==302 and response[1].get('Location','').endswith('/errors/403.php'));check(r0.request('/errors/403.php')[0]==403)
        test('r0_role_guard_preserved',denied_role)
        test('r0_internal_files_remain_blocked',lambda:check(all(r0.request(path)[0]==404 for path in ['/.env','/.git/config','/db_sia_smkn2_magelang.sql','/config/config.php'])))
        test('rollback_keeps_new_isolated_runtime_profile',lambda:check(json.loads(ctl('read-probe').stdout)['status']=='PASS' and config['DB_USER']==old_config['DB_USER']))
    finally:forward=ctl('forward-code')
    test('forward_restores_candidate_and_rotates_session',lambda:check(forward.returncode==0 and json.loads((state/'private/runtime.json').read_text())['SESSION_NAME']!=config['SESSION_NAME']))
    test('candidate_healthy_after_forward',lambda:check(login().request('/admin/index.php')[0]==200))
    test('rollback_and_forward_preserve_all_database_schema_data',lambda:check(snapshot(state/'private/inspector.json')==before))
    report={'passed':sum(t['status']=='PASS' for t in results),'failed':sum(t['status']=='FAIL' for t in results),'skipped':0,'tests':results,'production_touched':False,'staging_only':True};save_json(state/'reports/rollback-tests.json',report);print(f"{report['passed']} PASS, {report['failed']} FAIL, 0 SKIP");return bool(report['failed'])

if __name__=='__main__':sys.exit(main())
