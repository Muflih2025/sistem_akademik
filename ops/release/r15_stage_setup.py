#!/usr/bin/env python3
"""Install a NEW staging-only unit and new DB principals; never touches 8085.

Requires operator root for the staging namespace/credentials test. The database
admin connection must be the existing socket-only synthetic staging instance.
"""
import json,os,secrets,subprocess,sys,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'ops'))
from r0_environment import cnf,mysql,save_json

def main():
    assert os.geteuid()==0
    state=Path('/home/muflih/.local/state/sia-r15/20261031');etc=Path('/etc/sia-r15-staging/20261031');code=Path('/opt/sia-r15-staging/20261031');unit='sia-r15-stage-20261031.service'
    assert not etc.exists() and not code.exists() and not Path('/etc/systemd/system/'+unit).exists(),'Refusing existing staging installation'
    client=state/'private/stage-admin.cnf';assert mysql(client,'SELECT @@skip_networking;').strip()==b'1'
    database='r1_testing_20261030';users=['r15_app_1031_a','r15_app_1031_b','r15_deploy_1031']
    for user in users:assert mysql(client,"SELECT COUNT(*) FROM mysql.user WHERE User='"+user+"';").strip()==b'0'
    assert mysql(client,"SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='"+database+"' AND TABLE_NAME='r15_privilege_canary';").strip()==b'0'
    business=['jurusan','kelas','guru','siswa','mata_pelajaran','jadwal','users','tahun_ajaran','nilai','absensi','jurnal_kelas','bobot_penilaian','ekstrakurikuler','nilai_ekskul','kalender_akademik','catatan_evaluasi']
    passwords={user:secrets.token_hex(32) for user in users}
    for user in users:
        mysql(client,"CREATE USER '"+user+"'@'localhost' IDENTIFIED BY '"+passwords[user]+"';")
        if 'deploy' in user:mysql(client,"GRANT SELECT,INSERT,CREATE,ALTER,INDEX,REFERENCES ON `"+database+"`.* TO '"+user+"'@'localhost';")
        else:
            for table in business:mysql(client,"GRANT SELECT,INSERT,UPDATE ON `"+database+"`.`"+table+"` TO '"+user+"'@'localhost';")
            mysql(client,"GRANT INSERT ON `"+database+"`.audit_aktivitas TO '"+user+"'@'localhost';GRANT DELETE ON `"+database+"`.catatan_evaluasi TO '"+user+"'@'localhost';")
    mysql(client,'CREATE TABLE r15_privilege_canary(id INT PRIMARY KEY) ENGINE=InnoDB;',database=database)
    etc.mkdir(mode=0o700,parents=True);etc.chmod(0o700);code.mkdir(mode=0o755,parents=True)
    release=code/'releases/work';release.mkdir(parents=True)
    tracked=subprocess.check_output(['git','-C',str(ROOT),'ls-files','--cached','--others','--exclude-standard','-z']).decode().strip('\0').split('\0')
    for name in tracked:
        source=ROOT/name
        if not source.is_file():continue
        target=release/name;target.parent.mkdir(mode=0o755,parents=True,exist_ok=True);shutil.copyfile(source,target);target.chmod(0o444)
    base='/var/lib/sia-r15-stage-20261031';original_socket='/home/muflih/.local/state/sia-r0/20261030-r0/private/mariadb.sock'
    runtime={'APP_ENV':'testing','DB_NAME':database,'DB_USER':users[0],'DB_PASS':passwords[users[0]],'DB_SOCKET':original_socket,'ALLOW_SCHEMA_CHANGES':'0','R1_APPROVED_RELEASE':'','SESSION_NAME':'SIA_R15_TEST','SESSION_PATH':base+'/sessions','SECURITY_STATE_PATH':base+'/security','SECURITY_LOG':base+'/logs/security.jsonl','COOKIE_SECURE':'0'}
    save_json(state/'private/runtime.json',runtime);os.chown(state/'private/runtime.json',1000,1000)
    mapped={**runtime,'DB_SOCKET':'/run/sia-r15-stage-20261031/mysql.sock'};save_json(etc/'runtime.json',mapped)
    save_json(etc/'runtime-next.json',{**mapped,'DB_USER':users[1],'DB_PASS':passwords[users[1]]})
    owner={'APP_ENV':'testing','DB_NAME':database,'DB_USER':users[2],'DB_PASS':passwords[users[2]],'DB_SOCKET':original_socket,'ALLOW_SCHEMA_CHANGES':'1'};save_json(etc/'migration-owner.json',owner)
    (code/'writable-canary').mkdir(mode=0o777);(code/'writable-canary').chmod(0o777)
    home=Path('/home/.sia-r15-namespace-canary-20261031');assert not home.exists();home.write_text('SYNTHETIC PUBLIC NAMESPACE CANARY\n');home.chmod(0o444)
    control={'unit':unit,'port':18115,'runtime_base':base,'php_error_log':base+'/logs/php-errors.log','source_config':str(etc/'runtime.json'),'release':str(release)};save_json(state/'private/service-control.json',control);os.chown(state/'private/service-control.json',1000,1000)
    text=f'''[Unit]
Description=SIA R1.5 isolated staging (never production)
After=network.target
StartLimitBurst=50
StartLimitIntervalSec=10
[Service]
DynamicUser=yes
User=sia-r15-stage
StateDirectory=sia-r15-stage-20261031
StateDirectoryMode=0700
RuntimeDirectory=sia-r15-stage-20261031
RuntimeDirectoryMode=0700
LoadCredential=app-config:{etc}/runtime.json
Environment=SIA_CONFIG_FILE=%d/app-config
UnsetEnvironment=SIA_DB_HOST SIA_DB_PORT SIA_DB_NAME SIA_DB_USER SIA_DB_PASS SIA_DB_SOCKET SIA_ALLOW_SCHEMA_CHANGES SIA_R1_APPROVED_RELEASE
WorkingDirectory={release}
BindReadOnlyPaths={original_socket}:/run/sia-r15-stage-20261031/mysql.sock
ProtectHome=true
ProtectSystem=strict
ProtectProc=invisible
PrivateTmp=true
NoNewPrivileges=true
CapabilityBoundingSet=
RestrictSUIDSGID=true
UMask=0077
KillMode=control-group
ExecStartPre=/usr/sbin/php {release}/ops/release/r15_service_probe.php
ExecStartPre=/usr/sbin/php {release}/ops/release/check_r1_runtime.php --expected-database=r1_testing_20261030 --expected-environment=testing
ExecStart=/usr/sbin/php -d display_errors=0 -d log_errors=1 -d error_log={base}/logs/php-errors.log -d upload_tmp_dir={base}/uploads -S 127.0.0.1:18115 -t {release}/public {release}/public/index.php
'''
    Path('/etc/systemd/system/'+unit).write_text(text)
    subprocess.run(['systemd-analyze','verify','/etc/systemd/system/'+unit],check=True,capture_output=True)
    subprocess.run(['systemctl','daemon-reload'],check=True,capture_output=True)
    r=subprocess.run(['systemctl','start',unit],capture_output=True)
    report={'installed_staging_only':True,'unit':unit,'port':18115,'started':r.returncode==0,'production_service_touched':False,'new_staging_accounts':3,'source_config_root_only':True,'migration_owner_root_only':True}
    save_json(state/'reports/stage-install.json',report);os.chown(state/'reports/stage-install.json',1000,1000)
    print(json.dumps(report));return r.returncode

if __name__=='__main__':
    try:sys.exit(main())
    except Exception:sys.stderr.write('Staging setup refused/failed; private context redacted, never retry by resetting data.\n');sys.exit(1)
