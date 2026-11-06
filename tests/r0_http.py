#!/usr/bin/env python3
"""Repeatable, credential-redacting integration tests on synthetic R0 fixtures only."""
import argparse
import http.cookiejar
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'ops'))
from r0_environment import private_state, save_json, snapshot


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None


class Browser:
    def __init__(self,base):
        self.base=base
        self.jar=http.cookiejar.CookieJar()
        self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar),NoRedirect())

    def request(self,path,method='GET',data=None,headers=None):
        payload=urllib.parse.urlencode(data).encode() if data is not None else None
        req=urllib.request.Request(self.base+path,data=payload,method=method,headers=headers or {})
        try:res=self.opener.open(req,timeout=5)
        except urllib.error.HTTPError as error:res=error
        with res:return res.status,res.headers,res.read().decode(errors='replace')

    def session(self,name):
        return next((c.value for c in self.jar if c.name==name),None)


def csrf(body):
    match=re.search(r'name="csrf_token" value="([a-f0-9]+)"',body)
    assert match,'Expected CSRF form'
    return match[1]


def main():
    os.umask(0o077)
    parser=argparse.ArgumentParser();parser.add_argument('--state',required=True)
    args=parser.parse_args();state=private_state(args.state)
    settings=json.loads((state/'private/app-config.json').read_text())
    process=json.loads((state/'private/web-process.json').read_text())
    assert settings['APP_ENV']=='testing' and settings['DB_NAME']=='sia_r0_testing'
    assert settings['DB_USER']=='sia_r0_app' and Path(settings['DB_SOCKET']).parent==state/'private'
    login=json.loads((state/'private/fixture-login.json').read_text())
    base='http://127.0.0.1:'+str(process['port'])
    before=snapshot(state/'private/testing-inspector.json')
    assert before==json.loads((state/'reports/testing-database-before.json').read_text()),'Fixture drift: stop tests; never reset automatically'
    tests=[]
    # Prove blocking even when a sensitive file physically exists in the document root.
    canaries=[]
    for name in ['.env','r0-internal.sql','r0-diagnostic.log']:
        target=ROOT/'public'/name
        with target.open('x') as stream:stream.write('R0_ACCESS_CANARY_'+secrets.token_hex(16))
        canaries.append(target)

    def test(name,fn):
        try:
            fn();tests.append({'test':name,'status':'PASS'});print('PASS '+name)
        except Exception as error:
            tests.append({'test':name,'status':'FAIL','error_type':type(error).__name__})
            print('FAIL '+name+' ('+type(error).__name__+')')

    def expect_status(response,expected):assert response[0]==expected

    public=Browser(base)
    test('public_landing',lambda:expect_status(public.request('/'),200))
    test('public_css',lambda:expect_status(public.request('/assets/css/app.css'),200))
    blocked=[
        '/db_sia_smkn2_magelang.sql','/database/db_sia_smkn2_magelang.sql','/.git/config',
        '/.env','/.env.backup','/config/config.php','/config/auth.php','/config/web_routes.php',
        '/includes/header.php','/shared/kalender.php','/README.md','/test.log',
        '/db.php','/adminer.php','/ops/database/db_snapshot.php','/database/migrations/001_legacy_runtime.php',
        '/%2egit/config','/%2e%2e/config/config.php','/assets/../config/config.php',
        '/%252egit/config','/index.php/.git/config','/r0-internal.sql','/r0-diagnostic.log',
    ]
    for path in blocked:
        for method in ['GET','HEAD']:
            test('internal_'+method+'_'+path,lambda p=path,m=method:expect_status(public.request(p,m),404))
    test('unsupported_method',lambda:expect_status(public.request('/auth/login.php','PUT'),405))
    test('protected_guest',lambda:expect_status(public.request('/admin/index.php'),302))
    test('export_guest',lambda:expect_status(public.request('/guru/export_nilai.php'),302))
    empty=Browser(base)
    test('csrf_missing_fresh_session',lambda:expect_status(empty.request('/auth/login.php','POST',{'username':login['username'],'password':login['password']}),419))
    page=public.request('/auth/login.php')
    token=csrf(page[2])
    test('login_get',lambda:expect_status(page,200))
    test('csrf_wrong',lambda:expect_status(public.request('/auth/login.php','POST',{'csrf_token':'invalid','username':login['username'],'password':login['password']}),419))
    test('csrf_array',lambda:expect_status(public.request('/auth/login.php','POST',{'csrf_token[]':'invalid'}),419))

    def bad_auth(username,password):
        res=public.request('/auth/login.php','POST',{'csrf_token':token,'username':username,'password':password})
        assert res[0]==200 and 'Username atau password salah/nonaktif.' in res[2]
        assert public.request('/admin/index.php')[0]==302
    test('wrong_password',lambda:bad_auth(login['username'],'incorrect-test-password'))
    test('unknown_account',lambda:bad_auth('r0_nonexistent',login['password']))
    test('inactive_account',lambda:bad_auth(login['inactive_username'],login['password']))
    old_session=public.session(settings['SESSION_NAME'])
    logged=public.request('/auth/login.php','POST',{'csrf_token':token,'username':login['username'],'password':login['password']})
    test('login_existing_bcrypt',lambda:expect_status(logged,302))
    def session_flags():
        assert public.session(settings['SESSION_NAME']) and public.session(settings['SESSION_NAME'])!=old_session
        cookie=logged[1].get('Set-Cookie','').lower()
        assert 'httponly' in cookie and 'samesite=lax' in cookie
    test('session_regeneration_and_cookie_flags',session_flags)
    test('authenticated_dashboard',lambda:expect_status(public.request('/admin/index.php'),200))
    wrong_role=public.request('/guru/index.php')
    test('wrong_role_denied',lambda:expect_status(wrong_role,302))
    test('forbidden_page',lambda:expect_status(public.request('/errors/403.php'),403))
    replay=Browser(base)
    test('old_session_invalid',lambda:expect_status(replay.request('/admin/index.php',headers={'Cookie':settings['SESSION_NAME']+'='+old_session}),302))
    logout=public.request('/auth/logout.php')
    test('logout_get_confirmation',lambda:expect_status(logout,200))
    test('logout_get_does_not_destroy_session',lambda:expect_status(public.request('/admin/index.php'),200))
    test('logout_post_requires_csrf',lambda:expect_status(public.request('/auth/logout.php','POST',{}),419))
    test('logout_post_success',lambda:expect_status(public.request('/auth/logout.php','POST',{'csrf_token':csrf(logout[2])}),302))
    test('protected_after_logout',lambda:expect_status(public.request('/admin/index.php'),302))
    env=os.environ.copy()
    for key in list(env):
        if key.startswith('SIA_'):del env[key]
    env['SIA_CONFIG_FILE']=str(state/'private/app-config.json')
    runtime=subprocess.run(['php',str(ROOT/'ops/database/check_runtime.php')],env=env,capture_output=True,text=True)
    def runtime_checks():
        assert runtime.returncode==0
        checks=json.loads(runtime.stdout)
        assert checks and all(checks.values())
    test('isolated_connection_privileges_and_fixture_accounts',runtime_checks)
    refused=subprocess.run(['php',str(ROOT/'ops/database/migrate.php'),'--apply','--expected-database=sia_r0_testing'],env=env,capture_output=True)
    test('web_credentials_cannot_invoke_schema_deployment',lambda:expect_status((refused.returncode,),2))
    after=snapshot(state/'private/testing-inspector.json')
    test('schema_and_all_table_data_unchanged_by_auth_tests',lambda:expect_status((before==after,),True))
    save_json(state/'reports/testing-database-after.json',after)
    report={'tests':tests,'passed':sum(t['status']=='PASS' for t in tests),'failed':sum(t['status']=='FAIL' for t in tests),
            'database_integrity_unchanged':before==after,'fixture_only':True,'base_url':base}
    save_json(state/'reports/http-tests.json',report)
    for path in canaries:path.unlink()
    print(str(report['passed'])+' PASS, '+str(report['failed'])+' FAIL')
    return 1 if report['failed'] else 0


if __name__=='__main__':sys.exit(main())
