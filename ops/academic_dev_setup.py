#!/usr/bin/env python3
"""Create-only synthetic DB on the existing socket-only staging server.

Never reads production rows, modifies old DBs, resets data, starts a public
service or changes an existing DB account. Credentials remain outside Git.
"""
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import shutil

sys.path.insert(0, str(Path(__file__).resolve().parent))
from r0_environment import mysql, save_json, cnf

ROOT = Path(__file__).resolve().parents[1]
STATE = Path('/home/muflih/.local/state/sia-academic-dev/20261031')
DATABASE = 'sia_academic_dev_20261031'


def main():
    os.umask(0o077)
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    for name in ['private','reports','backups','sessions','security','logs','uploads']:
        (STATE/name).mkdir(exist_ok=True, mode=0o700)
    client = Path('/home/muflih/.local/state/sia-r0/20261030-r0/private/stage-admin.cnf')
    assert mysql(client, 'SELECT @@skip_networking;').strip() == b'1'
    assert mysql(client, "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='"+DATABASE+"';").strip() == b'0', 'Refusing existing DB; resume manually without resetting'
    admin = json.loads(client.with_name('stage-admin.json').read_text())
    names = ['ak_dev_runtime_1031','ak_dev_owner_1031']
    for name in names:
        assert mysql(client,"SELECT COUNT(*) FROM mysql.user WHERE User='"+name+"';").strip()==b'0'
    # Schema only from existing synthetic R1 fixture, no students or shared test rows.
    tables = mysql(client, "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='r1_testing_20261030' AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME NOT LIKE 'r15_%' ORDER BY TABLE_NAME;").decode().split()
    schema = STATE/'private/schema.sql'
    result = subprocess.run(['mariadb-dump','--defaults-extra-file='+str(client),'--no-data','--skip-triggers','--skip-add-drop-table','--skip-comments','r1_testing_20261030',*tables],capture_output=True)
    assert result.returncode == 0, 'Schema export failed (private details redacted)'
    schema.write_bytes(result.stdout)
    mysql(client,'CREATE DATABASE `'+DATABASE+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
    mysql(client,database=DATABASE,source=schema)
    passwords = {name:secrets.token_hex(32) for name in names}
    for name in names:
        mysql(client,"CREATE USER '"+name+"'@'localhost' IDENTIFIED BY '"+passwords[name]+"';")
    mysql(client,"GRANT SELECT,INSERT,UPDATE,CREATE,ALTER,INDEX,REFERENCES ON `"+DATABASE+"`.* TO '"+names[1]+"'@'localhost';")
    common={'APP_ENV':'testing','DB_NAME':DATABASE,'DB_SOCKET':admin['DB_SOCKET'],'ACADEMIC_WORKFLOWS':'1','COOKIE_SECURE':'0'}
    owner={**common,'DB_USER':names[1],'DB_PASS':passwords[names[1]],'ALLOW_SCHEMA_CHANGES':'1','ALLOW_FIXTURE':'1'}
    runtime={**common,'DB_USER':names[0],'DB_PASS':passwords[names[0]],'ALLOW_SCHEMA_CHANGES':'0','SESSION_NAME':'SIA_ACADEMIC_DEV','SESSION_PATH':str(STATE/'sessions'),'SECURITY_STATE_PATH':str(STATE/'security'),'SECURITY_LOG':str(STATE/'logs/security.jsonl')}
    tool_state=Path('/home/muflih/.local/state/sia-r1/20261030-r1')
    if (tool_state/'tools/node_modules/playwright').exists():
        runtime.update({'PDF_PLAYWRIGHT_PATH':str(tool_state/'tools/node_modules/playwright'),'PDF_BROWSERS_PATH':str(tool_state/'browsers'),'PDF_LIBRARY_PATH':str(tool_state/'browser-libs/usr/lib64'),'PDF_NODE_BINARY':str(Path(shutil.which('node')).resolve())})
    save_json(STATE/'private/owner.json',owner)
    save_json(STATE/'private/runtime.json',runtime)
    save_json(STATE/'private/inspector.json',{**admin,'DB_NAME':DATABASE})
    fixture={'admin':'uji_admin','teacher':'uji_guru','other_teacher':'uji_guru_lain','duty':'uji_piket','student':'uji_siswa','head':'uji_kepsek','wali':'uji_wali','password':secrets.token_urlsafe(24)}
    save_json(STATE/'private/test-accounts.json',fixture)
    env={**os.environ,'SIA_CONFIG_FILE':str(STATE/'private/owner.json')}
    for args in [['ops/migrate_r1.php','--apply','--expected-database='+DATABASE],['ops/migrate_academic.php','--apply','--expected-database='+DATABASE],['ops/academic_fixture.php',str(STATE/'private/test-accounts.json')],['ops/academic_completion_fixture.php',str(STATE/'private/test-accounts.json')]]:
        r=subprocess.run(['php',*args],cwd=ROOT,env=env,capture_output=True)
        assert r.returncode==0,'Migration/fixture failed; preserve DB and inspect locally (no automatic reset)'
    tables=mysql(client,"SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='"+DATABASE+"' AND TABLE_TYPE='BASE TABLE';").decode().split()
    allowed_legacy={'jurusan','kelas','guru','siswa','mata_pelajaran','jadwal','users','tahun_ajaran','nilai','absensi','jurnal_kelas','bobot_penilaian','ekstrakurikuler','nilai_ekskul','kalender_akademik','catatan_evaluasi'}
    for table in tables:
        privileges='SELECT,INSERT' if table in {'ak_riwayat','ak_aturan_nilai','ak_rapor_snapshot','ak_review_rapor'} else 'INSERT' if table=='audit_aktivitas' else 'SELECT,INSERT,UPDATE' if table in allowed_legacy or table.startswith('ak_') else None
        if privileges:
            mysql(client,'GRANT '+privileges+' ON `'+DATABASE+'`.`'+table+"` TO '"+names[0]+"'@'localhost';")
    mysql(client,'GRANT DELETE ON `'+DATABASE+"`.catatan_evaluasi TO '"+names[0]+"'@'localhost';")
    backup=STATE/'backups/synthetic-initial.sql'
    r=subprocess.run(['mariadb-dump','--defaults-extra-file='+str(client),'--single-transaction','--skip-lock-tables','--skip-add-drop-table','--skip-add-locks','--skip-disable-keys','--skip-comments',DATABASE],capture_output=True)
    assert r.returncode==0,'Synthetic backup failed'
    backup.write_bytes(r.stdout)
    save_json(STATE/'reports/setup.json',{'database':DATABASE,'synthetic_only':True,'runtime_nonroot':True,'runtime_has_ddl':False,'backup_sha256':hashlib.sha256(r.stdout).hexdigest(),'source_schema':'R1 synthetic, schema only','active_service_changed':False})
    schema.unlink()
    print('PASS: new synthetic DB, distinct owner/runtime, private fixture accounts and backup created.')


if __name__=='__main__':
    try: main()
    except Exception as error:
        print('FAIL: '+str(error) if isinstance(error,AssertionError) else 'FAIL: private setup detail redacted; no reset attempted.',file=sys.stderr)
        sys.exit(1)
