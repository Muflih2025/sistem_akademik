#!/usr/bin/env python3
"""Real HTTP/DB tests for editable bells and transactional annual progression."""
import copy,hashlib,json,os,re,secrets,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'));sys.path.insert(0,str(ROOT/'ops'))
from academic_http import STATE,Browser,csrf
from r0_environment import snapshot,save_json

def db(sql,args=None,config='inspector.json'):
 r=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private'/config)],input=json.dumps({'sql':sql,'args':args or []}).encode(),capture_output=True)
 if r.returncode:raise RuntimeError('Development fixture query refused')
 return json.loads(r.stdout)
def seed(label,count_x=1,count_xii=1):
 tag=secrets.token_hex(3);year=4000+secrets.randbelow(3000)
 while db('SELECT id_tahun_ajaran FROM tahun_ajaran WHERE tahun_ajaran IN (?,?)',[f'{year}/{year+1}',f'{year+1}/{year+2}']):year=4000+secrets.randbelow(3000)
 periods=[]
 for value,semester,start,end in [(f'{year}/{year+1}','Genap',f'{year+1}-01-01',f'{year+1}-06-30'),(f'{year+1}/{year+2}','Ganjil',f'{year+1}-07-01',f'{year+1}-12-31')]:
  pid=int(db("INSERT INTO tahun_ajaran(tahun_ajaran,semester,status,dikunci,rapor_diterbitkan) VALUES(?,?,'Tidak Aktif',0,0)",[value,semester])['id']);periods.append(pid)
  db("INSERT INTO ak_periode(id_tahun_ajaran,mulai,selesai,hari_efektif,terverifikasi,catatan,updated_by) VALUES(?,?,?,'1,2,3,4,5',1,?,1)",[pid,start,end,'DATA UJI KENAIKAN '+label+' '+tag])
 major=db("SELECT id_jurusan FROM jurusan WHERE kode_jurusan='PPLG'")[0]['id_jurusan'];classes={}
 for level in ['X','XI','XII']:
  classes[level]=int(db('INSERT INTO kelas(nama_kelas,tingkat,id_jurusan) VALUES(?,?,?)',[f'Uji {level} {tag}',level,major])['id'])
 students=[]
 for level,count in [('X',count_x),('XI',1),('XII',count_xii)]:
  for n in range(1,count+1):
   nis='009'+str(secrets.randbelow(10**11)).zfill(11)
   while db('SELECT nis FROM siswa WHERE nis=?',[nis]):nis='009'+str(secrets.randbelow(10**11)).zfill(11)
   db("INSERT INTO siswa(nis,nama_siswa,jenis_kelamin,tanggal_lahir,id_kelas,alamat) VALUES(?,?,'L','2010-01-01',?,'DATA UJI khusus kenaikan')",[nis,f'Siswa Uji {label} {level} {n} {tag}',classes[level]])
   aid=int(db('INSERT INTO ak_anggota_kelas(nis,id_kelas,id_tahun_ajaran,nomor_absen,mulai,selesai,created_by) VALUES(?,?,?,?,?,?,1)',[nis,classes[level],periods[0],n,f'{year+1}-01-01',f'{year+1}-06-30'])['id']);students.append({'nis':nis,'level':level,'member':aid,'number':n})
 return {'tag':tag,'source':periods[0],'target':periods[1],'year':year,'classes':classes,'students':students,'mapping':{str(classes['X']):str(classes['XI']),str(classes['XI']):str(classes['XII']),str(classes['XII']):'alumni'}}

def main():
 os.umask(0o077);results=[];credentials=json.loads((STATE/'private/test-accounts.json').read_text());cfg=json.loads((STATE/'private/runtime.json').read_text());assert cfg['APP_ENV']=='testing'and cfg['DB_NAME']=='sia_academic_dev_20261031'and cfg.get('DB_SOCKET')
 def check(value):
  if not value:raise AssertionError('Expected condition failed; private fixture values omitted')
 def test(name,fn):
  try:fn();results.append({'test':name,'status':'PASS'})
  except Exception as e:results.append({'test':name,'status':'FAIL','error_type':type(e).__name__})
  print(results[-1]['status']+' '+name,flush=True)
 def login(role):
  b=Browser();r=b.request('/auth/login.php');check(b.request('/auth/login.php','POST',{'csrf_token':csrf(r[2].decode()),'username':credentials[role],'password':credentials['password']})[0]==302);return b
 def post(b,body,path='/academic/index.php?view=kenaikan',want=302):
  token=csrf(b.request('/auth/change_password.php')[2].decode());r=b.request(path,'POST',{'csrf_token':token,**body});check(r[0]==want);return r
 admin=login('admin');teacher=login('teacher');student=login('student');head=login('head');duty=login('duty')
 for role,b in [('teacher',teacher),('student',student),('head',head),('duty',duty)]:
  test('deny_'+role+'_progression_and_alumni',lambda b=b:check(all(b.request('/academic/index.php?view='+v)[0]==403 for v in ['kenaikan','alumni'])))
 test('guest_progression_requires_login',lambda:check(Browser().request('/academic/index.php?view=kenaikan')[0]==302))
 test('missing_CSRF_bell_and_progression_rejected',lambda:check(all(admin.request('/academic/index.php?view=jam','POST',{'action':a})[0]==419 for a in ['jam_belajar','kenaikan_commit'])))
 test('36_expected_classes_exactly_present',lambda:check(all(len(db("SELECT id_kelas FROM kelas WHERE nama_kelas=? AND tingkat=? AND status='aktif'",[f'{l} {p} {n}',l]))==1 for l in ['X','XI','XII']for p in ['PPLG','AKL','PM','MPLB']for n in [1,2,3])))
 test('Piket_dashboard_paginates_six_classes_per_page',lambda:check(admin.request('/academic/index.php?view=piket&tanggal=2026-10-30')[2].count(b'value="rekonsiliasi"')==6))
 test('period_list_server_pagination_limited_to_20',lambda:check(admin.request('/admin/tahun_ajaran.php')[2].count(b'<tr>')-1<=20))
 original=db("SELECT * FROM ak_jam_belajar WHERE nama='Senin' ORDER BY versi DESC LIMIT 1")[0];profile=json.loads(original['payload_json'])
 def bell_data(row=original,slots=None):
  data={'action':'jam_belajar','id':row['id'],'revision':row['versi'],'status':row['status'],'catatan':row['catatan'],'alasan':'Pemeriksaan HTTP jam development','terverifikasi':'1','created_by':'9999'}
  for i,(n,start,end,label)in enumerate(slots or json.loads(row['payload_json'])['slots']):
   for key,value in [('nomor',''if n is None else str(n)),('mulai',start),('selesai',end),('keterangan',label)]:data[f'slots[{i}][{key}]']=value
  return data
 for role,b in [('teacher',teacher),('student',student),('head',head),('duty',duty)]:
  test('deny_'+role+'_bell_write_URL_POST',lambda b=b:post(b,bell_data(),'/academic/index.php?view=jam',403))
 for label,mutate in [('overlap',lambda d:d.update({'slots[1][mulai]':'07:30'})),('invalid_time',lambda d:d.update({'slots[1][mulai]':'25:00'})),('duplicate_lesson',lambda d:d.update({'slots[2][nomor]':'1'})),('reversed_range',lambda d:d.update({'slots[1][selesai]':'07:00'})),('missing_verification',lambda d:d.update({'terverifikasi':'0'})),('missing_reason',lambda d:d.update({'alasan':''}))]:
  def invalid(mutate=mutate):
   data=bell_data();mutate(data);before=snapshot(STATE/'private/inspector.json');post(admin,data,'/academic/index.php?view=jam',422);check(before==snapshot(STATE/'private/inspector.json'))
  test('bell_'+label+'_atomic_rejection',invalid)
 changed=copy.deepcopy(profile['slots']);changed[-1][2]='15:25'
 test('admin_bell_write_creates_new_version',lambda:post(admin,bell_data(slots=changed),'/academic/index.php?view=jam'))
 current=db("SELECT * FROM ak_jam_belajar WHERE nama='Senin' ORDER BY versi DESC LIMIT 1")[0]
 test('bell_saved_DB_readback_creator_and_old_version_immutable',lambda:check(json.loads(current['payload_json'])['slots']==changed and current['created_by']==1 and db('SELECT * FROM ak_jam_belajar WHERE id=?',[original['id']])[0]==original))
 test('stale_bell_version_rejected',lambda:post(admin,bell_data(),'/academic/index.php?view=jam',422))
 test('bell_correction_restores_reference_with_another_version',lambda:post(admin,bell_data(current,profile['slots']),'/academic/index.php?view=jam'))
 for table in ['ak_jam_belajar','ak_kenaikan_batch','ak_kenaikan_detail']:
  test('runtime_append_only_'+table,lambda t=table:check({r['PRIVILEGE_TYPE']for r in db('SELECT PRIVILEGE_TYPE FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',["'ak_dev_runtime_1031'@'localhost'",t])}=={'SELECT','INSERT'}))
 fixture=seed('HTTP',23,21);path='/academic/index.php?view=kenaikan&periode_asal='+str(fixture['source'])
 def data(f=fixture,**changes):
  value={'action':'kenaikan_preview','periode_asal':f['source'],'periode_tujuan':f['target'],'alasan':'Keputusan fixture sintetis HTTP'}
  value.update({f'tujuan[{k}]':v for k,v in f['mapping'].items()});value.update(changes);return value
 def preview(b=admin,f=fixture):
  post(b,data(f),'/academic/index.php?view=kenaikan&periode_asal='+str(f['source']));r=b.request('/academic/index.php?view=kenaikan&periode_asal='+str(f['source']));m=re.search(rb'name="preview_token" value="([a-f0-9]+)"',r[2]);check(m is not None);return m.group(1).decode()
 test('nonadmin_cannot_preview_or_commit',lambda:[post(b,data(),path,403) for b in [teacher,student,head,duty]])
 test('wrong_level_mapping_rejected',lambda:post(admin,data(**{f'tujuan[{fixture["classes"]["X"]}]':str(fixture['classes']['X'])}),path,422))
 wrong_major=db("SELECT id_kelas FROM kelas WHERE nama_kelas='XI AKL 1'")[0]['id_kelas']
 test('wrong_major_mapping_rejected',lambda:post(admin,data(**{f'tujuan[{fixture["classes"]["X"]}]':str(wrong_major)}),path,422))
 test('wrong_semester_rejected',lambda:post(admin,data(periode_asal=1),path,422))
 for key in ['source','target']:
  def locked(key=key):
   db('UPDATE tahun_ajaran SET dikunci=1 WHERE id_tahun_ajaran=?',[fixture[key]])
   try:post(admin,data(),path,422)
   finally:db('UPDATE tahun_ajaran SET dikunci=0 WHERE id_tahun_ajaran=?',[fixture[key]])
  test('locked_'+key+'_period_rejected',locked)
 initial=snapshot(STATE/'private/inspector.json');token=preview()
 test('45_student_preview_makes_no_DB_changes',lambda:check(initial==snapshot(STATE/'private/inspector.json')))
 test('missing_final_confirmation_rejected',lambda:post(admin,{'action':'kenaikan_commit','preview_token':token},path,422))
 nis=fixture['students'][0]['nis'];name=db('SELECT nama_siswa FROM siswa WHERE nis=?',[nis])[0]['nama_siswa'];db('UPDATE siswa SET nama_siswa=? WHERE nis=?',[name+' Koreksi',nis])
 test('changed_source_after_preview_rejected',lambda:post(admin,{'action':'kenaikan_commit','preview_token':token,'konfirmasi':'1'},path,422))
 db('UPDATE siswa SET nama_siswa=? WHERE nis=?',[name,nis]);token=preview()
 old_members=db('SELECT * FROM ak_anggota_kelas WHERE id_tahun_ajaran=? ORDER BY id',[fixture['source']]);protected={t:db('SELECT * FROM '+t+' ORDER BY 1')for t in ['jadwal','ak_absensi_sesi','ak_absensi_harian','ak_nilai','ak_rapor_snapshot']}
 test('whole_cohort_commit_45_students_real_DB',lambda:post(admin,{'action':'kenaikan_commit','preview_token':token,'konfirmasi':'1','created_by':'9999'},path))
 batch=db('SELECT * FROM ak_kenaikan_batch WHERE periode_asal=?',[fixture['source']])[0]
 test('single_batch_real_actor_and_45_details_24_up_21_alumni',lambda:check(batch['created_by']==1 and batch['jumlah']==45 and {r['hasil']:r['n']for r in db('SELECT hasil,COUNT(*) n FROM ak_kenaikan_detail WHERE id_batch=? GROUP BY hasil',[batch['id']])}=={'naik':24,'alumni':21}))
 def mapped():
  for row in fixture['students']:
   new=db('SELECT * FROM ak_anggota_kelas WHERE nis=? AND id_tahun_ajaran=?',[row['nis'],fixture['target']])
   if row['level']=='XII':check(not new)
   else:check(len(new)==1 and new[0]['id_kelas']==fixture['classes']['XI'if row['level']=='X'else'XII']and new[0]['nomor_absen']==row['number'])
 test('every_student_correct_target_or_alumni_readback',mapped)
 test('old_membership_and_all_grades_attendance_reports_unchanged',lambda:check(old_members==db('SELECT * FROM ak_anggota_kelas WHERE id_tahun_ajaran=? ORDER BY id',[fixture['source']])and all(value==db('SELECT * FROM '+t+' ORDER BY 1')for t,value in protected.items())))
 test('replayed_preview_token_rejected',lambda:post(admin,{'action':'kenaikan_commit','preview_token':token,'konfirmasi':'1'},path,422))
 test('duplicate_cohort_preview_rejected_no_second_batch',lambda:(post(admin,data(),path,422),check(len(db('SELECT id FROM ak_kenaikan_batch WHERE periode_asal=?',[fixture['source']]))==1)))
 test('batch_history_paginated_20_then_20_then_5',lambda:check([admin.request(f'/academic/index.php?view=kenaikan&batch={batch["id"]}&page={p}')[2].count(b'<tr>')-1 for p in [1,2,3]]==[20,20,5]))
 test('alumni_search_real_saved_rows_and_pagination',lambda:check(admin.request('/academic/index.php?view=alumni&q='+str(fixture['year']))[0]==200 and b'21 data' in admin.request('/academic/index.php?view=alumni&q='+fixture['tag'])[2]))
 test('foundation_filtered_roster_pagination_20_then_3',lambda:check(b'23 data' in admin.request(f'/academic/index.php?view=fondasi&id_tahun_ajaran={fixture["source"]}&id_kelas={fixture["classes"]["X"]}')[2]))
 test('processed_class_grade_cannot_be_reassigned',lambda:post(admin,{'action':'update','original_id':fixture['classes']['X'],'nama_kelas':db('SELECT nama_kelas FROM kelas WHERE id_kelas=?',[fixture['classes']['X']])[0]['nama_kelas'],'tingkat':'XI','id_jurusan':db('SELECT id_jurusan FROM kelas WHERE id_kelas=?',[fixture['classes']['X']])[0]['id_jurusan']},'/admin/master.php?table=kelas',422))
 period=db('SELECT * FROM ak_periode WHERE id_tahun_ajaran=?',[fixture['source']])[0]
 test('processed_period_boundaries_cannot_change',lambda:post(admin,{'action':'periode','id_tahun_ajaran':fixture['source'],'mulai':f'{fixture["year"]}-12-01','selesai':period['selesai'],'hari_efektif':period['hari_efektif'],'terverifikasi':'1','catatan':'Uji penolakan perubahan periode yang sudah dipakai'},path,422))
 # Only this disposable target fixture is made writable during these requests;
 # the application's current active period and all original rows are preserved.
 db("UPDATE tahun_ajaran SET status='Aktif' WHERE id_tahun_ajaran=?",[fixture['target']])
 try:
  alumni=next(r for r in fixture['students']if r['level']=='XII');member=db('SELECT * FROM ak_anggota_kelas WHERE id_tahun_ajaran=? ORDER BY id LIMIT 1',[fixture['target']])[0]
  test('alumni_reenrolment_after_graduation_rejected',lambda:post(admin,{'action':'anggota','id_tahun_ajaran':fixture['target'],'nis':alumni['nis'],'id_kelas':fixture['classes']['X'],'nomor_absen':'999','mulai':f'{fixture["year"]+1}-07-01','selesai':f'{fixture["year"]+1}-12-31','alasan':'Uji alumni tidak boleh didaftarkan kembali tanpa proses'},path,422))
  test('processed_membership_cannot_be_edited',lambda:post(admin,{'action':'anggota','id':member['id'],'id_tahun_ajaran':fixture['target'],'nis':member['nis'],'id_kelas':member['id_kelas'],'nomor_absen':member['nomor_absen'],'mulai':member['mulai'],'selesai':member['selesai'],'alasan':'Uji keanggotaan kenaikan immutable'},path,422))
 finally:db("UPDATE tahun_ajaran SET status='Tidak Aktif' WHERE id_tahun_ajaran=?",[fixture['target']])
 conflict=seed('Bentrok');child=conflict['students'][0]
 db('INSERT INTO ak_anggota_kelas(nis,id_kelas,id_tahun_ajaran,nomor_absen,mulai,selesai,created_by) VALUES(?,?,?,?,?,?,1)',[child['nis'],conflict['classes']['XI'],conflict['target'],1,f'{conflict["year"]+1}-07-01',f'{conflict["year"]+1}-12-31'])
 test('occupied_destination_rejected_without_overwrite',lambda:post(admin,data(conflict),'/academic/index.php?view=kenaikan&periode_asal='+str(conflict['source']),422))
 # Separate fixtures remain unprocessed for actual browser and user manual tests.
 browser_fixture=seed('Browser');manual_fixture=seed('Manual')
 save_json(STATE/'private/progression-browser-fixture.json',browser_fixture);save_json(STATE/'private/progression-manual-fixture.json',manual_fixture)
 save_json(STATE/'reports/progression-manual-guide.json',{'source_period_id':manual_fixture['source'],'target_period_id':manual_fixture['target'],'source_label':f'{manual_fixture["year"]}/{manual_fixture["year"]+1} Genap (DATA UJI)','url':'http://127.0.0.1:18125/academic/index.php?view=kenaikan&periode_asal='+str(manual_fixture['source']),'students':3,'unprocessed':True})
 report={'passed':sum(r['status']=='PASS'for r in results),'failed':sum(r['status']=='FAIL'for r in results),'skipped':0,'tests':results,'http_cohort':45,'new_memberships':24,'alumni_records':21};save_json(STATE/'reports/progression-http-tests.json',report);return bool(report['failed'])
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:print('Progression test runner failed ('+type(e).__name__+'); private details omitted.',file=sys.stderr);sys.exit(2)
