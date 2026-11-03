#!/usr/bin/env python3
"""One localhost development runtime with the R1.5 filesystem protections.

No release copying, no production deployment, no DB mutations, no generic unit
or port arguments. The editable worktree is mounted read-only inside this unit.
"""
import argparse,hashlib,json,os,re,shutil,subprocess,sys,time,urllib.request
from pathlib import Path

ROOT=Path('/home/muflih/sia-academic-dev')
STATE=Path('/home/muflih/.local/state/sia-academic-dev/20261031')
BASE=Path('/var/lib/sia-academic-dev-20261031')
RUN=Path('/run/sia-academic-dev-20261031')
ETC=Path('/etc/sia-academic-dev/20261031')
UNIT='sia-academic-dev-20261031.service'
UNITFILE=Path('/etc/systemd/system')/UNIT
PDF_LIBRARIES=['libglib-2.0.so.0','libgobject-2.0.so.0','libnspr4.so','libnss3.so','libnssutil3.so','libgio-2.0.so.0','libatk-1.0.so.0','libatk-bridge-2.0.so.0','libdbus-1.so.3','libX11.so.6','libXcomposite.so.1','libXdamage.so.1','libXext.so.6','libXfixes.so.3','libXrandr.so.2','libgbm.so.1','libexpat.so.1','libudev.so.1','libasound.so.2','libatspi.so.0','libplc4.so','libplds4.so','libgmodule-2.0.so.0','libmount.so.1','libsystemd.so.0','libXrender.so.1','libdrm.so.2','libXi.so.6','libblkid.so.1','libsmime3.so','libssl3.so']

def command(args):return subprocess.run(args,check=True,capture_output=True).stdout
def refresh():
    source=STATE/'private/runtime.json';assert not source.is_symlink()
    data=json.loads(source.read_text())
    assert data['APP_ENV']=='testing' and data['DB_NAME']=='sia_academic_dev_20261031' and data['DB_USER']=='ak_dev_runtime_1031'
    assert data['DB_SOCKET']=='/home/muflih/.local/state/sia-r0/20261030-r0/private/mariadb.sock' and not data.get('DB_HOST')
    assert data.get('ALLOW_SCHEMA_CHANGES')=='0' and data.get('ACADEMIC_WORKFLOWS')=='1'
    suffix=Path(data['SECURITY_STATE_PATH']).relative_to(STATE/'security')
    assert str(suffix)=='.' or re.fullmatch('[a-f0-9]{6}',str(suffix))
    data.update({'DB_SOCKET':str(RUN/'mysql.sock'),'SESSION_PATH':str(BASE/'sessions'),'SECURITY_STATE_PATH':str(BASE/'security'/suffix),'SECURITY_LOG':str(BASE/'logs/security.jsonl'),'PDF_PLAYWRIGHT_PATH':str(RUN/'node_modules/playwright'),'PDF_BROWSERS_PATH':str(RUN/'browsers'),'PDF_LIBRARY_PATH':str(RUN/'libs'),'PDF_NODE_BINARY':str(RUN/'node')})
    if BASE.exists():
        uid=BASE.stat().st_uid;gid=BASE.stat().st_gid
        for name in ['sessions','security','logs','uploads','cache',str(Path('security')/suffix)]:
            path=BASE/name;path.mkdir(exist_ok=True,mode=0o700);os.chown(path,uid,gid)
    target=ETC/'runtime.json';assert not target.is_symlink()
    temporary=ETC/'runtime.new.json';assert not temporary.exists()
    fd=os.open(temporary,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    with os.fdopen(fd,'w')as stream:json.dump(data,stream)
    os.replace(temporary,target)

def main():
    p=argparse.ArgumentParser();p.add_argument('action',choices=['install','start','stop','restart','refresh','status','read-log']);a=p.parse_args()
    assert os.geteuid()==0 and Path(__file__).resolve().parents[1]==ROOT
    if a.action=='install':
        assert not UNITFILE.exists() and not ETC.exists(),'Refusing to overwrite an existing runtime'
        ETC.mkdir(parents=True,mode=0o700);ETC.chmod(0o700);refresh()
        tools=Path('/home/muflih/.local/state/sia-r1/20261030-r1')
        node=Path(json.loads((STATE/'private/runtime.json').read_text())['PDF_NODE_BINARY']).resolve()
        assert node.is_file() and node.is_relative_to(Path('/home/muflih/.local/share/fnm/node-versions'))
        # Extracted public system libraries in the original test cache are 0600.
        # Copy only Chromium's resolved shared dependencies into a root-owned,
        # readable runtime directory; do not relax any private cache permissions.
        libs=Path('/opt/sia-academic-dev/20261031/pdf-libs');libs.mkdir(parents=True,mode=0o755,exist_ok=True)
        for name in PDF_LIBRARIES:
            source=tools/'browser-libs/usr/lib64'/name;target=libs/name
            if target.exists():assert hashlib.sha256(target.read_bytes()).digest()==hashlib.sha256(source.read_bytes()).digest()
            else:shutil.copyfile(source,target)
            target.chmod(0o444)
        for path in [ROOT/'public/index.php',tools/'tools/node_modules/playwright',tools/'browsers',tools/'browser-libs/usr/lib64']:assert path.exists()
        text=f'''[Unit]
Description=SIA academic local development only, port 18125
After=network.target
[Service]
DynamicUser=yes
User=sia-academic-dev
StateDirectory=sia-academic-dev-20261031
StateDirectoryMode=0700
RuntimeDirectory=sia-academic-dev-20261031
RuntimeDirectoryMode=0700
LoadCredential=app-config:{ETC}/runtime.json
Environment=SIA_CONFIG_FILE=%d/app-config
Environment=HOME={BASE}
Environment=XDG_CACHE_HOME={BASE}/cache
UnsetEnvironment=SIA_DB_HOST SIA_DB_PORT SIA_DB_NAME SIA_DB_USER SIA_DB_PASS SIA_DB_SOCKET SIA_ALLOW_SCHEMA_CHANGES
WorkingDirectory={RUN}/code
BindReadOnlyPaths={ROOT}:{RUN}/code
BindReadOnlyPaths=/home/muflih/.local/state/sia-r0/20261030-r0/private/mariadb.sock:{RUN}/mysql.sock
BindReadOnlyPaths={tools}/tools/node_modules:{RUN}/node_modules
BindReadOnlyPaths={tools}/browsers:{RUN}/browsers
BindReadOnlyPaths={libs}:{RUN}/libs
BindReadOnlyPaths={node}:{RUN}/node
ProtectHome=true
ProtectSystem=strict
ProtectProc=invisible
PrivateTmp=true
PrivateDevices=true
NoNewPrivileges=true
CapabilityBoundingSet=
RestrictSUIDSGID=true
UMask=0077
ExecStartPre=/usr/sbin/php {RUN}/code/ops/academic_runtime_probe.php
ExecStart=/usr/sbin/php -d display_errors=0 -d log_errors=1 -d error_log={BASE}/logs/php-errors.log -d upload_tmp_dir={BASE}/uploads -d upload_max_filesize=5M -d post_max_size=6M -d max_input_vars=2000 -S 127.0.0.1:18125 -t {RUN}/code/public {RUN}/code/public/index.php
'''
        UNITFILE.write_text(text);UNITFILE.chmod(0o644);command(['systemd-analyze','verify',str(UNITFILE)]);command(['systemctl','daemon-reload'])
        marker=STATE/'private/service-control.json';marker.write_text(json.dumps({'unit':UNIT,'port':18125,'secure_runtime':True,'base':str(BASE)}));marker.chmod(0o600);os.chown(marker,1000,1000)
    else:
        assert UNITFILE.exists() and '127.0.0.1:18125' in UNITFILE.read_text() and ':8085' not in UNITFILE.read_text()
    if a.action=='read-log':
        file=BASE/'logs/php-errors.log';sys.stdout.buffer.write(file.read_bytes() if file.exists() else b'');return
    if a.action in ['install','refresh','restart','start']:
        refresh();command(['systemctl','restart' if a.action in ['restart','refresh'] else 'start',UNIT])
        # StateDirectory ownership is assigned during startup. Prepare per-run counter dirs.
        refresh()
        for _ in range(50):
            try:
                with urllib.request.urlopen('http://127.0.0.1:18125/auth/login.php',timeout=1)as r:assert r.status==200
                break
            except Exception:time.sleep(.1)
        else:raise RuntimeError('Local runtime not healthy; private diagnostics retained')
    if a.action=='stop':command(['systemctl','stop',UNIT])
    active=command(['systemctl','show',UNIT,'--property=ActiveState','--value']).decode().strip()
    print(json.dumps({'active':active=='active','url':'http://127.0.0.1:18125','dynamic_user':True,'read_only_code':True,'active_8085_touched':False}))

if __name__=='__main__':
    try:main()
    except Exception:sys.stderr.write('Local development runtime refused/failed; private configuration omitted. No other service modified.\n');sys.exit(1)
