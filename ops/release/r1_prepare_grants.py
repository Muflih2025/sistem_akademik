#!/usr/bin/env python3
"""Generate a private, reviewable grant/config plan. Never connects to a database."""
import argparse,json,os,re,secrets,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'ops'))
from r0_environment import cnf,save_json

def main():
    os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('--active-config',required=True);p.add_argument('--output',required=True);p.add_argument('--release-commit',required=True);a=p.parse_args()
    assert re.fullmatch('[a-f0-9]{40}',a.release_commit)
    config=Path(a.active_config).resolve();output=Path(a.output).resolve()
    assert ROOT not in output.parents and not output.exists(),'Plan must be new and outside repository'
    assert not(config.stat().st_mode&0o077),'Private source config required'
    active=json.loads(config.read_text());database=active['DB_NAME'];assert re.fullmatch('[A-Za-z0-9_]+',database)
    output.mkdir(mode=0o700)
    for directory in ['sessions','security','logs','uploads']:(output/directory).mkdir(mode=0o700)
    suffix=a.release_commit[:8];runtime_target=Path('/var/lib/sia-r1')/suffix;app='sia_r1_app_'+suffix;owner='sia_r1_deploy_'+suffix
    apppass=secrets.token_hex(32);ownerpass=secrets.token_hex(32)
    connection={k:v for k,v in active.items() if k in ['DB_HOST','DB_PORT','DB_SOCKET','DB_NAME']}
    runtime={**connection,'APP_ENV':'production','DB_USER':app,'DB_PASS':apppass,'ALLOW_SCHEMA_CHANGES':'0','SESSION_NAME':'SIA_R1_'+suffix.upper(),'SESSION_PATH':str(runtime_target/'sessions'),'SECURITY_STATE_PATH':str(runtime_target/'security'),'SECURITY_LOG':str(runtime_target/'logs/security.jsonl'),'COOKIE_SECURE':'0','R1_APPROVED_RELEASE':''}
    deployment={**connection,'APP_ENV':'production','DB_USER':owner,'DB_PASS':ownerpass,'ALLOW_SCHEMA_CHANGES':'1','R1_APPROVED_RELEASE':''}
    save_json(output/'runtime.json',runtime);save_json(output/'deployment-owner.json',deployment)
    save_json(output/'rollback-runtime.json',{**runtime,'SESSION_NAME':runtime['SESSION_NAME']+'_R0','SESSION_PATH':str(runtime_target/'sessions-rollback')})
    cnf(output/'runtime-client.cnf',runtime);cnf(output/'owner-client.cnf',deployment)
    business=['jurusan','kelas','guru','siswa','mata_pelajaran','jadwal','users','tahun_ajaran','nilai','absensi','jurnal_kelas','bobot_penilaian','ekstrakurikuler','nilai_ekskul','kalender_akademik','catatan_evaluasi']
    sql=['-- NOT EXECUTED. Separate user authorization is required before applying.',
         '-- Stop if either named account already exists. Do not use --force.',
         f"CREATE USER '{app}'@'localhost' IDENTIFIED BY '{apppass}';",
         '-- Runtime gets no schema-wide SELECT, audit read, migration ledger or normalization-table access.']
    sql += [f"GRANT SELECT,INSERT,UPDATE ON `{database}`.`{table}` TO '{app}'@'localhost';" for table in business]
    sql += [f"GRANT INSERT ON `{database}`.audit_aktivitas TO '{app}'@'localhost';",
            f"GRANT DELETE ON `{database}`.catatan_evaluasi TO '{app}'@'localhost';",
            f"CREATE USER '{owner}'@'localhost' IDENTIFIED BY '{ownerpass}';",
            f"GRANT SELECT,INSERT,CREATE,ALTER,INDEX,REFERENCES ON `{database}`.* TO '{owner}'@'localhost';"]
    (output/'grants.sql').write_text('\n'.join(sql)+'\n');(output/'grants.sql').chmod(0o600)
    save_json(output/'plan-summary.json',{'release':a.release_commit,'executed':False,'new_accounts_only':[app,owner],'host':'localhost','runtime_no_ddl':True,'audit_append_only':True,'historical_delete_denied':True,'migration_identity_separate':True,'existing_grants_touched':False,'approval_setting_unset':True,'passwords_private_only':True})
    print('Prepared private grants/config plan only; no database connection or changes.')

if __name__=='__main__':main()
