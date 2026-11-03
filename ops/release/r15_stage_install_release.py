#!/usr/bin/env python3
"""Root installer for the staging unit ONLY; accepts a pinned source archive."""
import argparse,hashlib,json,os,subprocess,sys,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def main():
    assert os.geteuid()==0;p=argparse.ArgumentParser();p.add_argument('--archive',required=True);p.add_argument('--sha256',required=True);a=p.parse_args()
    archive=Path(a.archive).resolve();assert archive.is_relative_to(Path('/home/muflih/.local/state/sia-r15/20261031/release'))
    assert hashlib.sha256(archive.read_bytes()).hexdigest()==a.sha256
    with tarfile.open(archive) as tar:
        manifest=json.load(tar.extractfile('RELEASE.json'));commit=manifest['commit'];target=Path('/opt/sia-r15-staging/20261031/releases')/commit[:8];assert not target.exists();target.mkdir(mode=0o755)
        tar.extractall(target,filter='data')
    for name,value in manifest['files'].items():
        file=target/name;assert file.is_file() and not file.is_symlink() and file.is_relative_to(target) and hashlib.sha256(file.read_bytes()).hexdigest()==value;os.chown(file,0,0);file.chmod(0o444 if not file.stat().st_mode&0o111 else 0o555)
    rollback=target.parent/'r0-531d2f8'
    if not rollback.exists():
        rollback.mkdir(mode=0o755);raw=subprocess.check_output(['git','-C',str(ROOT),'archive','531d2f8']);import io
        with tarfile.open(fileobj=io.BytesIO(raw)) as tar:tar.extractall(rollback,filter='data')
        for file in rollback.rglob('*'):
            if file.is_file():os.chown(file,0,0);file.chmod(0o444)
    paths=Path('/etc/sia-r15-staging/20261031/release-control.json');paths.write_text(json.dumps({'candidate':str(target),'rollback':str(rollback),'commit':commit},indent=2)+'\n');paths.chmod(0o600)
    state='/home/muflih/.local/state/sia-r15/20261031';unit='sia-r15-stage-20261031.service'
    # Preserve a valid profile as the controlled forward target; no production config is used.
    current=json.loads((Path(state)/'private/runtime.json').read_text());previous=Path('/etc/sia-r15-staging/20261031/runtime-before-rollback.json');previous.write_text(json.dumps(current));previous.chmod(0o600)
    result=subprocess.run(['python3',str(ROOT/'ops/release/r15_service_control.py'),'forward-code','--state',state],capture_output=True)
    if result.returncode:raise RuntimeError('Staging release failed health check')
    print(json.dumps({'installed_staging_only':True,'unit':unit,'port':18115,'commit':commit,'code_root_owned':True,'hashes_verified':True}))

if __name__=='__main__':
    try:main()
    except Exception:sys.stderr.write('Staging-only release install refused/failed; preserve evidence and review.\n');sys.exit(1)
