#!/usr/bin/env python3
"""Additional temporal/RBAC/import/publication integration cases; fixture only."""
import csv,io,json,os,re,secrets,subprocess,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from academic_http import Browser,csrf,ROOT,STATE
sys.path.insert(0,str(ROOT/'ops'))
from r0_environment import save_json,snapshot

def main():
 os.umask(0o077);creds=json.loads((STATE/'private/test-accounts.json').read_text());config=json.loads((STATE/'private/runtime.json').read_text());assert config['DB_NAME']=='sia_academic_dev_20261031' and config.get('DB_SOCKET')
 tag=secrets.token_hex(3);results=[]
 def check(v,message='Expected condition not met'):
  if not v:raise AssertionError(message)
 def status(r,want):check(r[0]==want,'HTTP '+str(r[0])+' expected '+str(want))
 def test(name,fn):
  try:fn();results.append({'test':name,'status':'PASS'})
  except Exception as e:results.append({'test':name,'status':'FAIL','error_type':type(e).__name__,'detail':str(e) if isinstance(e,AssertionError) else 'Private details omitted'})
  print(results[-1]['status']+' '+name,flush=True)
 def db(sql,args=None):
  r=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private/inspector.json')],input=json.dumps({'sql':sql,'args':args or []}).encode(),capture_output=True);check(r.returncode==0,'Fixture helper failed');return json.loads(r.stdout)
 def one(sql,args=None):return next(iter(db(sql,args)),None)
 def scalar(sql,args=None):return next(iter(one(sql,args).values()))
 def login(key):
  b=Browser();page=b.request('/auth/login.php');r=b.request('/auth/login.php','POST',{'csrf_token':csrf(page[2].decode()),'username':creds.get(key,key),'password':creds['password']});status(r,302);return b
 def post(b,data,want=302,path='/academic/index.php?view=beranda'):
  page=b.request('/auth/change_password.php');status(page,200);r=b.request(path,'POST',{'csrf_token':csrf(page[2].decode()),**data});status(r,want);return r
 def get(b,path,want=200):r=b.request(path);status(r,want);return r
 def upload(b,module,rows,extra=None,want=200):
  stream=io.StringIO();csv.writer(stream).writerows(rows);boundary='ak'+tag;token=csrf(b.request('/auth/change_password.php')[2].decode());parts=[]
  data={'csrf_token':token,'action':'impor_preview','module':module,'id_tahun_ajaran':1,'alasan':'Uji impor '+tag,**(extra or {})}
  for k,v in data.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
  parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="berkas"; filename="uji.csv"\r\nContent-Type: text/csv\r\n\r\n'.encode()+stream.getvalue().encode()+f'\r\n--{boundary}--\r\n'.encode())
  r=b.request('/academic/index.php?view=impor&module='+module,'POST',b''.join(parts),{'Content-Type':'multipart/form-data; boundary='+boundary});status(r,want)
  if want==200:return re.search(rb'name="preview_token" value="([a-f0-9]+)"',r[2]).group(1).decode()
 def commit(b,token,want=302):return post(b,{'action':'impor_commit','preview_token':token,'konfirmasi':'1'},want)
 admin=login('admin');teacher=login('teacher');duty=login('duty');student=login('student');wali=login('wali')
 test('legacy_student_report_redirects_to_snapshot_gate',lambda:check(get(student,'/siswa/rapor.php',302)[1].get('Location','').startswith('/academic/index.php?view=rapor')))
 test('legacy_attendance_write_disabled_in_new_workflow',lambda:post(teacher,{},409,'/guru/absen.php'))
 test('legacy_calendar_write_disabled',lambda:post(admin,{},409,'/admin/kalender.php'))
 def logout_confirmation():
  r=get(teacher,'/auth/logout.php');check(b'method="post"' in r[2]);get(teacher,'/academic/index.php')
 test('logout_GET_confirmation_does_not_end_session',logout_confirmation)
 test('logout_requires_CSRF',lambda:status(teacher.request('/auth/logout.php','POST',{}),419))
 def rate_limit():
  b=Browser();page=b.request('/auth/login.php');token=csrf(page[2].decode())
  for i in range(5):status(b.request('/auth/login.php','POST',{'csrf_token':token,'username':'rate_'+tag,'password':'incorrect'}),200)
  r=b.request('/auth/login.php','POST',{'csrf_token':token,'username':'rate_'+tag,'password':'incorrect'});status(r,429);check(r[1].get('Retry-After')=='900')
 test('login_principal_rate_limit_5_then_429',rate_limit)
 def stale_csrf():
  b=Browser();token=csrf(b.request('/auth/login.php')[2].decode());status(b.request('/auth/login.php','POST',{'csrf_token':token,'username':creds['teacher'],'password':creds['password']}),302);status(b.request('/academic/index.php','POST',{'csrf_token':token,'action':'pertemuan'}),419)
 test('prelogin_csrf_not_reusable_after_session_regeneration',stale_csrf)
 # Class-limited duty never grants broader school scope or administrative rights.
 task={'action':'piket','id_tahun_ajaran':1,'id_guru':1,'id_kelas':2,'mulai':'2026-10-01','selesai':'2026-10-31','boleh_koreksi':'0','catatan':'Cakupan fixture '+tag}
 test('duty_create_class_limited',lambda:post(admin,task));taskid=int(scalar('SELECT MAX(id) FROM ak_tugas_piket'))
 test('limited_duty_export_authorized_class',lambda:get(teacher,'/academic/export.php?kind=harian&format=csv&id_kelas=2&id_tahun_ajaran=1&mulai=2026-10-30&selesai=2026-10-30'))
 test('limited_duty_cannot_export_own_teaching_class_without_task',lambda:get(teacher,'/academic/export.php?kind=harian&format=csv&id_kelas=1&id_tahun_ajaran=1&mulai=2026-10-30&selesai=2026-10-30',403))
 test('duty_range_checks_every_exported_day',lambda:get(teacher,'/academic/export.php?kind=harian&format=csv&id_kelas=2&id_tahun_ajaran=1&mulai=2026-09-30&selesai=2026-10-30',403))
 test('limited_duty_still_cannot_read_foreign_journal',lambda:get(teacher,'/academic/index.php?view=jurnal&id='+str(scalar('SELECT id FROM ak_pertemuan WHERE id_jadwal=4 LIMIT 1')),403))
 post(admin,{**task,'id':taskid,'operation':'cabut'})
 test('duty_revoked_scope_applies_immediately',lambda:get(teacher,'/academic/export.php?kind=harian&format=csv&id_kelas=2&id_tahun_ajaran=1&mulai=2026-10-30&selesai=2026-10-30',403))
 # Period lock is checked by every write, not only hidden in the UI.
 period={'action':'update','id_tahun_ajaran':1,'tahun_ajaran':'2026/2027','semester':'Ganjil','status':'Aktif','dikunci':'1','rapor_diterbitkan':'0'}
 post(admin,period,path='/admin/tahun_ajaran.php')
 try:
  writes=[(teacher,{'action':'pertemuan','id_jadwal':1,'tanggal':'2026-10-30'}),(teacher,{'action':'aturan_nilai','id_jadwal':1,'tanggal':'2026-10-30'}),(teacher,{'action':'nilai','id_jadwal':1,'tanggal':'2026-10-30'}),(duty,{'action':'rekonsiliasi','id_kelas':1,'id_tahun_ajaran':1,'tanggal':'2026-10-30'}),(admin,{'action':'kalender','id_tahun_ajaran':1}),(admin,{'action':'anggota','id_tahun_ajaran':1}),(admin,{'action':'rapor_buat','id_tahun_ajaran':1,'tanggal':'2026-10-30'})]
  for b,data in writes:test('locked_period_'+data['action'],lambda b=b,data=data:post(b,data,403))
 finally:post(admin,{**period,'dikunci':'0'},path='/admin/tahun_ajaran.php')
 # Calendar import and atomic batch rollback on a concurrent duplicate.
 header=['mulai','selesai','judul','jenis','status','catatan'];event=['2026-11-10','2026-11-10','Agenda impor '+tag,'Agenda','draft','Fixture sintetis']
 test('calendar_import_cannot_publish_from_file',lambda:upload(admin,'kalender',[header,[*event[:4],'disahkan',event[5]]],want=422))
 token=upload(admin,'kalender',[header,event]);test('calendar_import_preview_and_commit',lambda:commit(admin,token));test('calendar_import_saved_as_draft',lambda:check(one('SELECT status FROM ak_kalender WHERE judul=?',[event[2]])['status']=='draft'))
 test('calendar_import_duplicate_existing_rejected',lambda:upload(admin,'kalender',[header,event],want=422))
 a=[*event];a[2]='Atomic A '+tag;b=[*event];b[2]='Atomic B '+tag;token=upload(admin,'kalender',[header,a,b]);post(admin,{'action':'kalender','id_tahun_ajaran':1,'revision':0,**dict(zip(header,b))})
 test('calendar_batch_concurrent_duplicate_rolls_back',lambda:commit(admin,token,422));test('calendar_no_partial_rows_after_failed_import',lambda:check(scalar('SELECT COUNT(*) FROM ak_kalender WHERE judul=?',[a[2]])==0))
 # Master import validates before committing and never creates default accounts.
 nis='008'+str(int(tag,16)).zfill(8);sh=['nis','nama_siswa','jenis_kelamin','tanggal_lahir','id_kelas','alamat'];sr=[nis,'Siswa impor '+tag,'P','2010-02-03','2','Sintetis'];before_users=scalar('SELECT COUNT(*) FROM users')
 token=upload(admin,'siswa',[sh,sr]);test('master_student_import_commit',lambda:commit(admin,token));test('master_student_leading_zero_preserved',lambda:check(one('SELECT nis FROM siswa WHERE nis=?',[nis])['nis']==nis));test('master_import_does_not_seed_accounts',lambda:check(scalar('SELECT COUNT(*) FROM users')==before_users))
 test('master_import_existing_identity_rejected',lambda:upload(admin,'siswa',[sh,sr],want=422));test('master_import_unknown_class_rejected',lambda:upload(admin,'siswa',[sh,[nis+'1',*sr[1:4],'999999',sr[5]]],want=422))
 gh=['nip','nama_guru','email','no_hp'];gr=['UJI-IM-'+tag,'Guru impor '+tag,'',''];token=upload(admin,'guru',[gh,gr]);test('master_teacher_import_commit',lambda:commit(admin,token));test('master_teacher_import_exists',lambda:check(one('SELECT nip FROM guru WHERE nip=?',[gr[0]]) is not None))
 # Grade bulk write is atomic and supports decimals.
 ruleid=int(scalar('SELECT MAX(id) FROM ak_aturan_nilai WHERE id_guru=1 AND id_mapel=1'))
 def bulk(bad=False):
  data={'action':'nilai','id_jadwal':1,'tanggal':'2026-10-30','id_aturan':ruleid,'alasan':'Bulk fixture '+tag}
  for n in [1,2]:
   nis=f'{n:07d}';old=one('SELECT revision FROM ak_nilai WHERE nis=? AND id_mapel=1 AND id_tahun_ajaran=1',[nis]);data[f'nilai[{nis}][revision]']=old['revision'] if old else 0
   for k,v in {'tugas':'85.50','uts':'80','uas':'90','praktik':'0','proyek':'0','deskripsi':'Capaian bulk uji'}.items():data[f'nilai[{nis}][{k}]']=v
  if bad:data['nilai[0000002][uas]']='101'
  return data
 before=one("SELECT * FROM ak_nilai WHERE nis='0000001' AND id_mapel=1")
 test('grade_bulk_bad_second_row_rejected',lambda:post(teacher,bulk(True),422));test('grade_bulk_no_partial_first_row_update',lambda:check(one("SELECT * FROM ak_nilai WHERE nis='0000001' AND id_mapel=1")==before));test('grade_bulk_two_students_and_decimals',lambda:post(teacher,bulk()))
 test('grade_decimal_formula_consistent',lambda:check(one("SELECT nilai_akhir,predikat FROM ak_nilai WHERE nis='0000002' AND id_mapel=1")=={'nilai_akhir':'86.20','predikat':'B'}))
 grade_header=['nis','tugas','uts','uas','praktik','proyek','deskripsi'];grade_row=['0000002','85.50','80','90','0','0','Nilai melalui impor uji']
 token=upload(teacher,'nilai',[grade_header,grade_row],{'id_jadwal':1,'tanggal':'2026-10-30','id_aturan':ruleid})
 test('grade_import_validated_preview_commit',lambda:commit(teacher,token))
 test('grade_import_calculated_from_versioned_rule',lambda:check(one("SELECT nilai_akhir,id_aturan FROM ak_nilai WHERE nis='0000002' AND id_mapel=1")=={'nilai_akhir':'86.20','id_aturan':ruleid}))
 test('grade_import_out_of_range_rejected',lambda:upload(teacher,'nilai',[grade_header,['0000002','101',*grade_row[2:]]],{'id_jadwal':1,'tanggal':'2026-10-30','id_aturan':ruleid},422))
 # New report snapshots are invalidated for publication when their source revisions change.
 build={'action':'rapor_buat','id_tahun_ajaran':1,'nis':'0000001','tanggal':'2026-10-30','alasan':'Snapshot edge '+tag}
 def transition(rid,target,want=302):
  if target=='terverifikasi' and want==302:
   rev=scalar('SELECT revision FROM ak_rapor_status WHERE id_snapshot=?',[rid]);post(wali,{'action':'rapor_review','id':rid,'revision':rev,'keputusan':'disetujui','catatan':'Pemeriksaan wali fixture kasus batas'})
  rev=scalar('SELECT revision FROM ak_rapor_status WHERE id_snapshot=?',[rid]);return post(admin,{'action':'rapor_status','id':rid,'revision':rev,'status':target,'alasan':'Review fixture '+tag},want)
 post(admin,build);rid=int(scalar('SELECT MAX(id) FROM ak_rapor_snapshot'));post(teacher,bulk())
 test('report_source_change_blocks_verification',lambda:transition(rid,'terverifikasi',422))
 post(admin,build);rid=int(scalar('SELECT MAX(id) FROM ak_rapor_snapshot'));transition(rid,'terverifikasi');post(teacher,bulk())
 test('report_source_change_after_verification_blocks_publish',lambda:transition(rid,'diterbitkan',422))
 post(admin,build);rid=int(scalar('SELECT MAX(id) FROM ak_rapor_snapshot'));transition(rid,'terverifikasi');transition(rid,'diterbitkan')
 test('published_report_readable_before_withdrawal',lambda:get(student,'/academic/index.php?view=rapor&id='+str(rid)))
 test('report_withdraw_keeps_snapshot',lambda:transition(rid,'ditarik'));test('withdrawn_report_denied_to_student',lambda:get(student,'/academic/index.php?view=rapor&id='+str(rid),403))
 test('withdrawn_snapshot_still_exists',lambda:check(scalar('SELECT COUNT(*) FROM ak_rapor_snapshot WHERE id=?',[rid])==1))
 other_user=one("SELECT username FROM users WHERE role='siswa' AND id_referensi='0000021'")
 if not other_user:post(admin,{'action':'create','username':'uji_siswa_lain','role':'siswa','id_referensi':'0000021','status':'aktif','password':creds['password']},path='/admin/users.php');other_user={'username':'uji_siswa_lain'}
 other_student=login(other_user['username']);published=int(scalar("SELECT r.id FROM ak_rapor_snapshot r JOIN ak_rapor_status s ON s.id_snapshot=r.id WHERE s.status='diterbitkan' AND r.nis='0000001' ORDER BY r.id LIMIT 1"))
 test('student_report_other_identity_denied',lambda:get(other_student,'/academic/index.php?view=rapor&id='+str(published),403));test('student_export_other_identity_denied',lambda:get(other_student,'/academic/export.php?kind=rapor&format=xlsx&id='+str(published),403))
 # Formula literals are protected on CSV/Excel export, including whitespace prefixes.
 env={**os.environ,'SIA_CONFIG_FILE':str(STATE/'private/runtime.json')}
 code="require 'config/config.php'; require 'config/validation.php'; echo json_encode(array_map('csv_safe',['=1+1','  =1+1','@SUM(A1)','normal']));"
 r=subprocess.run(['php','-r',code],cwd=ROOT,env=env,capture_output=True)
 test('csv_formula_injection_and_whitespace_prefix_protected',lambda:check(r.returncode==0 and json.loads(r.stdout)==["'=1+1","'  =1+1","'@SUM(A1)",'normal']))
 before=snapshot(STATE/'private/inspector.json');migration=subprocess.run(['php',str(ROOT/'ops/database/migrate_academic.php'),'--apply','--expected-database=sia_academic_dev_20261031'],env={**os.environ,'SIA_CONFIG_FILE':str(STATE/'private/owner.json')},capture_output=True)
 test('additive_migrations_repeat_idempotently',lambda:check(migration.returncode==0 and snapshot(STATE/'private/inspector.json')==before))
 report={'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results),'skipped':0,'tests':results,'fixture_only':True};save_json(STATE/'reports/academic-edge-tests.json',report);print(f"{report['passed']} PASS, {report['failed']} FAIL, 0 SKIP");return 1 if report['failed'] else 0

if __name__=='__main__':
 try:sys.exit(main())
 except Exception as error:print('FAIL edge runner '+type(error).__name__+'; private details omitted.',file=sys.stderr);sys.exit(2)
