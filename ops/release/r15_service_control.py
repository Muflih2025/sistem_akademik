#!/usr/bin/env python3
"""Root-only controller for ONE isolated staging unit; refuses production targets."""
import argparse,json,os,pwd,re,subprocess,sys,time,urllib.request
from pathlib import Path

def main():
    p=argparse.ArgumentParser();p.add_argument('action',choices=['sync','restart','rotate','restore-a','rollback-code','forward-code','read-log','read-probe','mkdir-security','create-canaries','remove-canaries']);p.add_argument('--state',required=True);p.add_argument('--name');a=p.parse_args()
    assert os.geteuid()==0,'Operator root is required for staging control'
    state=Path(a.state).resolve();assert str(state)=='/home/muflih/.local/state/sia-r15/20261031'
    c=json.loads((state/'private/service-control.json').read_text());unit=c['unit'];assert unit=='sia-r15-stage-20261031.service'
    execute=subprocess.check_output(['systemctl','show',unit,'--property=ExecStart','--value']).decode();assert '127.0.0.1:18115' in execute and ':8085' not in execute
    target=Path('/etc/sia-r15-staging/20261031/runtime.json');base=Path('/var/lib/sia-r15-stage-20261031')
    if a.action=='read-log':
        path=base/'logs/php-errors.log';sys.stdout.buffer.write(path.read_bytes() if path.exists() else b'');return
    if a.action=='read-probe':sys.stdout.write((base/'startup-probe.json').read_text());return
    if a.action in ['create-canaries','remove-canaries']:
        assert a.name and re.fullmatch('[a-f0-9]{6}',a.name)
        root=Path(subprocess.check_output(['systemctl','show',unit,'--property=WorkingDirectory','--value']).decode().strip()).resolve()
        assert root.is_relative_to(Path('/opt/sia-r15-staging/20261031/releases'))
        for name in ['.r1-'+a.name+'.env','r1-'+a.name+'.sql','r1-'+a.name+'.log']:
            path=root/'public'/name
            if a.action=='create-canaries':
                with path.open('x') as stream:stream.write('PRIVATE_FIXTURE_ACCESS_CANARY')
                path.chmod(0o444)
            elif path.exists():
                assert path.read_text()=='PRIVATE_FIXTURE_ACCESS_CANARY';path.unlink()
        return
    if a.action=='mkdir-security':
        assert a.name and re.fullmatch('[a-f0-9]{6}',a.name)
        uid=base.stat().st_uid;gid=base.stat().st_gid;path=base/'security'/a.name;path.mkdir(mode=0o700);os.chown(path,uid,gid);return
    if a.action in ['rollback-code','forward-code']:
        paths=json.loads(Path('/etc/sia-r15-staging/20261031/release-control.json').read_text())
        security=Path(paths['candidate']).resolve();application=Path(paths['rollback'] if a.action=='rollback-code' else paths['candidate']).resolve()
        for path in [security,application]:assert path.is_relative_to(Path('/opt/sia-r15-staging/20261031/releases')) and path.stat().st_uid==0
        host=state/'private/runtime.json'
        if a.action=='rollback-code':
            data=json.loads(host.read_text());backup=Path('/etc/sia-r15-staging/20261031/runtime-before-rollback.json');backup.write_text(json.dumps(data));backup.chmod(0o600)
            data['SESSION_NAME']+='_R0';data['SESSION_PATH']=str(base/'sessions-rollback')
        else:
            data=json.loads(Path('/etc/sia-r15-staging/20261031/runtime-before-rollback.json').read_text());data['SESSION_NAME']='SIA_R15_TEST_FORWARD'
        host.write_text(json.dumps(data,indent=2)+'\n');os.chown(host,1000,1000);host.chmod(0o600)
        directory=Path('/etc/systemd/system/'+unit+'.d');directory.mkdir(exist_ok=True)
        (directory/'20-app.conf').write_text(f'''[Service]
WorkingDirectory={application}
ExecStartPre=
ExecStartPre=/usr/sbin/php {security}/ops/release/r15_service_probe.php
ExecStartPre=/usr/sbin/php {security}/ops/release/check_r1_runtime.php --expected-database=r1_testing_20261030 --expected-environment=testing
ExecStart=
ExecStart=/usr/sbin/php -d display_errors=0 -d log_errors=1 -d error_log={base}/logs/php-errors.log -d upload_tmp_dir={base}/uploads -S 127.0.0.1:18115 -t {application}/public {application}/public/index.php
''')
        subprocess.run(['systemctl','daemon-reload'],check=True,capture_output=True)
    if a.action in ['rotate','restore-a']:
        slot='runtime-next.json' if a.action=='rotate' else 'runtime-slot-a.json'
        data=json.loads((Path('/etc/sia-r15-staging/20261031')/slot).read_text())
        data['DB_SOCKET']='/home/muflih/.local/state/sia-r0/20261030-r0/private/mariadb.sock'
        host=state/'private/runtime.json';assert not host.is_symlink();host.write_text(json.dumps(data,indent=2)+'\n');os.chown(host,1000,1000);host.chmod(0o600)
    if a.action in ['sync','rotate','restore-a','rollback-code','forward-code']:
        data=json.loads((state/'private/runtime.json').read_text())
        assert data['APP_ENV']=='testing' and data['DB_NAME']=='r1_testing_20261030' and re.fullmatch('r15_app_[a-z0-9_]+',data['DB_USER'])
        assert data.get('ALLOW_SCHEMA_CHANGES','0')=='0' and not data.get('R1_APPROVED_RELEASE') and not data.get('DB_HOST')
        assert data['DB_SOCKET']=='/home/muflih/.local/state/sia-r0/20261030-r0/private/mariadb.sock'
        assert str(data['SESSION_PATH']).startswith(str(base)+'/') and str(data['SECURITY_STATE_PATH']).startswith(str(base)+'/')
        data['DB_SOCKET']='/run/sia-r15-stage-20261031/mysql.sock'
        assert target.parent.stat().st_uid==0 and not target.is_symlink()
        temporary=target.with_suffix('.new.json');fd=os.open(temporary,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'w') as stream:json.dump(data,stream);stream.write('\n')
        os.replace(temporary,target)
    r=subprocess.run(['systemctl','restart',unit],capture_output=True)
    if r.returncode:sys.stderr.write('Staging restart rejected; private logs retained.\n');return 1
    assert subprocess.check_output(['systemctl','is-active',unit]).strip()==b'active'
    for _ in range(50):
        try:
            request=urllib.request.Request('http://127.0.0.1:18115/auth/login.php',method='HEAD')
            with urllib.request.urlopen(request,timeout=1) as response:
                if response.status==200:break
        except Exception:time.sleep(.1)
    else:raise RuntimeError('Staging is active but HTTP is not healthy')
    print('PASS: isolated staging configuration/restart.')

if __name__=='__main__':
    try:sys.exit(main())
    except Exception:sys.stderr.write('Staging-only controller refused/failed; sensitive context redacted.\n');sys.exit(1)
