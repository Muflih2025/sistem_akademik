#!/usr/bin/env python3
"""Smoke frozen R1 and R0 rollback against the private migrated clone only."""
import argparse, json, os, secrets, shutil, signal, socket, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'ops'));sys.path.insert(0,str(ROOT/'tests'))
from r0_environment import save_json,cnf,mysql,snapshot
from r0_http import Browser,csrf
from r1_rehearsal import query,projection

def main():
    os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('--state',required=True);p.add_argument('--candidate',required=True);a=p.parse_args()
    state=Path(a.state).resolve();candidate=Path(a.candidate).resolve();release=json.loads((candidate/'RELEASE.json').read_text());commit=release['commit']
    runtime=json.loads((state/'private/clone-runtime.json').read_text());inspector=state/'private/clone-inspector.json'
    assert runtime['DB_NAME']=='r1_review_20261030' and runtime.get('DB_SOCKET') and not runtime.get('DB_HOST')
    assert int(query(inspector,'SELECT @@skip_networking AS disabled')[0]['disabled'])==1
    results=[]
    def check(condition):
        if not condition:raise AssertionError('Unexpected result; sensitive context redacted')
    def test(name,fn):
        try:fn();results.append({'test':name,'status':'PASS'})
        except Exception as error:results.append({'test':name,'status':'FAIL','error_type':type(error).__name__})
        print(results[-1]['status']+' '+name,flush=True)
    def status(response,want):check(response[0]==want)
    client=state/'private/stage-admin.cnf';username='r1_review_'+secrets.token_hex(6);password=secrets.token_hex(24)
    hashed=subprocess.check_output(['php','-r','echo password_hash(trim(stream_get_contents(STDIN)),PASSWORD_BCRYPT);'],input=password.encode()).decode()
    mysql(client,"INSERT INTO users(username,password,role,status) VALUES('"+username+"','"+hashed+"','admin','aktif');",database=runtime['DB_NAME'])
    with_fixture=snapshot(inspector)
    rollback=state/'rollback/r0-531d2f8'
    if not rollback.exists():shutil.copytree('/home/muflih/.local/share/sia-releases/r0-531d2f8',rollback)
    def serve(name,root,port):
        with socket.socket() as probe:check(probe.connect_ex(('127.0.0.1',port))!=0)
        config={**runtime,'SESSION_NAME':'SIA_REVIEW_'+name.upper()};cfg=state/'private'/('smoke-'+name+'.json');save_json(cfg,config)
        env={k:v for k,v in os.environ.items() if not k.startswith('SIA_') and k!='PHP_CLI_SERVER_WORKERS'};env['SIA_CONFIG_FILE']=str(cfg)
        log=(state/'logs'/('smoke-'+name+'.log')).open('ab')
        process=subprocess.Popen(['php','-d','display_errors=0','-d','log_errors=1','-d','error_log='+str(state/'logs'/('smoke-'+name+'-errors.log')),'-d','upload_tmp_dir='+str(state/'uploads'),'-S','127.0.0.1:'+str(port),'-t',str(root/'public'),str(root/'public/index.php')],cwd=root,env=env,stdout=log,stderr=log,start_new_session=True)
        base='http://127.0.0.1:'+str(port)
        try:
            for _ in range(50):
                try:
                    if Browser(base).request('/auth/login.php')[0]==200:break
                except Exception:time.sleep(.1)
            else:raise RuntimeError('Private smoke server unavailable')
            b=Browser(base);page=b.request('/auth/login.php')
            test(name+'_guest_login_200',lambda:status(page,200))
            test(name+'_guest_admin_denied',lambda:status(b.request('/admin/index.php'),302))
            test(name+'_internal_files_blocked',lambda:[status(b.request(path),404) for path in ['/db_sia_smkn2_magelang.sql','/.git/config','/.env','/server.log','/config/config.php','/ops/read_only_query.php']])
            test(name+'_login_fixture_only',lambda:status(b.request('/auth/login.php','POST',{'csrf_token':csrf(page[2]),'username':username,'password':password}),302))
            test(name+'_admin_page_after_additive_migration',lambda:status(b.request('/admin/index.php'),200))
            test(name+'_master_page_after_additive_migration',lambda:status(b.request('/admin/master.php?table=siswa'),200))
            def role_guard():
                response=b.request('/guru/index.php')
                if name=='r0_rollback':
                    # R0 denies with a redirect; verify its target and final 403.
                    status(response,302);check(response[1].get('Location','').endswith('/errors/403.php'));status(b.request('/errors/403.php'),403)
                else:status(response,403)
            test(name+'_role_guard',role_guard)
            test(name+'_logout_invalid_csrf',lambda:status(b.request('/auth/logout.php','POST',{'csrf_token':'invalid'}),419))
            test(name+'_logout_fixture_only',lambda:status(b.request('/auth/logout.php','POST',{'csrf_token':csrf(b.request('/auth/logout.php')[2])}),302))
            test(name+'_guest_after_logout',lambda:status(b.request('/admin/index.php'),302))
        finally:
            os.killpg(process.pid,signal.SIGTERM);process.wait(timeout=10);log.close()
    try:
        serve('r1',candidate,18101);serve('r0_rollback',rollback,18102)
        test('r1_and_r0_auth_smoke_change_no_clone_data_or_schema',lambda:check(snapshot(inspector)==with_fixture))
        owner=json.loads((state/'private/clone-owner.json').read_text());production={**owner,'APP_ENV':'production','R1_APPROVED_RELEASE':''};cfg=state/'private/production-mode-clone-only.json'
        def migration(config,options):
            # Production-mode guard testing still points ONLY at the socket-only clone.
            check(config['DB_NAME']=='r1_review_20261030' and config['DB_SOCKET']==runtime['DB_SOCKET'])
            save_json(cfg,config);env={k:v for k,v in os.environ.items() if not k.startswith('SIA_')};env['SIA_CONFIG_FILE']=str(cfg)
            return subprocess.run(['php',str(candidate/'ops/migrate_r1.php'),*options],env=env,capture_output=True)
        common=['--expected-database=r1_review_20261030','--production-release='+commit]
        test('production_guard_missing_private_approval_denied',lambda:check(migration(production,['--apply',*common]).returncode==2))
        approved={**production,'R1_APPROVED_RELEASE':commit}
        test('production_guard_wrong_database_denied',lambda:check(migration(approved,['--apply','--expected-database=not_the_clone','--production-release='+commit]).returncode==2))
        test('production_guard_wrong_release_denied',lambda:check(migration(approved,['--apply','--expected-database=r1_review_20261030','--production-release='+'0'*40]).returncode==2))
        test('production_mode_readonly_check_on_clone',lambda:check(migration(approved,['--check',*common]).returncode==0))
        test('production_mode_explicit_apply_on_clone_idempotent',lambda:check(migration(approved,['--apply',*common]).returncode==0))
        # Tamper only a separate disposable code copy, never the frozen candidate.
        tamper=state/'release'/('tamper-'+secrets.token_hex(4));shutil.copytree(candidate,tamper)
        target=tamper/'database/migrations/002_r1_security.php';target.chmod(0o600);target.write_text(target.read_text()+'\n// tampered review probe\n')
        env={k:v for k,v in os.environ.items() if not k.startswith('SIA_')};env['SIA_CONFIG_FILE']=str(cfg)
        test('production_guard_modified_migration_denied',lambda:check(subprocess.run(['php',str(tamper/'ops/migrate_r1.php'),'--apply',*common],env=env,capture_output=True).returncode==2))
        test('guard_tests_do_not_change_clone',lambda:check(snapshot(inspector)==with_fixture))
    finally:
        mysql(client,"DELETE FROM users WHERE username='"+username+"';",database=runtime['DB_NAME'])
    columns=json.loads((state/'reports/active-columns.json').read_text())
    original=json.loads((state/'reports/original-column-projection.json').read_text())
    test('original_clone_rows_unchanged_after_app_rollback',lambda:check(projection(inspector,columns)==original))
    env={k:v for k,v in os.environ.items() if not k.startswith('SIA_')};env['SIA_CONFIG_FILE']=str(state/'private/clone-runtime.json')
    test('frozen_runtime_preflight_least_privilege_passes',lambda:check(subprocess.run(['php',str(candidate/'ops/check_r1_runtime.php'),'--expected-database=r1_review_20261030','--expected-environment=staging'],env=env,capture_output=True).returncode==0))
    env['SIA_CONFIG_FILE']=str(state/'private/clone-owner.json')
    test('migration_owner_rejected_as_application_runtime',lambda:check(subprocess.run(['php',str(candidate/'ops/check_r1_runtime.php'),'--expected-database=r1_review_20261030','--expected-environment=staging'],env=env,capture_output=True).returncode==1))
    baseline=state/'reports'/('fingerprint-smoke-'+secrets.token_hex(4)+'.json')
    def fingerprint(action,path):
        return subprocess.run(['python3',str(candidate/'ops/r1_data_fingerprint.py'),action,'--config',str(inspector),'--baseline',str(path)],capture_output=True).returncode
    test('read_only_fingerprint_capture',lambda:check(fingerprint('capture',baseline)==0))
    test('read_only_fingerprint_verify',lambda:check(fingerprint('verify',baseline)==0))
    wrong=state/'reports'/('fingerprint-wrong-'+secrets.token_hex(4)+'.json');data=json.loads(baseline.read_text());data['database']='not_the_clone';save_json(wrong,data)
    test('fingerprint_wrong_database_baseline_rejected',lambda:check(fingerprint('verify',wrong)==1))
    report={'passed':sum(t['status']=='PASS' for t in results),'failed':sum(t['status']=='FAIL' for t in results),'skipped':0,'tests':results,'candidate_commit':commit,'clone_only':True,'production_mode_test_uses_clone_only':True,'ports':[18101,18102],'servers_stopped':True}
    save_json(state/'reports/release-smoke.json',report);print(f"{report['passed']} PASS, {report['failed']} FAIL, 0 SKIP")
    return bool(report['failed'])

if __name__=='__main__':sys.exit(main())
