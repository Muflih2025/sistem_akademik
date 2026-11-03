#!/usr/bin/env python3
"""Read-only comparison against private R1 baselines; never connects via app bootstrap."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'ops'))
from r0_environment import snapshot, save_json


def manifest(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file()
            and '.git' not in p.relative_to(root).parts
            and '__pycache__' not in p.relative_to(root).parts}


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('--state', required=True)
    args = parser.parse_args()
    state = Path(args.state).resolve()
    if state.stat().st_mode & 0o077:
        raise RuntimeError('Private state required')
    reports = state / 'reports'
    results = []

    def test(name, fn):
        try:
            assert fn()
            results.append({'test': name, 'status': 'PASS'})
        except Exception:
            results.append({'test': name, 'status': 'FAIL'})
        print(results[-1]['status'] + ' ' + name)

    for name, root in [
        ('target', Path('/home/muflih/sistem_akademik')),
        ('source', Path('/home/muflih/Sistem-Informasi-Akademik-Sekolah-Laravel')),
        ('active-release', Path('/home/muflih/.local/share/sia-releases/r0-531d2f8')),
    ]:
        current = manifest(root)
        save_json(reports / (name + '-after.json'), current)
        test(name + '_all_file_hashes_unchanged',
             lambda current=current, name=name: current == json.loads((reports / (name + '-before.json')).read_text()))
    test('target_existing_git_changes_preserved', lambda:
         subprocess.check_output(['git', '-C', '/home/muflih/sistem_akademik', 'status', '--short']).decode()
         == (reports / 'git-target-before.txt').read_text())
    service = Path('/etc/systemd/system/sistem-akademik.service.d/90-r0.conf')
    test('active_service_configuration_unchanged', lambda:
         hashlib.sha256(service.read_bytes()).hexdigest() == (reports / 'service-before.sha256').read_text().strip().split()[0])
    test('active_service_still_nonroot_running', lambda:
         set(subprocess.check_output(['systemctl', 'show', 'sistem-akademik.service', '--property=User', '--property=ActiveState']).decode().splitlines())
         == {'User=muflih', 'ActiveState=active'})
    activation = Path('/home/muflih/.local/state/sia-r0/activation-20261030')
    active = snapshot(activation / 'private/active-config.json')
    save_json(reports / 'active-database-after.json', active)
    test('active_database_all_tables_rows_schema_views_triggers_routines_unchanged', lambda:
         active == json.loads((reports / 'active-database-before.json').read_text()))
    backup = activation / 'backups/database.sql.gz'
    def backup_valid():
        report = json.loads((activation / 'reports/backup.json').read_text())
        with gzip.open(backup, 'rb') as stream:
            while stream.read(1024 * 1024):
                pass
        return report['status'] == 'PASS' and hashlib.sha256(backup.read_bytes()).hexdigest() == report['backup_sha256']
    test('preserved_r0_backup_sha256_and_gzip_readable', backup_valid)
    test('preserved_r0_restore_evidence_pass', lambda:
         json.loads((activation / 'reports/restore-preflight.json').read_text())['exact_data_and_normalized_schema_match'] is True)
    def http(path):
        request = urllib.request.Request('http://127.0.0.1:8085' + path, method='HEAD')
        try:
            response = urllib.request.urlopen(request, timeout=5)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return response.status
    test('active_8085_public_login_reachable', lambda: http('/auth/login.php') == 200)
    test('active_8085_internal_files_still_blocked', lambda:
         all(http(path) == 404 for path in ['/db_sia_smkn2_magelang.sql', '/.git/config', '/.env', '/server.log', '/config/config.php', '/adminer.php']))
    test('active_8085_binding_remains_loopback', lambda:
         '127.0.0.1:8085' in subprocess.check_output(['ss', '-ltn', '( sport = :8085 )']).decode()
         and '0.0.0.0:8085' not in subprocess.check_output(['ss', '-ltn', '( sport = :8085 )']).decode())
    report = {'passed': sum(x['status'] == 'PASS' for x in results),
              'failed': sum(x['status'] == 'FAIL' for x in results), 'skipped': 0,
              'tests': results, 'active_database_read_only': True,
              'active_base_tables': sum(x['type'] == 'BASE TABLE' for x in active['tables'].values()),
              'active_views': sum(x['type'] != 'BASE TABLE' for x in active['tables'].values()),
              'active_rows': sum(x.get('rows', 0) for x in active['tables'].values())}
    save_json(reports / 'integrity-tests.json', report)
    print(f"{report['passed']} PASS, {report['failed']} FAIL, 0 SKIP")
    return 1 if report['failed'] else 0


if __name__ == '__main__':
    sys.exit(main())
