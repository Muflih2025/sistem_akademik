#!/usr/bin/env python3
"""Create a new synthetic R1 database only on the existing socket-only staging instance.
Never drops, resets, truncates, reconnects to TCP, or overwrites an existing database.
"""
import argparse,json,os,secrets,subprocess,sys,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'ops'))
from r0_environment import cnf,mysql,save_json,snapshot

def main():
    os.umask(0o077)
    p=argparse.ArgumentParser();p.add_argument('--state',required=True);p.add_argument('--stage-admin-config',required=True);p.add_argument('--objects',required=True);a=p.parse_args()
    state=Path(a.state).resolve();assert ROOT not in state.parents and state.stat().st_uid==os.getuid() and not(state.stat().st_mode&0o077)
    admin=json.loads(Path(a.stage_admin_config).read_text());assert admin.get('DB_SOCKET') and not admin.get('DB_HOST')
    client=state/'private/stage-admin.cnf';cnf(client,admin)
    assert mysql(client,'SELECT @@skip_networking;').strip()==b'1'
    database='r1_testing_20261030'
    assert mysql(client,"SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='"+database+"';").strip()==b'0','Refusing to reuse/reset existing database'
    raw=state/'private/base-schema.sql'
    with raw.open('wb') as out:
        result=subprocess.run(['mariadb-dump','--defaults-extra-file='+str(client),'--no-data','--skip-lock-tables','--skip-add-drop-table','--skip-add-locks','--skip-comments','--skip-triggers','--skip-routines','--skip-events','--ignore-table=sia_r0_testing.view_rapor_siswa','sia_r0_testing'],stdout=out,stderr=subprocess.PIPE)
    assert result.returncode==0
    sql=raw.read_text();assert not re.search(r'\b(?:DROP\s+TABLE|TRUNCATE)\b',sql,re.I)
    mysql(client,'CREATE DATABASE `'+database+'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
    raw.write_text(sql.replace('`sia_r0_testing`','`'+database+'`'));mysql(client,database=database,source=raw)
    ownerpass=secrets.token_hex(32);runtimepass=secrets.token_hex(32)
    for user in ['r1_owner','r1_runtime']:assert mysql(client,"SELECT COUNT(*) FROM mysql.user WHERE User='"+user+"';").strip()==b'0'
    mysql(client,"CREATE USER 'r1_owner'@'localhost' IDENTIFIED BY '"+ownerpass+"';GRANT ALL PRIVILEGES ON `"+database+"`.* TO 'r1_owner'@'localhost';CREATE USER 'r1_runtime'@'localhost' IDENTIFIED BY '"+runtimepass+"';GRANT SELECT ON `"+database+"`.* TO 'r1_runtime'@'localhost';")
    owner={'APP_ENV':'testing','DB_SOCKET':admin['DB_SOCKET'],'DB_NAME':database,'DB_USER':'r1_owner','DB_PASS':ownerpass,'ALLOW_SCHEMA_CHANGES':'1'}
    save_json(state/'private/owner-config.json',owner)
    env={k:v for k,v in os.environ.items() if not k.startswith('SIA_')};env['SIA_CONFIG_FILE']=str(state/'private/owner-config.json')
    for _ in range(2):
        m=subprocess.run(['php',str(ROOT/'ops/database/migrate_r1.php'),'--apply','--expected-database='+database],env=env,capture_output=True);assert m.returncode==0,'Staging migration failed'
    for table in ['jurusan','kelas','guru','siswa','mata_pelajaran','jadwal','users','tahun_ajaran','nilai','absensi','jurnal_kelas','bobot_penilaian','ekstrakurikuler','nilai_ekskul','kalender_akademik','catatan_evaluasi']:
        mysql(client,'GRANT INSERT,UPDATE ON `'+database+'`.`'+table+'` TO \'r1_runtime\'@\'localhost\';')
    mysql(client,'GRANT INSERT ON `'+database+'`.audit_aktivitas TO \'r1_runtime\'@\'localhost\';GRANT DELETE ON `'+database+'`.catatan_evaluasi TO \'r1_runtime\'@\'localhost\';')
    inspect={**admin,'DB_NAME':database};save_json(state/'private/inspector.json',inspect)
    # Apply existing CREATE objects to this new isolated database, never their DROP wrappers.
    objects=json.loads(Path(a.objects).read_text());assert not any(re.search(r'\b(?:DROP\s+TABLE|TRUNCATE)\b',s,re.I) for s in objects)
    save_json(state/'private/objects.json',[v.replace('`db_sia_smkn2_magelang`','`'+database+'`') for v in objects])
    helper=state/'private/restore-objects.php';helper.write_text("<?php $c=json_decode(file_get_contents($argv[1]),true);$p=new PDO('mysql:unix_socket='.$c['DB_SOCKET'].';dbname='.$c['DB_NAME'].';charset=utf8mb4',$c['DB_USER'],$c['DB_PASS'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);foreach(json_decode(file_get_contents($argv[2]),true) as $s)$p->exec($s);")
    result=subprocess.run(['php',str(helper),str(state/'private/inspector.json'),str(state/'private/objects.json')],capture_output=True);assert result.returncode==0
    password=secrets.token_hex(24)
    hashed=subprocess.check_output(['php','-r','echo password_hash(trim(stream_get_contents(STDIN)),PASSWORD_BCRYPT);'],input=password.encode()).decode()
    fixture=f"""
INSERT INTO jurusan(id_jurusan,kode_jurusan,nama_jurusan) VALUES(1,'R1A','Jurusan Fixture A'),(2,'R1B','Jurusan Fixture B');
INSERT INTO kelas(id_kelas,nama_kelas,tingkat,id_jurusan) VALUES(1,'Kelas Fixture A','X',1),(2,'Kelas Fixture B','XI',2),(3,'Kelas Kosong','X',1);
INSERT INTO guru(id_guru,nip,nama_guru,email) VALUES(1,'R1-TEACHER-001','Guru Fixture A','a@example.invalid'),(2,'R1-TEACHER-002','Guru Fixture B','b@example.invalid');
INSERT INTO siswa(nis,nama_siswa,jenis_kelamin,tanggal_lahir,id_kelas) VALUES('0000001','Siswa Fixture A','L','2010-01-01',1),('0000002','Siswa Fixture B','P','2010-01-02',2),('0000003','Siswa Fixture C','P','2010-01-03',1);
INSERT INTO mata_pelajaran(id_mapel,kode_mapel,nama_mapel,kelompok,kkm) VALUES(1,'R1A','Mapel Fixture A','Produktif',75),(2,'R1B','Mapel Fixture B','Muatan Nasional',78);
INSERT INTO tahun_ajaran(id_tahun_ajaran,tahun_ajaran,semester,status,rapor_diterbitkan) VALUES(1,'2026/2027','Ganjil','Aktif',1),(2,'2025/2026','Genap','Tidak Aktif',0);
INSERT INTO jadwal(id_jadwal,id_guru,id_mapel,id_kelas,hari,jam_mulai,jam_selesai,ruang,id_tahun_ajaran) VALUES(1,1,1,1,'Senin','07:00','08:00','Fixture A',1),(2,2,2,2,'Selasa','07:00','08:00','Fixture B',1),(3,2,2,1,'Rabu','09:00','10:00','Fixture A',1),(4,1,1,1,'Senin','10:00','11:00','Fixture A',2),(5,1,1,1,'Kamis','08:00','09:00','Legacy',NULL);
INSERT INTO users(id_user,username,password,role,id_referensi,status) VALUES(1,'r1_admin','{hashed}','admin',NULL,'aktif'),(2,'r1_admin_second','{hashed}','admin',NULL,'aktif'),(50,'r1_teacher_a','{hashed}','guru','1','aktif'),(60,'r1_teacher_b','{hashed}','guru','2','aktif'),(70,'r1_student_a','{hashed}','siswa','0000001','aktif'),(80,'r1_student_b','{hashed}','siswa','0000002','aktif'),(90,'r1_head','{hashed}','kepala_sekolah',NULL,'aktif'),(95,'r1_disabled','{hashed}','admin',NULL,'nonaktif');
INSERT INTO nilai(id_nilai,nis,id_mapel,id_guru,id_tahun_ajaran,nilai_tugas,nilai_uts,nilai_uas,nilai_akhir) VALUES(1,'0000001',1,1,1,80,80,80,80),(2,'0000002',2,2,1,60,60,60,60),(3,'0000001',2,2,1,50,50,50,50),(4,'0000001',1,1,2,70,70,70,70);
INSERT INTO absensi(id_absen,tanggal,nis,id_jadwal,status,created_by) VALUES(1,'2026-10-19','0000001',1,'Izin',1),(2,'2026-10-20','0000002',2,'Hadir',60);
INSERT INTO jurnal_kelas(id_jurnal,id_jadwal,id_guru,id_kelas,id_mapel,tanggal,materi) VALUES(1,1,1,1,1,'2026-10-19','Jurnal legacy fixture'),(2,2,2,2,2,'2026-10-20','Jurnal kelas lain');
INSERT INTO ekstrakurikuler(id_ekskul,nama_ekskul,id_guru_pembina) VALUES(1,'Klub Fixture A',1),(2,'Klub Fixture B',2);
INSERT INTO nilai_ekskul(nis,id_ekskul,id_tahun_ajaran,predikat) VALUES('0000001',1,1,'Baik');
"""
    mysql(client,sql=fixture,database=database)
    runtime={'APP_ENV':'testing','DB_SOCKET':admin['DB_SOCKET'],'DB_NAME':database,'DB_USER':'r1_runtime','DB_PASS':runtimepass,'SESSION_NAME':'SIA_R1_TEST','SESSION_PATH':str(state/'sessions'),'COOKIE_SECURE':'0','SECURITY_STATE_PATH':str(state/'security'),'SECURITY_LOG':str(state/'logs/security.jsonl')}
    save_json(state/'private/runtime.json',runtime);save_json(state/'private/fixture-login.json',{'password':password,'admin':'r1_admin','admin_second':'r1_admin_second','teacher_a':'r1_teacher_a','teacher_b':'r1_teacher_b','student_a':'r1_student_a','student_b':'r1_student_b','head':'r1_head','disabled':'r1_disabled'})
    save_json(state/'reports/fixture-before.json',snapshot(state/'private/inspector.json'))
    save_json(state/'reports/environment.json',{'status':'PASS','isolated_socket_only':True,'synthetic_only':True,'migration_applied_twice':True,'runtime_no_ddl':True,'runtime_audit_append_only':True,'active_db_not_touched':True})
    print('PASS: new isolated R1 database, additive migration, least-privilege runtime and synthetic fixtures ready.')
if __name__=='__main__':main()
