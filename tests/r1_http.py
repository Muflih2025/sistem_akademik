#!/usr/bin/env python3
"""R1 black-box integration tests. Writes are confined to the socket-only synthetic DB."""
import argparse,json,os,sys,secrets,time,subprocess,urllib.request,urllib.error,csv,io,zipfile,concurrent.futures,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'ops'))
from r0_environment import snapshot,save_json
from r0_http import Browser,csrf

def main():
 os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('--state',required=True);p.add_argument('--port',type=int,default=18091);a=p.parse_args();state=Path(a.state).resolve()
 config=json.loads((state/'private/runtime.json').read_text());assert config['DB_NAME']=='r1_testing_20261030' and config['APP_ENV']=='testing' and config.get('DB_SOCKET')
 creds=json.loads((state/'private/fixture-login.json').read_text());base='http://127.0.0.1:'+str(a.port);tag=secrets.token_hex(3);run=state/'security'/tag;run.mkdir(mode=0o700);config['SECURITY_STATE_PATH']=str(run);save_json(state/'private/runtime.json',config)
 results=[];ctx={};password=creds['password'];protected_legacy={}
 def db(sql,args=None):
  result=subprocess.run(['php',str(ROOT/'tests/r1_db.php'),str(state/'private/inspector.json')],input=json.dumps({'sql':sql,'args':args or []}).encode(),capture_output=True)
  if result.returncode:raise RuntimeError('Fixture helper refused/failed')
  return json.loads(result.stdout)
 def scalar(sql,args=None):
  rows=db(sql,args);return next(iter(rows[0].values()))
 def row(sql,args=None):return db(sql,args)[0]
 def check(condition,message='Unexpected result'):
  if not condition:raise AssertionError(message)
 def test(name,fn):
  try:fn();results.append({'test':name,'status':'PASS'})
  except Exception as e:results.append({'test':name,'status':'FAIL','error_type':type(e).__name__,'detail':str(e) if isinstance(e,AssertionError) else 'Private exception details redacted'})
  print(results[-1]['status']+' '+name,flush=True)
 def status(response,want):check(response[0]==want,'Unexpected HTTP status')
 def login(username,pw=password):
  b=Browser(base);page=b.request('/auth/login.php');check(page[0]==200);response=b.request('/auth/login.php','POST',{'csrf_token':csrf(page[2]),'username':username,'password':pw});status(response,302);return b
 def post(b,path,data):
  page=b.request('/auth/change_password.php');check(page[0]==200,'Authenticated form unavailable');return b.request(path,'POST',{'csrf_token':csrf(page[2]),**data})
 def submit(b,path,data,want=302):response=post(b,path,data);status(response,want);return response
 for table,pk,value in [('absensi','id_absen',1),('jurnal_kelas','id_jurnal',1),('nilai','id_nilai',2),('nilai','id_nilai',4)]:protected_legacy[(table,pk,value)]=row(f'SELECT * FROM {table} WHERE {pk}=?',[value])
 initial=snapshot(state/'private/inspector.json')
 admin=login(creds['admin']);teacher=login(creds['teacher_a']);student=login(creds['student_a']);head=login(creds['head'])
 test('auth_correct_four_roles',lambda:[status(b.request(path),200) for b,path in [(admin,'/admin/index.php'),(teacher,'/guru/index.php'),(student,'/siswa/index.php'),(head,'/kepsek/index.php')]])
 for key in ['disabled','unknown']:
  def reject(key=key):
   b=Browser(base);page=b.request('/auth/login.php');r=b.request('/auth/login.php','POST',{'csrf_token':csrf(page[2]),'username':creds.get(key,'r1_unknown_'+tag),'password':password});status(r,200);check('Username atau password salah/nonaktif.' in r[2]);status(b.request('/admin/index.php'),302)
  test('auth_reject_'+key,reject)
 test('auth_missing_csrf',lambda:status(Browser(base).request('/auth/login.php','POST',{}),419))
 def bad_password():
  b=Browser(base);page=b.request('/auth/login.php');r=b.request('/auth/login.php','POST',{'csrf_token':csrf(page[2]),'username':creds['admin'],'password':'wrong-test-password'});status(r,200);check('Username atau password salah/nonaktif.' in r[2])
 test('auth_wrong_credential_generic',bad_password)
 test('auth_csrf_array',lambda:status(admin.request('/admin/master.php?table=siswa','POST',{'csrf_token[]':'bad','action':'create'}),419))
 test('auth_csrf_invalid',lambda:status(admin.request('/admin/users.php','POST',{'csrf_token':'bad'}),419))
 test('auth_guest_endpoint',lambda:status(Browser(base).request('/admin/master.php?table=siswa'),302))
 test('auth_no_ddl_no_account_seed',lambda:check(snapshot(state/'private/inspector.json')==initial,'Auth changed database'))
 # Explicit backend object checks, including exports and request body forgery.
 for path in ['/guru/absen.php?id_jadwal=2','/guru/jurnal.php?id_jadwal=2&tanggal=2026-10-20','/guru/rekap_absen.php?id_jadwal=2','/guru/rapor.php?id_kelas=2','/guru/rapor.php?nis=0000002','/guru/rapor.php?id_kelas=1&nis=0000002','/guru/export_nilai.php?id_kelas=2&id_mapel=2&format=csv','/guru/export_nilai.php?id_kelas=1&id_mapel=2&format=csv','/guru/ekskul.php?id_kelas=2&id_ekskul=1','/guru/ekskul.php?id_kelas=1&id_ekskul=2']:
  test('idor_GET_'+path,lambda path=path:status(teacher.request(path),403))
 test('teacher_own_class',lambda:status(teacher.request('/guru/rapor.php?id_kelas=1&nis=0000001&id_tahun_ajaran=1'),200))
 test('teacher_report_subject_scope',lambda:check('Mapel Fixture B' not in teacher.request('/guru/rapor.php?id_kelas=1&nis=0000001&id_tahun_ajaran=1')[2]))
 grade={'action':'save_nilai','id_kelas':'1','id_mapel':'1','nis':'0000001','nilai_tugas':'80','nilai_uts':'80','nilai_uas':'80','nilai_praktik':'0','nilai_ekstra':'0'}
 for name,data in [('foreign_class',{'id_kelas':'2','id_mapel':'2','nis':'0000002'}),('foreign_subject',{'id_mapel':'2'}),('foreign_student',{'nis':'0000002'}),('foreign_grade_id',{'id_nilai':'2'}),('inactive_period',{'id_tahun_ajaran':'2'}),('foreign_teacher',{'id_guru':'2'})]:
  test('idor_grade_POST_'+name,lambda data=data:submit(teacher,'/guru/nilai.php',{**grade,**data},403))
 test('idor_weight_POST',lambda:submit(teacher,'/guru/nilai.php',{'action':'save_bobot','id_mapel':'2','id_kelas':'2','bobot_tugas':'30','bobot_uts':'30','bobot_uas':'40','bobot_praktik':'0','bobot_ekstra':'0'},403))
 test('idor_extracurricular_POST',lambda:submit(teacher,'/guru/ekskul.php',{'action':'save','id_kelas':'1','id_ekskul':'1','id_tahun_ajaran':'1','nis[]':'0000002','predikat[]':'Baik'},403))
 test('student_other_identity',lambda:status(student.request('/siswa/rapor.php?nis=0000002'),403))
 test('student_own_report',lambda:check('Siswa Fixture B' not in student.request('/siswa/rapor.php')[2]))
 test('student_unpublished_period_hidden',lambda:check('2025/2026' not in student.request('/siswa/rapor.php')[2]))
 test('student_cannot_mutate_teacher_endpoint',lambda:submit(student,'/guru/nilai.php',grade,403))
 test('student_own_read_endpoint_rejects_POST',lambda:submit(student,'/siswa/rapor.php',{'nis':'0000001'},405))
 test('head_read_report',lambda:status(head.request('/kepsek/akademik.php?id_kelas=1&id_tahun_ajaran=1'),200))
 test('head_cannot_edit_grades',lambda:submit(head,'/admin/nilai.php',{'action':'update_nilai','id_nilai':'1'},403))
 test('head_cannot_activate_period',lambda:submit(head,'/kepsek/tahun_ajaran.php',{'action':'activate_ta','id':'2'},405))
 test('teacher_cannot_create_users',lambda:submit(teacher,'/admin/users.php',{'action':'create','username':'x'},403))
 test('master_table_whitelist',lambda:status(admin.request('/admin/master.php?table=users'),404))
 test('invalid_GET_array_safe',lambda:status(admin.request('/admin/master.php?table=siswa&q[]=invalid'),422))
 # State refresh on every request, with no need to log out the victim first.
 def invalidate_status():
  submit(admin,'/admin/users.php',{'action':'deactivate','id_user':'50'});status(teacher.request('/guru/index.php'),302);submit(admin,'/admin/users.php',{'action':'activate','id_user':'50'})
 test('session_revoked_when_account_disabled',invalidate_status);teacher=login(creds['teacher_a'])
 def idle_timeout():
  b=login(creds['student_a']);temp={**config,'SESSION_IDLE_TIMEOUT':'1'};save_json(state/'private/runtime.json',temp)
  try:time.sleep(2);status(b.request('/siswa/index.php'),302)
  finally:save_json(state/'private/runtime.json',config)
 test('session_idle_timeout',idle_timeout)
 def throttle():
  b=Browser(base);page=b.request('/auth/login.php');token=csrf(page[2]);identity='rate_'+tag
  for _ in range(5):status(b.request('/auth/login.php','POST',{'csrf_token':token,'username':identity,'password':'wrong'}),200)
  status(b.request('/auth/login.php','POST',{'csrf_token':token,'username':identity,'password':'wrong'}),429)
 test('login_rate_limit_across_attempts',throttle)
 # Session and rate-limit checks use synthetic users and private configuration only.
 def cookie_flags():
  response=Browser(base).request('/auth/login.php');cookie=response[1].get('Set-Cookie','');check('HttpOnly' in cookie and 'SameSite=Lax' in cookie and 'secure' not in cookie.lower())
 test('cookie_localhost_httponly_samesite',cookie_flags)
 def secure_cookie():
  save_json(state/'private/runtime.json',{**config,'COOKIE_SECURE':'1'})
  try:check('secure' in Browser(base).request('/auth/login.php')[1].get('Set-Cookie','').lower())
  finally:save_json(state/'private/runtime.json',config)
 test('cookie_secure_when_explicitly_enabled',secure_cookie)
 def rotate_and_logout():
  b=Browser(base);page=b.request('/auth/login.php');old=b.session(config['SESSION_NAME']);status(b.request('/auth/login.php','POST',{'csrf_token':csrf(page[2]),'username':creds['student_a'],'password':password}),302);new=b.session(config['SESSION_NAME']);check(new and new!=old)
  submit(b,'/auth/logout.php',{});status(Browser(base).request('/siswa/index.php',headers={'Cookie':config['SESSION_NAME']+'='+new}),302)
 test('session_rotation_and_logout_old_cookie_replay_denied',rotate_and_logout)
 def absolute_timeout():
  b=login(creds['student_a']);save_json(state/'private/runtime.json',{**config,'SESSION_MAX_AGE':'1'})
  try:time.sleep(2);status(b.request('/siswa/index.php'),302)
  finally:save_json(state/'private/runtime.json',config)
 test('session_absolute_timeout',absolute_timeout)
 def parallel_login():
  attempts=[]
  for _ in range(12):
   b=Browser(base);attempts.append((b,csrf(b.request('/auth/login.php')[2])))
  def attempt(pair):
   b,token=pair;return b.request('/auth/login.php','POST',{'csrf_token':token,'username':'parallel_'+tag,'password':'incorrect'})[0]
  with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:codes=list(pool.map(attempt,attempts))
  check(codes.count(200)==5 and codes.count(429)==7)
 test('login_parallel_attempts_rate_limit_atomic',parallel_login)
 def runtime_privileges():
  grants=db('SHOW GRANTS FOR r1_runtime@localhost');text=' '.join(str(v) for r in grants for v in r.values()).upper();check('ALL PRIVILEGES' not in text and not any(x in text for x in ['GRANT CREATE','GRANT ALTER','GRANT DROP']))
  result=subprocess.run(['php',str(ROOT/'tests/r1_db.php'),str(state/'private/runtime.json')],input=json.dumps({'sql':'UPDATE audit_aktivitas SET action=action WHERE 1=0'}).encode(),capture_output=True);check(result.returncode!=0)
 test('runtime_no_ddl_and_audit_append_only',runtime_privileges)
 def canary_blocks():
  targets=[ROOT/'public'/('.r1-'+tag+'.env'),ROOT/'public'/('r1-'+tag+'.sql'),ROOT/'public'/('r1-'+tag+'.log')]
  try:
   for target in targets:
    with target.open('x') as f:f.write('PRIVATE_FIXTURE_ACCESS_CANARY')
    for method in ['GET','HEAD']:status(admin.request('/'+target.name,method),404)
  finally:
   for target in targets:
    if target.exists():target.unlink()
 test('r0_blocks_sensitive_files_physically_present_in_public',canary_blocks)
 # Core master create/update/archive via actual forms.
 def create_master(table,data,key,find,value):
  submit(admin,'/admin/master.php?table='+table,{'action':'create',**data});return scalar(f'SELECT {key} FROM {table} WHERE {find}=?',[value])
 def create_all():
  ctx['major']=create_master('jurusan',{'kode_jurusan':'J'+tag,'nama_jurusan':'Jurusan '+tag},'id_jurusan','kode_jurusan','J'+tag)
  ctx['guru']=create_master('guru',{'nip':'T-'+tag,'nama_guru':'Guru Uji '+tag,'email':'test@example.invalid','no_hp':'081234567890'},'id_guru','nip','T-'+tag)
  ctx['other_guru']=create_master('guru',{'nip':'O-'+tag,'nama_guru':'Guru Lain '+tag,'email':'','no_hp':''},'id_guru','nip','O-'+tag)
  ctx['class']=create_master('kelas',{'nama_kelas':'Kelas '+tag,'tingkat':'X','id_jurusan':str(ctx['major'])},'id_kelas','nama_kelas','Kelas '+tag)
  ctx['subject']=create_master('mata_pelajaran',{'kode_mapel':'M'+tag,'nama_mapel':'Mapel '+tag,'kelompok':'Muatan Kewilayahan','kkm':'80'},'id_mapel','kode_mapel','M'+tag)
  ctx['nis']='00'+''.join(str(secrets.randbelow(10)) for _ in range(10));ctx['student']={'nis':ctx['nis'],'nama_siswa':'Siswa '+tag,'jenis_kelamin':'P','tanggal_lahir':'2011-02-03','alamat':'Alamat fixture','id_kelas':str(ctx['class'])}
  create_master('siswa',ctx['student'],'nis','nis',ctx['nis']);check(scalar('SELECT nis FROM siswa WHERE nis=?',[ctx['nis']])==ctx['nis'])
 test('crud_create_all_core_master_and_leading_zero_nis',create_all)
 def update_all():
  submit(admin,'/admin/master.php?table=guru',{'action':'update','original_id':str(ctx['guru']),'nip':'T-'+tag,'nama_guru':'Guru Edit '+tag,'email':'changed@example.invalid','no_hp':'081234567899'})
  submit(admin,'/admin/master.php?table=kelas',{'action':'update','original_id':str(ctx['class']),'nama_kelas':'Edit '+tag,'tingkat':'XI','id_jurusan':str(ctx['major'])})
  submit(admin,'/admin/master.php?table=mata_pelajaran',{'action':'update','original_id':str(ctx['subject']),'kode_mapel':'M'+tag,'nama_mapel':'Mapel Edit '+tag,'kelompok':'Produktif','kkm':'82'})
  ctx['student']['nama_siswa']='Siswa Edit '+tag;submit(admin,'/admin/master.php?table=siswa',{'action':'update','original_id':ctx['nis'],**ctx['student']})
  check(scalar('SELECT nama_siswa FROM siswa WHERE nis=?',[ctx['nis']])==ctx['student']['nama_siswa']);check(scalar("SELECT nama_siswa FROM siswa WHERE nis='0000001'")=='Siswa Fixture A')
 test('crud_update_only_targeted_rows',update_all)
 test('crud_nis_duplicate',lambda:submit(admin,'/admin/master.php?table=siswa',{'action':'create',**ctx['student']},422))
 test('crud_nis_identity_immutable',lambda:submit(admin,'/admin/master.php?table=siswa',{'action':'update','original_id':ctx['nis'],**ctx['student'],'nis':'001234567'},422))
 for name,delta in [('invalid_nis',{'nis':'1 OR 1=1'}),('invalid_date',{'nis':'009990000001','tanggal_lahir':'2026-02-30'}),('future_birth',{'nis':'009990000002','tanggal_lahir':'2099-01-01'}),('invalid_class',{'nis':'009990000003','id_kelas':'999999'}),('array_name',{'nis':'009990000004','nama_siswa[]':'invalid'})]:
  test('crud_student_'+name,lambda delta=delta:submit(admin,'/admin/master.php?table=siswa',{'action':'create',**{k:v for k,v in ctx['student'].items() if k!='nama_siswa' or 'nama_siswa[]' not in delta},**delta},422))
 test('crud_update_nonexistent_no_false_success',lambda:submit(admin,'/admin/master.php?table=guru',{'action':'update','original_id':'999999'},404))
 test('crud_invalid_email',lambda:submit(admin,'/admin/master.php?table=guru',{'action':'create','nip':'BAD'+tag,'nama_guru':'Fixture','email':'not-email','no_hp':''},422))
 test('crud_mapel_enum_validation',lambda:submit(admin,'/admin/master.php?table=mata_pelajaran',{'action':'create','kode_mapel':'X'+tag,'nama_mapel':'Invalid','kelompok':'Umum','kkm':'75'},422))
 test('crud_search_filter',lambda:check(ctx['student']['nama_siswa'] in admin.request('/admin/master.php?table=siswa&q='+ctx['nis']+'&id_kelas='+str(ctx['class'])+'&id_jurusan='+str(ctx['major']))[2]))
 def pagination():
  for i in range(22):create_master('kelas',{'nama_kelas':'P'+tag+str(i),'tingkat':'X','id_jurusan':str(ctx['major'])},'id_kelas','nama_kelas','P'+tag+str(i))
  r=admin.request('/admin/master.php?table=kelas&q=P'+tag+'&page=2');status(r,200);check('halaman 2 dari 2' in r[2])
 test('crud_pagination_real_rows',pagination)
 # Related extracurricular assignment also rejects false-success and archives safely.
 def extracurricular_admin():
  data={'nama_ekskul':'Klub '+tag,'pembina':'Pembina fixture','deskripsi':'Kegiatan sintetis','id_guru_pembina':str(ctx['guru'])}
  submit(admin,'/admin/ekskul.php',{'action':'save',**data});activity=scalar('SELECT id_ekskul FROM ekstrakurikuler WHERE nama_ekskul=?',[data['nama_ekskul']]);submit(admin,'/admin/ekskul.php',{'action':'save','id_ekskul':str(activity),**data,'deskripsi':'Diperbarui'})
  check(scalar('SELECT deskripsi FROM ekstrakurikuler WHERE id_ekskul=?',[activity])=='Diperbarui');submit(admin,'/admin/ekskul.php',{'action':'save',**data},422);submit(admin,'/admin/ekskul.php',{'action':'save','id_ekskul':'999999',**data},404);submit(admin,'/admin/ekskul.php',{'action':'delete','id_ekskul':str(activity)});check(scalar('SELECT status FROM ekstrakurikuler WHERE id_ekskul=?',[activity])=='nonaktif')
 test('extracurricular_assignment_crud_archive_and_no_false_success',extracurricular_admin)
 test('extracurricular_nested_array_rejected_without_warning',lambda:submit(teacher,'/guru/ekskul.php',{'action':'save','id_kelas':'1','id_ekskul':'1','id_tahun_ajaran':'1','nis[0][nested]':'0000001','predikat[0]':'Baik'},422))
 # Users: no automatic account, verified references, explicit secure password and revocation.
 def create_user():
  check(scalar('SELECT COUNT(*) FROM users WHERE role=? AND id_referensi=?',['guru',str(ctx['guru'])])==0)
  ctx['user_name']='r1_'+tag+'_teacher';ctx['user_data']={'username':ctx['user_name'],'role':'guru','id_referensi':str(ctx['guru']),'status':'aktif','password':password}
  submit(admin,'/admin/users.php',{'action':'create',**ctx['user_data']});ctx['user']=scalar('SELECT id_user FROM users WHERE username=?',[ctx['user_name']]);ctx['teacher']=login(ctx['user_name'])
 test('users_create_with_valid_reference_no_default_account',create_user)
 test('users_duplicate_reference',lambda:submit(admin,'/admin/users.php',{'action':'create',**ctx['user_data'],'username':'dupe_'+tag},422))
 test('users_bad_reference',lambda:submit(admin,'/admin/users.php',{'action':'create',**ctx['user_data'],'username':'bad_'+tag,'id_referensi':'999999'},422))
 test('users_bad_role',lambda:submit(admin,'/admin/users.php',{'action':'create',**ctx['user_data'],'username':'role_'+tag,'role':'superadmin'},422))
 test('users_reference_numeric_coercion_rejected',lambda:submit(admin,'/admin/users.php',{'action':'create',**ctx['user_data'],'username':'coerce_'+tag,'id_referensi':'1abc'},422))
 test('users_reference_alias_rejected',lambda:submit(admin,'/admin/users.php',{'action':'create',**ctx['user_data'],'username':'alias_'+tag,'id_referensi':'01'},422))
 test('users_duplicate_username',lambda:submit(admin,'/admin/users.php',{'action':'create','username':creds['admin'],'role':'admin','status':'aktif','id_referensi':'','password':password},422))
 test('users_reject_common_password',lambda:submit(admin,'/admin/users.php',{'action':'create','username':'weak_'+tag,'role':'admin','status':'aktif','id_referensi':'','password':'password123'},422))
 def update_user():
  victim=ctx['teacher'];submit(admin,'/admin/users.php',{'action':'update','id_user':str(ctx['user']),**ctx['user_data'],'username':ctx['user_name']+'_e','password':''});status(victim.request('/guru/index.php'),302);ctx['user_name']+='_e';ctx['user_data']['username']=ctx['user_name'];ctx['teacher']=login(ctx['user_name'])
 test('users_update_identity_revokes_session',update_user)
 def role_change():
  victim=ctx['teacher'];submit(admin,'/admin/users.php',{'action':'update','id_user':str(ctx['user']),**ctx['user_data'],'role':'kepala_sekolah','id_referensi':'','password':''});status(victim.request('/guru/index.php'),302)
  submit(admin,'/admin/users.php',{'action':'update','id_user':str(ctx['user']),**ctx['user_data'],'password':''});ctx['teacher']=login(ctx['user_name'])
 test('users_role_change_revokes_session',role_change)
 def reference_change():
  victim=ctx['teacher'];submit(admin,'/admin/users.php',{'action':'update','id_user':str(ctx['user']),**ctx['user_data'],'id_referensi':str(ctx['other_guru']),'password':''});status(victim.request('/guru/index.php'),302)
  submit(admin,'/admin/users.php',{'action':'update','id_user':str(ctx['user']),**ctx['user_data'],'password':''});ctx['teacher']=login(ctx['user_name'])
 test('users_reference_change_revokes_session',reference_change)
 def reset_password():
  victim=ctx['teacher'];new=secrets.token_hex(20);submit(admin,'/admin/users.php',{'action':'reset','id_user':str(ctx['user']),'password':new});status(victim.request('/guru/index.php'),302);ctx['new_password']=new;ctx['teacher']=login(ctx['user_name'],new)
 test('users_explicit_password_reset_revokes_session',reset_password)
 def self_password():
  victim=ctx['teacher'];second=login(ctx['user_name'],ctx['new_password']);new=secrets.token_hex(20)
  submit(victim,'/auth/change_password.php',{'old_password':ctx['new_password'],'new_password':new,'confirm_password':new});status(second.request('/guru/index.php'),302);ctx['new_password']=new;ctx['teacher']=login(ctx['user_name'],new)
 test('self_password_change_revokes_all_sessions',self_password)
 def last_admin():
  submit(admin,'/admin/users.php',{'action':'deactivate','id_user':'2'});submit(admin,'/admin/users.php',{'action':'deactivate','id_user':'1'},422);check(scalar('SELECT status FROM users WHERE id_user=1')=='aktif');submit(admin,'/admin/users.php',{'action':'activate','id_user':'2'})
 test('users_last_admin_protected',last_admin)
 # Schedule and assignment share the existing relational entity.
 def schedule_create():
  ctx['schedule_data']={'id_guru':str(ctx['guru']),'id_mapel':str(ctx['subject']),'id_kelas':str(ctx['class']),'id_tahun_ajaran':'1','hari':'Jumat','jam_mulai':'14:00','jam_selesai':'15:00','ruang':'R'+tag}
  submit(admin,'/admin/jadwal.php',{'action':'create',**ctx['schedule_data']});ctx['schedule']=scalar('SELECT id_jadwal FROM jadwal WHERE id_guru=? AND id_kelas=?',[ctx['guru'],ctx['class']])
 test('schedule_create_and_teacher_assignment',schedule_create)
 def schedule_update():
  ctx['schedule_data'].update({'jam_mulai':'14:30','jam_selesai':'15:30'});submit(admin,'/admin/jadwal.php',{'action':'update','id_jadwal':str(ctx['schedule']),**ctx['schedule_data']});check(scalar('SELECT jam_mulai FROM jadwal WHERE id_jadwal=?',[ctx['schedule']])=='14:30:00')
 test('schedule_update',schedule_update)
 for label,delta in [('duplicate',{}),('teacher_overlap',{'id_kelas':'3','ruang':'Other'}),('class_overlap',{'id_guru':'2','ruang':'Other'}),('room_overlap',{'id_guru':'2','id_kelas':'3'}),('invalid_order',{'jam_selesai':'13:00'}),('inactive_year',{'id_tahun_ajaran':'2'}),('invalid_fk',{'id_guru':'999999'})]:
  test('schedule_'+label,lambda delta=delta:submit(admin,'/admin/jadwal.php',{'action':'create',**ctx['schedule_data'],**delta},422))
 def assignment_alias():
  submit(admin,'/admin/penugasan.php',{'action':'create',**ctx['schedule_data'],'jam_mulai':'15:30','jam_selesai':'16:00'});ctx['adjacent']=scalar('SELECT MAX(id_jadwal) FROM jadwal');submit(admin,'/admin/penugasan.php',{'action':'deactivate','id_jadwal':str(ctx['adjacent'])});check(scalar('SELECT status FROM jadwal WHERE id_jadwal=?',[ctx['adjacent']])=='nonaktif')
 test('assignment_alias_adjacent_and_archive',assignment_alias)
 def weights_valid():
  data={'action':'save_bobot','id_kelas':str(ctx['class']),'id_mapel':str(ctx['subject']),'bobot_tugas':'10','bobot_uts':'20','bobot_uas':'70','bobot_praktik':'0','bobot_ekstra':'0','nama_ekstra':'Fixture'}
  for task,exam,final in [('10','20','70'),('20','30','50')]:submit(ctx['teacher'],'/guru/nilai.php',{**data,'bobot_tugas':task,'bobot_uts':exam,'bobot_uas':final})
  check(scalar('SELECT COUNT(*) FROM bobot_penilaian WHERE id_guru=? AND id_mapel=? AND id_kelas=?',[ctx['guru'],ctx['subject'],ctx['class']])==1)
  submit(ctx['teacher'],'/guru/nilai.php',{**data,'bobot_tugas':'101'},422)
 test('weights_scoped_create_update_no_duplicate_and_validation',weights_valid)
 def export_metadata_formula():
  data={'action':'update','original_id':str(ctx['class']),'nama_kelas':'=1+1','tingkat':'XI','id_jurusan':str(ctx['major'])}
  try:
   submit(admin,'/admin/master.php?table=kelas',data)
   r=ctx['teacher'].request('/guru/export_nilai.php?'+urllib.parse.urlencode({'id_kelas':ctx['class'],'id_mapel':ctx['subject'],'format':'csv'}));status(r,200);check(list(csv.reader(io.StringIO(r[2])))[1][1]=="'=1+1")
  finally:submit(admin,'/admin/master.php?table=kelas',{**data,'nama_kelas':'Edit '+tag})
 test('export_csv_metadata_formula_escaped',export_metadata_formula)
 # Identity: numerical teacher ID is intentionally different from users.id_user.
 attendance={'action':'save','id_jadwal':'1','tanggal':'2026-10-26','nis':'0000001','status':'Hadir','keterangan':'Fixture R1'}
 test('attendance_foreign_schedule_POST',lambda:submit(teacher,'/guru/absen.php',{**attendance,'id_jadwal':'2','nis':'0000002','tanggal':'2026-10-27'},403))
 test('attendance_foreign_student_POST',lambda:submit(teacher,'/guru/absen.php',{**attendance,'nis':'0000002'},403))
 test('attendance_wrong_record_id',lambda:submit(teacher,'/guru/absen.php',{**attendance,'id_absen':'2'},403))
 test('attendance_closed_period',lambda:submit(teacher,'/guru/absen.php',{**attendance,'id_jadwal':'4'},403))
 test('attendance_unknown_legacy_period_no_guess',lambda:submit(teacher,'/guru/absen.php',{**attendance,'id_jadwal':'5','tanggal':'2026-10-22'},422))
 test('attendance_wrong_weekday',lambda:submit(teacher,'/guru/absen.php',{**attendance,'tanggal':'2026-10-27'},422))
 def attendance_identity():
  submit(teacher,'/guru/absen.php',{**attendance,'created_by':'1'});record=row("SELECT * FROM absensi WHERE id_jadwal=1 AND tanggal='2026-10-26' AND nis='0000001'");check(record['created_by']==50 and record['created_by']!=1);ctx['attendance']=record['id_absen']
  submit(teacher,'/guru/absen.php',{**attendance,'status':'Sakit','id_absen':str(record['id_absen'])});check(scalar("SELECT COUNT(*) FROM absensi WHERE id_jadwal=1 AND tanggal='2026-10-26' AND nis='0000001'")==1)
  status(teacher.request('/guru/absen.php?id_jadwal=1&tanggal=2026-10-26'),200);check(scalar('SELECT COUNT(*) FROM audit_aktivitas WHERE entity=? AND record_id=? AND actor_id=50',['absensi',str(record['id_absen'])])>=2)
 test('attendance_user_identity_upsert_read_and_audit',attendance_identity)
 test('attendance_delete_denied_archive_preserved',lambda:submit(teacher,'/guru/absen.php',{**attendance,'action':'delete','id_absen':str(ctx['attendance'])},403))
 def journal_payload(date):
  roster=db("SELECT nis FROM siswa WHERE id_kelas=1 AND status='aktif'");data={'action':'save_jurnal','id_jadwal':'1','tanggal':date,'pertemuan_ke':'2','materi':'Materi transaksi R1','kegiatan':'Kegiatan berbeda','refleksi':'Refleksi berbeda','catatan':'Catatan','jam_ke':'1','guru_pengganti':''}
  for r in roster:data['status_custom['+r['nis']+']']='Hadir';data['ket_custom['+r['nis']+']']=''
  return data
 def journal_success():
  submit(teacher,'/guru/jurnal.php',journal_payload('2026-10-26'));record=row("SELECT * FROM jurnal_kelas WHERE id_jadwal=1 AND tanggal='2026-10-26'");check(record['kegiatan']!=record['refleksi']);check(scalar("SELECT COUNT(*) FROM absensi WHERE id_jadwal=1 AND tanggal='2026-10-26' AND created_by<>50")==0)
 test('journal_and_attendance_atomic_success',journal_success)
 def journal_missing():
  data=journal_payload('2026-10-12');data.pop('status_custom[0000003]');submit(teacher,'/guru/jurnal.php',data,422);check(scalar("SELECT COUNT(*) FROM jurnal_kelas WHERE id_jadwal=1 AND tanggal='2026-10-12'")==0)
 test('journal_missing_roster_not_assumed_present',journal_missing)
 def journal_rollback():
  before_count=scalar('SELECT COUNT(*) FROM audit_aktivitas');db("CREATE TRIGGER r1_test_fail BEFORE INSERT ON absensi FOR EACH ROW BEGIN IF NEW.nis='0000003' AND NEW.tanggal='2026-10-12' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture forced failure'; END IF; END")
  try:
   response=submit(teacher,'/guru/jurnal.php',journal_payload('2026-10-12'),500);check('SQLSTATE' not in response[2] and 'fixture forced failure' not in response[2]);check(scalar("SELECT COUNT(*) FROM jurnal_kelas WHERE id_jadwal=1 AND tanggal='2026-10-12'")==0);check(scalar("SELECT COUNT(*) FROM absensi WHERE id_jadwal=1 AND tanggal='2026-10-12'")==0);check(scalar('SELECT COUNT(*) FROM audit_aktivitas')==before_count)
  finally:db('DROP TRIGGER IF EXISTS r1_test_fail')
 test('journal_mid_transaction_failure_rolls_back_everything',journal_rollback)
 # Final-review regression: NULL periods must not expand read access across years.
 def legacy_read_scope():
  schedules=db('SELECT id_jadwal,status FROM jadwal WHERE id_guru=1 AND id_tahun_ajaran IS NOT NULL')
  try:
   db("UPDATE jadwal SET status='nonaktif' WHERE id_guru=1 AND id_tahun_ajaran IS NOT NULL")
   for path in ['/guru/rapor.php?id_kelas=1&nis=0000001&id_tahun_ajaran=1','/guru/rapor.php?id_kelas=1&nis=0000001&id_tahun_ajaran=2','/guru/export_nilai.php?id_kelas=1&id_mapel=1&id_tahun_ajaran=1&format=csv','/guru/ekskul.php?id_kelas=1&id_tahun_ajaran=1&id_ekskul=1']:status(teacher.request(path),403)
   body=teacher.request('/guru/nilai.php')[2];check('Daftar Nilai Tersimpan (0 Siswa)' in body);submit(teacher,'/guru/nilai.php',grade,403)
   status(teacher.request('/guru/absen.php?id_jadwal=5&tanggal=2026-10-29'),200)
  finally:
   for schedule in schedules:db('UPDATE jadwal SET status=? WHERE id_jadwal=?',[schedule['status'],schedule['id_jadwal']])
 test('legacy_null_period_does_not_authorize_grades_exports_or_reports',legacy_read_scope)
 def report_attendance_scope():
  ids=[]
  try:
   for schedule,date in [(3,'2026-10-07'),(4,'2026-10-05'),(5,'2026-10-08')]:
    item=db("INSERT INTO absensi(tanggal,nis,id_jadwal,status,created_by) VALUES(?,'0000001',?,'Alpa',50)",[date,schedule]);ids.append(item['id'])
   body=teacher.request('/guru/rapor.php?id_kelas=1&nis=0000001&id_tahun_ajaran=1')[2];check(re.search(r'<td>Alpa</td><td[^>]*>0 hari</td>',body) is not None)
   body=student.request('/siswa/rapor.php?id_tahun_ajaran=1')[2];check(re.search(r'Alpa / Tanpa Keterangan \(A\)</td>\s*<td[^>]*>1 Hari</td>',body) is not None)
  finally:
   for identity in ids:db('DELETE FROM absensi WHERE id_absen=?',[identity])
 test('report_attendance_excludes_unknown_period_and_other_teacher_scope',report_attendance_scope)
 def report_other_owner():
  schedule=db("INSERT INTO jadwal(id_guru,id_mapel,id_kelas,hari,jam_mulai,jam_selesai,id_tahun_ajaran) VALUES(1,2,1,'Jumat','17:00','18:00',1)")['id']
  try:
   body=teacher.request('/guru/rapor.php?id_kelas=1&nis=0000001&id_tahun_ajaran=1')[2];check('Mapel Fixture B' not in body)
   response=teacher.request('/guru/export_nilai.php?id_kelas=1&id_mapel=2&id_tahun_ajaran=1&format=csv');status(response,200)
   rows=list(csv.reader(io.StringIO(response[2])));record=next(r for r in rows if len(r)>3 and r[1]=='0000001');check(record[4:8]==['0','0','0','0'])
  finally:db('DELETE FROM jadwal WHERE id_jadwal=?',[schedule])
 test('report_and_export_do_not_disclose_grade_owned_by_other_teacher',report_other_owner)
 test('student_draft_period_URL_denied',lambda:status(student.request('/siswa/rapor.php?id_tahun_ajaran=2'),403))
 test('student_draft_period_POST_denied',lambda:submit(student,'/siswa/rapor.php',{'id_tahun_ajaran':'2','nis':'0000001'},405))
 test('student_foreign_period_identity_denied',lambda:status(student.request('/siswa/rapor.php?id_tahun_ajaran=1&nis=0000002'),403))
 test('supervisor_report_POST_denied',lambda:submit(head,'/kepsek/rapor.php',{'nis':'0000001','id_tahun_ajaran':'1'},405))
 test('supervisor_conflicting_class_identity_denied',lambda:status(head.request('/kepsek/rapor.php?id_kelas=2&nis=0000001&id_tahun_ajaran=1'),403))
 # Period/publication control and numeric validation.
 def period_data():return {k:str(v) for k,v in row('SELECT * FROM tahun_ajaran WHERE id_tahun_ajaran=1').items()}
 def period_lock():
  before=period_data();submit(admin,'/admin/tahun_ajaran.php',{**before,'action':'update','dikunci':'1'});submit(teacher,'/guru/nilai.php',grade,403);submit(admin,'/admin/nilai.php',{'action':'update_nilai','id_nilai':'1','nilai_tugas':'99'},403);submit(admin,'/admin/tahun_ajaran.php',{**before,'action':'update'})
 test('locked_period_denies_teacher_and_admin_grade_writes',period_lock)
 def publication():
  before=period_data();submit(admin,'/admin/tahun_ajaran.php',{**before,'action':'update','rapor_diterbitkan':'0'});body=student.request('/siswa/rapor.php')[2];check('Mapel Fixture A' not in body and 'Mapel Fixture B' not in body);submit(admin,'/admin/tahun_ajaran.php',{**before,'action':'update'})
 test('student_report_publication_gate',publication)
 test('period_invalid_activation_preserves_active',lambda:submit(admin,'/admin/tahun_ajaran.php',{'action':'activate','id_tahun_ajaran':'999999'},404))
 for value in ['-1','101','abc']:
  test('grade_numeric_validation_'+value,lambda value=value:submit(teacher,'/guru/nilai.php',{**grade,'nilai_tugas':value},422))
 def grade_valid():
  submit(teacher,'/guru/nilai.php',{**grade,'nilai_tugas':'0'});check(float(scalar('SELECT nilai_tugas FROM nilai WHERE id_nilai=1'))==0);submit(teacher,'/guru/nilai.php',grade)
 test('grade_zero_valid_and_existing_record_preserved',grade_valid)
 # New student's history survives master deactivation, schedule identity cannot be overwritten.
 def new_history():
  data={'action':'save_nilai','id_kelas':str(ctx['class']),'id_mapel':str(ctx['subject']),'nis':ctx['nis'],'nilai_tugas':'88','nilai_uts':'88','nilai_uas':'88','nilai_praktik':'0','nilai_ekstra':'0'}
  submit(ctx['teacher'],'/guru/nilai.php',data);submit(admin,'/admin/jadwal.php',{'action':'update','id_jadwal':str(ctx['schedule']),**ctx['schedule_data'],'jam_mulai':'13:30'},422);submit(ctx['teacher'],'/guru/absen.php',{'action':'save','id_jadwal':str(ctx['schedule']),'tanggal':'2026-10-30','nis':ctx['nis'],'status':'Hadir','keterangan':'Synthetic history'})
  check(scalar('SELECT created_by FROM absensi WHERE nis=?',[ctx['nis']])==ctx['user'])
 test('new_history_foreign_keys_and_actor',new_history)
 test('schedule_history_binding_immutable',lambda:submit(admin,'/admin/jadwal.php',{'action':'update','id_jadwal':str(ctx['schedule']),**ctx['schedule_data'],'jam_mulai':'13:30'},422))
 test('student_history_class_not_rewritten',lambda:submit(admin,'/admin/master.php?table=siswa',{'action':'update','original_id':ctx['nis'],**ctx['student'],'id_kelas':'3'},422))
 def archive_history():
  grade_row=row('SELECT * FROM nilai WHERE nis=?',[ctx['nis']]);attendance_row=row('SELECT * FROM absensi WHERE nis=?',[ctx['nis']])
  for table,key in [('siswa',ctx['nis']),('mata_pelajaran',ctx['subject']),('kelas',ctx['class']),('guru',ctx['guru'])]:submit(admin,'/admin/master.php?table='+table,{'action':'deactivate','original_id':str(key)})
  check(row('SELECT * FROM nilai WHERE nis=?',[ctx['nis']])==grade_row);check(row('SELECT * FROM absensi WHERE nis=?',[ctx['nis']])==attendance_row);check(scalar('SELECT COUNT(*) FROM jadwal WHERE id_jadwal=?',[ctx['schedule']])==1);status(ctx['teacher'].request('/guru/index.php'),302)
 test('archive_master_preserves_history_and_revokes_linked_account',archive_history)
 # Import validation and full-batch rollback, including XLSX sparse/inline strings.
 def upload(content,name):
  token=csrf(admin.request('/auth/change_password.php')[2]);boundary='r1'+secrets.token_hex(12);parts=[]
  for key,value in [('csrf_token',token),('target_import','siswa')]:parts.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="'+key+'"\r\n\r\n'+value+'\r\n').encode())
  parts.append(('--'+boundary+'\r\nContent-Disposition: form-data; name="file_data"; filename="'+name+'"\r\nContent-Type: application/octet-stream\r\n\r\n').encode()+content+b'\r\n');parts.append(('--'+boundary+'--\r\n').encode());req=urllib.request.Request(base+'/admin/export_import.php',data=b''.join(parts),method='POST',headers={'Content-Type':'multipart/form-data; boundary='+boundary})
  try:r=admin.opener.open(req,timeout=10)
  except urllib.error.HTTPError as e:r=e
  with r:return r.status,r.headers,r.read().decode(errors='replace')
 def import_csv():
  nis='00'+''.join(str(secrets.randbelow(10)) for _ in range(10));content=('NIS,Nama Siswa,Jenis Kelamin,Kelas,Tanggal Lahir,Alamat\n'+nis+',Impor '+tag+',L,Kelas Fixture A,2011-03-01,Alamat\n').encode();status(upload(content,'fixture.csv'),302);check(scalar('SELECT COUNT(*) FROM siswa WHERE nis=?',[nis])==1);check(scalar('SELECT COUNT(*) FROM users WHERE id_referensi=?',[nis])==0)
 test('import_valid_csv_no_default_account',import_csv)
 def import_rollback():
  nis='00'+''.join(str(secrets.randbelow(10)) for _ in range(10));content=('NIS,Nama Siswa,Jenis Kelamin,Kelas,Tanggal Lahir,Alamat\n'+nis+',Rollback '+tag+',L,Kelas Fixture A,2011-03-01,Alamat\n009991111111,Invalid,L,Kelas Tidak Dikenal,2011-03-01,Alamat\n').encode();status(upload(content,'rollback.csv'),422);check(scalar('SELECT COUNT(*) FROM siswa WHERE nis=?',[nis])==0)
 test('import_batch_rollback_unknown_class',import_rollback)
 def import_xlsx():
  nis='00'+''.join(str(secrets.randbelow(10)) for _ in range(10));headers=['NIS','Nama Siswa','Jenis Kelamin','Kelas','Tanggal Lahir','Alamat'];values=[nis,'XLSX '+tag,'P','Kelas Fixture A','2011-03-02',''];rows=[]
  for n,items in enumerate([headers,values],1):
   cells=[]
   for i,v in enumerate(items):
    if v=='':continue
    cells.append('<c r="'+chr(65+i)+str(n)+'" t="inlineStr"><is><t>'+v+'</t></is></c>')
   rows.append('<row r="'+str(n)+'">'+''.join(cells)+'</row>')
  memory=io.BytesIO()
  with zipfile.ZipFile(memory,'w') as z:z.writestr('xl/worksheets/sheet1.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+''.join(rows)+'</sheetData></worksheet>')
  status(upload(memory.getvalue(),'fixture.xlsx'),302);check(scalar('SELECT COUNT(*) FROM siswa WHERE nis=?',[nis])==1)
 test('import_inline_sparse_xlsx_leading_zero',import_xlsx)
 # R0 protections and cross-role regression remain intact after mutations.
 for path in ['/db_sia_smkn2_magelang.sql','/.git/config','/.env','/adminer.php','/db.php','/config/config.php','/ops/migrate_r1.php','/tests/r1_db.php','/%2e%2e/config/config.php']:
  for method in ['GET','HEAD']:test('r0_block_'+method+'_'+path,lambda path=path,method=method:status(admin.request(path,method),404))
 routes=json.loads(subprocess.check_output(['php','-r','echo json_encode(require $argv[1]);',str(ROOT/'config/web_routes.php')]))
 for role,account in [('admin','admin'),('guru','teacher_a'),('siswa','student_a'),('kepala_sekolah','head')]:
  b=login(creds[account])
  for path,entry in routes.items():
   if entry.get('role')==role:test('regression_route_'+role+'_'+path,lambda b=b,path=path:status(b.request(path),200))
  test('regression_logout_'+role,lambda b=b:submit(b,'/auth/logout.php',{}))
 for role,b,path in [('teacher',teacher,'/guru/export_nilai.php?id_kelas=1&id_mapel=1&format=csv'),('admin',admin,'/admin/export_nilai.php?id_kelas=1&id_mapel=1&format=csv')]:
  def export(b=b,path=path):r=b.request(path);status(r,200);check('text/csv' in r[1].get('Content-Type',''));check('0000001' in r[2])
  test('regression_export_'+role,export)
 test('legacy_ambiguous_identity_and_foreign_history_not_repaired_by_guess',lambda:[check(row(f'SELECT * FROM {table} WHERE {pk}=?',[value])==before) for (table,pk,value),before in protected_legacy.items()])
 test('audit_no_password_or_auth_secrets',lambda:check(password not in json.dumps(db('SELECT before_json,after_json FROM audit_aktivitas')) and scalar("SELECT COUNT(*) FROM audit_aktivitas WHERE before_json LIKE '%\\\"password\\\"%' OR after_json LIKE '%\\\"password\\\"%'")==0))
 test('foreign_keys_no_orphan_attendance',lambda:check(scalar('SELECT COUNT(*) FROM absensi a LEFT JOIN users u ON u.id_user=a.created_by LEFT JOIN siswa s ON s.nis=a.nis LEFT JOIN jadwal j ON j.id_jadwal=a.id_jadwal WHERE u.id_user IS NULL OR s.nis IS NULL OR j.id_jadwal IS NULL')==0))
 errors=(state/'logs/php-errors.log').read_text(errors='replace') if (state/'logs/php-errors.log').exists() else ''
 test('no_php_fatal_errors',lambda:check('PHP Fatal error' not in errors and 'PHP Parse error' not in errors and 'Uncaught ' not in errors))
 results.append({'test':'nisn_validation_not_applicable_no_nisn_column','status':'SKIP','reason':'Existing schema does not use NISN; no invented identifier column.'})
 report={'tests':results,'passed':sum(t['status']=='PASS' for t in results),'failed':sum(t['status']=='FAIL' for t in results),'skipped':sum(t['status']=='SKIP' for t in results),'fixture_only':True,'run':tag,'port':a.port}
 save_json(state/'reports'/('http-tests-'+tag+'.json'),report);save_json(state/'reports/http-tests-latest.json',report)
 print(str(report['passed'])+' PASS, '+str(report['failed'])+' FAIL, '+str(report['skipped'])+' SKIP')
 for t in results:
  if t['status']=='FAIL':print('FAIL '+t['test']+': '+t.get('detail',''))
 return 1 if report['failed'] else 0
if __name__=='__main__':sys.exit(main())
