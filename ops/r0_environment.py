#!/usr/bin/env python3
"""R0 local-only operations. Secrets/backups stay outside all web roots and Git.

No production writes: backup uses a consistent unlocked snapshot; restoration and
account creation are confined to a new, private, socket-only MariaDB process.
"""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import secrets
import signal
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def save_json(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n')
    path.chmod(0o600)


def private_state(path):
    path = Path(path).resolve()
    if path == ROOT or ROOT in path.parents:
        raise RuntimeError('State must be outside application tree')
    if path.stat().st_uid != os.getuid() or path.stat().st_mode & 0o077:
        raise RuntimeError('State must be owned by current user with mode 0700')
    return path


def cnf(path, settings):
    def quote(value):
        return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n') + '"'
    fields = {'user': settings['DB_USER'], 'password': settings['DB_PASS']}
    if settings.get('DB_SOCKET'):
        fields.update({'protocol': 'SOCKET', 'socket': settings['DB_SOCKET']})
    else:
        fields.update({'protocol': 'TCP', 'host': settings['DB_HOST'], 'port': settings['DB_PORT']})
    path.write_text('[client]\n' + ''.join(f'{key}={quote(value)}\n' for key, value in fields.items()))
    path.chmod(0o600)


def command(args, **kwargs):
    # All stdout is captured unless explicitly redirected to a private file.
    result = subprocess.run(args, stderr=subprocess.PIPE, **kwargs)
    if result.returncode:
        raise RuntimeError(f'Operation failed ({Path(str(args[0])).name}); inspect private configuration')
    return result


def snapshot(config):
    result = command(['php', str(ROOT/'ops/db_snapshot.php'), str(config)], stdout=subprocess.PIPE)
    return json.loads(result.stdout)


def mysql(client, sql=None, database=None, source=None):
    args = ['mariadb', '--defaults-extra-file='+str(client), '--batch', '--skip-column-names']
    if database:
        args.append(database)
    if source:
        with source.open('rb') as data:
            return command(args, stdin=data, stdout=subprocess.PIPE).stdout
    return command(args, input=sql.encode(), stdout=subprocess.PIPE).stdout


def backup(args):
    state = private_state(args.state)
    source = Path(args.config).resolve()
    if source == ROOT or ROOT in source.parents or source.stat().st_mode & 0o077:
        raise RuntimeError('Credentials must be private and outside the application')
    settings = json.loads(source.read_text())
    output = state/'backups/database.sql.gz'
    if output.exists():
        raise RuntimeError('Never overwrite an existing backup')
    client = state/'private/active-client.cnf'
    cnf(client, settings)
    before = snapshot(source)
    base = ['mariadb-dump', '--defaults-extra-file='+str(client), '--single-transaction',
            '--quick', '--skip-lock-tables', '--routines', '--triggers', '--events',
            '--hex-blob', '--skip-add-drop-table', '--skip-add-locks', '--skip-disable-keys', '--skip-comments']
    schema = state/'backups/schema-only.sql'
    try:
        with schema.open('wb') as stream:
            command(base+['--no-data', settings['DB_NAME']], stdout=stream)
        # Direct to disk; no database rows enter the console or process arguments.
        raw = state/'backups/database.sql'
        with raw.open('wb') as stream:
            command(base+[settings['DB_NAME']], stdout=stream)
        with raw.open('rb') as src, gzip.open(output, 'wb') as dst:
            import shutil
            shutil.copyfileobj(src, dst)
        raw.unlink()
        after = snapshot(source)
        if before != after:
            raise RuntimeError('Active database changed concurrently; do not certify this backup against the snapshot')
        save_json(state/'reports/active-database-before.json', before)
        save_json(state/'reports/active-database-after-backup.json', after)
        report = {'status': 'PASS', 'method':'single-transaction / no locks / routines+triggers+events',
                  'database_unchanged_during_backup':True,
                  'backup_sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
                  'compressed_bytes':output.stat().st_size}
        save_json(state/'reports/backup.json', report)
        print('PASS: private database backup created; active schema/data fingerprints unchanged.')
    except BaseException:
        # Incomplete files remain private for operator inspection; never present them as verified.
        save_json(state/'reports/backup.json', {'status':'FAIL','verified':False})
        raise


def stage(args):
    state = private_state(args.state)
    data = state/'database'
    if (data/'mysql').exists():
        raise RuntimeError('Refusing to initialize or reset an existing database directory')
    if json.loads((state/'reports/backup.json').read_text())['status'] != 'PASS':
        raise RuntimeError('A verified private backup is required')
    command(['mariadb-install-db', '--datadir='+str(data), '--auth-root-authentication-method=normal', '--skip-test-db'], stdout=subprocess.PIPE)
    sock = state/'private/mariadb.sock'
    log = (state/'logs/mariadb.log').open('ab')
    process = subprocess.Popen(['mariadbd', '--no-defaults', '--datadir='+str(data), '--socket='+str(sock),
                                '--pid-file='+str(state/'private/mariadb.pid'), '--skip-networking',
                                '--skip-log-bin', '--bind-address=127.0.0.1'],
                               stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
                               start_new_session=True)
    save_json(state/'private/db-process.json', {'pid':process.pid})
    initial = state/'private/initial-client.cnf'
    cnf(initial, {'DB_SOCKET':str(sock), 'DB_USER':'root', 'DB_PASS':''})
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError('Isolated MariaDB did not start; inspect private logs')
        if sock.exists():
            try:
                mysql(initial, 'SELECT 1;')
                break
            except RuntimeError:
                pass
        time.sleep(0.1)
    else:
        raise RuntimeError('Isolated MariaDB startup timeout')
    root_password = secrets.token_hex(32)
    mysql(initial, "ALTER USER 'root'@'localhost' IDENTIFIED BY '"+root_password+"';")
    initial.unlink()
    admin = {'DB_SOCKET':str(sock), 'DB_NAME':'mysql', 'DB_USER':'root', 'DB_PASS':root_password}
    client = state/'private/stage-admin.cnf'
    cnf(client, admin)
    restore_name = 'db_sia_smkn2_magelang'
    # This server was created above and has never contained user data. No active server is contacted.
    mysql(client, 'CREATE DATABASE `'+restore_name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
    raw = state/'private/restore-input.sql'
    with gzip.open(state/'backups/database.sql.gz','rb') as src, raw.open('wb') as dst:
        import shutil
        shutil.copyfileobj(src,dst)
    mysql(client, database=restore_name, source=raw)
    raw.unlink()
    restore_config = {**admin, 'DB_NAME':restore_name}
    save_json(state/'private/restore-config.json',restore_config)
    restored = snapshot(state/'private/restore-config.json')
    expected = json.loads((state/'reports/active-database-before.json').read_text())
    save_json(state/'reports/restored-database.json',restored)
    if restored != expected:
        save_json(state/'reports/restore.json',{'status':'FAIL','exact_schema_and_data_match':False})
        raise RuntimeError('Restore fingerprints differ; application not started')
    test_name = 'sia_r0_testing'
    migration_name = 'sia_r0_migration_testing'
    schema = (state/'backups/schema-only.sql').read_text()
    for name in [test_name,migration_name]:
        mysql(client, 'CREATE DATABASE `'+name+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
        temp = state/'private/schema-input.sql'
        temp.write_text(schema.replace('`'+restore_name+'`','`'+name+'`'))
        mysql(client,database=name,source=temp)
        temp.unlink()
    runtime_password = secrets.token_hex(32)
    owner_password = secrets.token_hex(32)
    mysql(client, "CREATE USER 'sia_r0_app'@'localhost' IDENTIFIED BY '"+runtime_password+"';"
          "GRANT SELECT,INSERT,UPDATE,DELETE ON `"+test_name+"`.* TO 'sia_r0_app'@'localhost';"
          "CREATE USER 'sia_r0_owner'@'localhost' IDENTIFIED BY '"+owner_password+"';"
          "GRANT ALL PRIVILEGES ON `"+migration_name+"`.* TO 'sia_r0_owner'@'localhost';")
    runtime = {'APP_ENV':'testing','DB_SOCKET':str(sock),'DB_NAME':test_name,'DB_USER':'sia_r0_app',
               'DB_PASS':runtime_password,'SESSION_NAME':'SIA_R0_TEST','SESSION_PATH':str(state/'sessions'),'COOKIE_SECURE':'0'}
    owner = {'APP_ENV':'testing','DB_SOCKET':str(sock),'DB_NAME':migration_name,'DB_USER':'sia_r0_owner',
             'DB_PASS':owner_password,'ALLOW_SCHEMA_CHANGES':'1'}
    save_json(state/'private/app-config.json',runtime)
    save_json(state/'private/owner-config.json',owner)
    save_json(state/'private/stage-admin.json',admin)
    # All fixture rows are synthetic, with randomly generated authentication secrets.
    fixture_password = secrets.token_hex(24)
    hash_result = command(['php','-r','echo password_hash(trim(stream_get_contents(STDIN)), PASSWORD_BCRYPT);'],input=fixture_password.encode(),stdout=subprocess.PIPE)
    fixture_hash = hash_result.stdout.decode()
    fixture = f"""
INSERT INTO jurusan(id_jurusan,kode_jurusan,nama_jurusan) VALUES(1,'R0','Jurusan Pengujian');
INSERT INTO kelas(id_kelas,nama_kelas,tingkat,id_jurusan) VALUES(1,'Kelas Uji R0','X',1);
INSERT INTO guru(id_guru,nip,nama_guru) VALUES(1,'R0-NIP-TEST','Guru Pengujian');
INSERT INTO siswa(nis,nama_siswa,jenis_kelamin,tanggal_lahir,id_kelas) VALUES('R0TEST0001','Siswa Fixture Satu','L','2010-01-01',1),('R0TEST0002','Siswa Tanpa Akun','P','2010-01-02',1);
INSERT INTO mata_pelajaran(id_mapel,kode_mapel,nama_mapel,kelompok,kkm) VALUES(1,'R0TEST','Mapel Pengujian','Produktif',75);
INSERT INTO tahun_ajaran(id_tahun_ajaran,tahun_ajaran,semester,status) VALUES(1,'2099/2100','Ganjil','Aktif');
INSERT INTO jadwal(id_jadwal,id_guru,id_mapel,id_kelas,hari,jam_mulai,jam_selesai) VALUES(1,1,1,1,'Senin','07:00','08:00');
INSERT INTO users(id_user,username,password,role,status) VALUES(1,'r0_test_admin','{fixture_hash}','admin','aktif'),(2,'r0_test_disabled','{fixture_hash}','admin','nonaktif');
INSERT INTO nilai(nis,id_mapel,id_guru,id_tahun_ajaran,nilai_tugas,nilai_uts,nilai_uas,nilai_akhir) VALUES('R0TEST0001',1,1,1,80,80,80,80);
INSERT INTO absensi(tanggal,nis,id_jadwal,status,created_by) VALUES('2099-01-05','R0TEST0001',1,'Hadir',1);
INSERT INTO jurnal_kelas(id_jadwal,id_guru,id_kelas,id_mapel,tanggal,materi) VALUES(1,1,1,1,'2099-01-05','Materi sintetis R0');
"""
    mysql(client,sql=fixture,database=test_name)
    save_json(state/'private/fixture-login.json',{'username':'r0_test_admin','password':fixture_password,'inactive_username':'r0_test_disabled'})
    # Integrity inspection needs SHOW VIEW/routine metadata. Keep these privileges
    # on a private inspector connection, never grant them just to satisfy web tests.
    save_json(state/'private/testing-inspector.json',{**admin,'DB_NAME':test_name})
    save_json(state/'reports/testing-database-before.json',snapshot(state/'private/testing-inspector.json'))
    report = {'status':'PASS','exact_schema_and_data_match':True,'base_tables':sum(v['type']=='BASE TABLE' for v in restored['tables'].values()),'views':sum(v['type']=='VIEW' for v in restored['tables'].values()),
              'restored_into_new_socket_only_instance':True,'web_database_contains_synthetic_fixtures_only':True,
              'runtime_has_no_ddl_privileges':True}
    save_json(state/'reports/restore.json',report)
    print('PASS: exact restore verified; separate fixture database and scoped runtime/owner accounts created.')


def start_web(args):
    state = private_state(args.state)
    with socket.socket() as probe:
        probe.bind(('127.0.0.1',args.port))
    env = os.environ.copy()
    # Do not inherit ad-hoc DB overrides into the isolated application.
    for key in list(env):
        if key.startswith('SIA_'):del env[key]
    env['SIA_CONFIG_FILE']=str(state/'private/app-config.json')
    log = (state/'logs/php.log').open('ab')
    process = subprocess.Popen(['php','-d','display_errors=0','-d','log_errors=1','-d','error_log='+str(state/'logs/php-errors.log'),
                                '-S','127.0.0.1:'+str(args.port),'-t',str(ROOT/'public'),str(ROOT/'public/index.php')],
                               cwd=ROOT,env=env,stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
    save_json(state/'private/web-process.json',{'pid':process.pid,'port':args.port})
    print('Staging HTTP started on loopback port '+str(args.port)+'; fixture database only.')


def stop(args):
    state = private_state(args.state)
    for item in ['web-process.json','db-process.json']:
        record=state/'private'/item
        if not record.exists():continue
        pid=json.loads(record.read_text())['pid']
        proc=Path('/proc')/str(pid)/'cmdline'
        if proc.exists():
            content=proc.read_bytes().decode(errors='replace')
            expected=str(ROOT/'public') if item.startswith('web') else str(state/'database')
            if expected not in content:raise RuntimeError('PID ownership check failed; no signal sent')
            os.kill(pid,signal.SIGTERM)
    print('Stop requested for owned staging processes only; state and backups retained.')


def main():
    os.umask(0o077)
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='action',required=True)
    for name in ['backup','stage','start-web','stop']:
        p=sub.add_parser(name);p.add_argument('--state',required=True)
        if name=='backup':p.add_argument('--config',required=True)
        if name=='start-web':p.add_argument('--port',type=int,default=18085)
    args=parser.parse_args()
    try:
        {'backup':backup,'stage':stage,'start-web':start_web,'stop':stop}[args.action](args)
    except Exception as error:
        # Errors deliberately exclude database output, rows, configuration and subprocess arguments.
        print('FAIL: '+str(error),file=sys.stderr)
        return 1
    return 0


if __name__=='__main__':sys.exit(main())
