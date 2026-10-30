#!/usr/bin/env python3
"""Validate only the R1 synthetic database, including repeat migration safety."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'ops'))
from r0_environment import snapshot, save_json


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser()
    parser.add_argument('--state', required=True)
    args = parser.parse_args()
    state = Path(args.state).resolve()
    config = json.loads((state / 'private/runtime.json').read_text())
    assert config['APP_ENV'] == 'testing' and config['DB_NAME'] == 'r1_testing_20261030' and config.get('DB_SOCKET')
    results = []
    def db(sql, params=None):
        result = subprocess.run(['php', str(ROOT / 'tests/r1_db.php'), str(state / 'private/inspector.json')],
                                input=json.dumps({'sql': sql, 'args': params or []}).encode(), capture_output=True)
        assert result.returncode == 0
        return json.loads(result.stdout)
    def test(name, fn):
        try:
            assert fn()
            results.append({'test': name, 'status': 'PASS'})
        except Exception:
            results.append({'test': name, 'status': 'FAIL'})
        print(results[-1]['status'] + ' ' + name)
    test('fixture_server_has_no_tcp_networking', lambda: int(db('SELECT @@skip_networking AS isolated')[0]['isolated']) == 1)
    before = snapshot(state / 'private/inspector.json')
    def migration_repeat():
        env = {k: v for k, v in os.environ.items() if not k.startswith('SIA_')}
        env['SIA_CONFIG_FILE'] = str(state / 'private/owner-config.json')
        for _ in range(2):
            result = subprocess.run(['php', str(ROOT / 'ops/migrate_r1.php'), '--apply', '--expected-database=r1_testing_20261030'], env=env, capture_output=True)
            if result.returncode:
                return False
        return snapshot(state / 'private/inspector.json') == before
    test('repeat_migration_twice_changes_no_schema_data_accounts_or_objects', migration_repeat)
    foreign_keys = db('SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL')
    for fk in foreign_keys:
        # Names originate from this isolated schema, never request input.
        table, column, parent, target = [fk[k].replace('`', '``') for k in ['TABLE_NAME', 'COLUMN_NAME', 'REFERENCED_TABLE_NAME', 'REFERENCED_COLUMN_NAME']]
        sql = f'SELECT COUNT(*) AS orphan_count FROM `{table}` child LEFT JOIN `{parent}` parent ON child.`{column}`=parent.`{target}` WHERE child.`{column}` IS NOT NULL AND parent.`{target}` IS NULL'
        test('foreign_key_' + table + '_' + column, lambda sql=sql: int(db(sql)[0]['orphan_count']) == 0)
    after = snapshot(state / 'private/inspector.json')
    save_json(state / 'reports/fixture-after.json', after)
    test('database_verification_queries_do_not_mutate_fixture', lambda: before == after)
    report = {'passed': sum(x['status'] == 'PASS' for x in results),
              'failed': sum(x['status'] == 'FAIL' for x in results), 'skipped': 0,
              'tests': results, 'foreign_keys_checked': len(foreign_keys), 'fixture_only': True}
    save_json(state / 'reports/database-tests.json', report)
    print(f"{report['passed']} PASS, {report['failed']} FAIL, 0 SKIP")
    return 1 if report['failed'] else 0


if __name__ == '__main__':
    sys.exit(main())
