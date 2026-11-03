#!/usr/bin/env python3
"""One-time replacement staging principals; never revokes existing grants."""
import json,os,secrets,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'ops'))
from r0_environment import mysql,save_json

def main():
    assert os.geteuid()==0;state=Path('/home/muflih/.local/state/sia-r15/20261031');client=state/'private/stage-admin.cnf';assert mysql(client,'SELECT @@skip_networking;').strip()==b'1'
    database='r1_testing_20261030';names=['r15_app_min_1031_a','r15_app_min_1031_b'];business=['jurusan','kelas','guru','siswa','mata_pelajaran','jadwal','users','tahun_ajaran','nilai','absensi','jurnal_kelas','bobot_penilaian','ekstrakurikuler','nilai_ekskul','kalender_akademik','catatan_evaluasi'];profiles=[]
    for user in names:assert mysql(client,"SELECT COUNT(*) FROM mysql.user WHERE User='"+user+"';").strip()==b'0','Refuse existing identity'
    template=json.loads((state/'private/runtime.json').read_text());template.pop('SESSION_MAX_AGE',None);template.pop('SESSION_IDLE_TIMEOUT',None);template['COOKIE_SECURE']='0';template['SECURITY_STATE_PATH']='/var/lib/sia-r15-stage-20261031/security'
    for user in names:
        password=secrets.token_hex(32);mysql(client,"CREATE USER '"+user+"'@'localhost' IDENTIFIED BY '"+password+"';")
        for table in business:mysql(client,"GRANT SELECT,INSERT,UPDATE ON `"+database+"`.`"+table+"` TO '"+user+"'@'localhost';")
        mysql(client,"GRANT INSERT ON `"+database+"`.audit_aktivitas TO '"+user+"'@'localhost';GRANT DELETE ON `"+database+"`.catatan_evaluasi TO '"+user+"'@'localhost';")
        profiles.append({**template,'DB_USER':user,'DB_PASS':password})
    directory=Path('/etc/sia-r15-staging/20261031')
    for name,profile in zip(['runtime-slot-a.json','runtime-next.json'],profiles):save_json(directory/name,{**profile,'DB_SOCKET':'/run/sia-r15-stage-20261031/mysql.sock'})
    save_json(state/'private/runtime.json',profiles[0]);os.chown(state/'private/runtime.json',1000,1000)
    save_json(state/'reports/minimum-runtime-provisioning.json',{'new_staging_principals':2,'existing_grants_changed':False,'schema_wide_select':False,'business_tables':len(business),'audit_insert_only':True,'unused_tables_denied':True,'production_touched':False});os.chown(state/'reports/minimum-runtime-provisioning.json',1000,1000)
    print('Prepared new staging-only least-privilege principals; no existing grant revoked.')

if __name__=='__main__':main()
