#!/usr/bin/env python3
"""Prepare production grant/config/unit files only. Never installs or executes them."""
import argparse,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def main():
    os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('--active-config',required=True);p.add_argument('--output',required=True);p.add_argument('--commit',required=True);a=p.parse_args()
    commit=subprocess.check_output(['git','-C',str(ROOT),'rev-parse',a.commit+'^{commit}']).decode().strip();suffix=commit[:8];output=Path(a.output).resolve()
    subprocess.run(['python3',str(ROOT/'ops/release/r1_prepare_grants.py'),'--active-config',a.active_config,'--output',str(output),'--release-commit',commit],check=True,capture_output=True)
    base='/var/lib/sia-r1-'+suffix;directory='/etc/sia-r1-'+suffix;release='/opt/sia/releases/r1-'+suffix
    for name in ['runtime.json','rollback-runtime.json']:
        path=output/name;data=json.loads(path.read_text());data['SESSION_PATH']=base+('/sessions-rollback' if name.startswith('rollback') else '/sessions');data['SECURITY_STATE_PATH']=base+'/security';data['SECURITY_LOG']=base+'/logs/security.jsonl';path.write_text(json.dumps(data,indent=2)+'\n');path.chmod(0o600)
    header=f'''[Service]
DynamicUser=yes
User=sia-academic
Group=
StateDirectory=sia-r1-{suffix}
StateDirectoryMode=0700
ProtectHome=true
ProtectSystem=strict
ProtectProc=invisible
PrivateTmp=true
NoNewPrivileges=true
CapabilityBoundingSet=
RestrictSUIDSGID=true
UMask=0077
KillMode=control-group
Environment=
EnvironmentFile=
UnsetEnvironment=SIA_DB_HOST SIA_DB_PORT SIA_DB_NAME SIA_DB_USER SIA_DB_PASS SIA_DB_SOCKET SIA_ALLOW_SCHEMA_CHANGES SIA_R1_APPROVED_RELEASE
LoadCredential=
'''
    database=json.loads((output/'runtime.json').read_text())['DB_NAME']
    for name,application,config in [('activation',release,'runtime.json'),('rollback','/opt/sia/releases/r0-531d2f8','rollback-runtime.json')]:
        text=header+f'''LoadCredential=app-config:{directory}/{config}
Environment=SIA_CONFIG_FILE=%d/app-config
WorkingDirectory={application}
ExecStartPre=
ExecStartPre=/usr/bin/install -d -m 0700 {base}/sessions {base}/sessions-rollback {base}/security {base}/logs {base}/uploads
ExecStartPre=/usr/sbin/php {release}/ops/release/check_r1_runtime.php --expected-database={database} --expected-environment=production
ExecStart=
ExecStart=/usr/sbin/php -d display_errors=0 -d log_errors=1 -d error_log={base}/logs/php-errors.log -d upload_tmp_dir={base}/uploads -S 127.0.0.1:8085 -t {application}/public {application}/public/index.php
'''
        (output/(name+'-service-override.conf')).write_text('# PREPARED ONLY. Separate production authorization required.\n'+text)
    summary=json.loads((output/'plan-summary.json').read_text());summary.update(dynamic_user=True,load_credential=True,root_source_config_0600=True,secret_source_directory=directory,installed=False,namespace_model_tested_on_staging=True)
    (output/'plan-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print('Production plan prepared privately only; no service or grant changes.')

if __name__=='__main__':main()
