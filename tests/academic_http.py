#!/usr/bin/env python3
"""Real HTTP/PDO integration against the new synthetic database only.

Repeatable: unique master fixtures per run, optimistic revisions loaded anew,
no reset/delete of fixtures, historical databases never selected by this runner.
"""
import csv
import hashlib
import http.cookiejar
import io
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from openpyxl import Workbook,load_workbook

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'ops'))
sys.path.insert(0,str(ROOT/'tests'))
from r0_environment import snapshot,save_json
from r0_http import NoRedirect,csrf
STATE=Path('/home/muflih/.local/state/sia-academic-dev/20261031')
BASE='http://127.0.0.1:18125'

class Browser:
    def __init__(self):
        self.jar=http.cookiejar.CookieJar()
        self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar),NoRedirect())
    def request(self,path,method='GET',data=None,headers=None):
        payload=urllib.parse.urlencode(data).encode() if isinstance(data,dict) else data
        req=urllib.request.Request(BASE+path,data=payload,method=method,headers=headers or {})
        try:r=self.opener.open(req,timeout=40)
        except urllib.error.HTTPError as e:r=e
        with r:return r.status,r.headers,r.read()

def main():
    os.umask(0o077)
    runtime=json.loads((STATE/'private/runtime.json').read_text())
    assert runtime['DB_NAME']=='sia_academic_dev_20261031' and runtime['APP_ENV']=='testing' and runtime.get('DB_SOCKET') and runtime['DB_USER']!='root'
    tag=secrets.token_hex(3);security=STATE/'security'/tag;security.mkdir(mode=0o700);runtime['SECURITY_STATE_PATH']=str(security);save_json(STATE/'private/runtime.json',runtime)
    refreshed=subprocess.run(['python3',str(ROOT/'ops/academic_server.py'),'refresh'],capture_output=True);assert refreshed.returncode==0,'Protected local runtime refresh failed'
    creds=json.loads((STATE/'private/test-accounts.json').read_text());results=[]
    def test(name,fn):
        try:fn();results.append({'test':name,'status':'PASS'})
        except Exception as e:results.append({'test':name,'status':'FAIL','error_type':type(e).__name__,'detail':str(e) if isinstance(e,AssertionError) else 'Private exception detail omitted'})
        print(results[-1]['status']+' '+name,flush=True)
    def check(value,message='Expected condition not met'):
        if not value:raise AssertionError(message)
    def status(response,want):check(response[0]==want,'HTTP '+str(response[0])+' expected '+str(want))
    def db(sql,args=None,config='inspector.json',success=True):
        r=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private'/config)],input=json.dumps({'sql':sql,'args':args or []}).encode(),capture_output=True)
        if not success:check(r.returncode!=0);return None
        if r.returncode:raise RuntimeError('Synthetic query refused/failed')
        return json.loads(r.stdout)
    def scalar(sql,args=None):return next(iter(db(sql,args)[0].values()))
    def one(sql,args=None):return next(iter(db(sql,args)),None)
    def login(key):
        b=Browser();page=b.request('/auth/login.php');status(page,200)
        status(b.request('/auth/login.php','POST',{'csrf_token':csrf(page[2].decode()),'username':creds.get(key,key),'password':creds['password']}),302);return b
    def post(b,data,path='/academic/index.php?view=beranda',want=302):
        page=b.request('/auth/change_password.php');status(page,200)
        response=b.request(path,'POST',{'csrf_token':csrf(page[2].decode()),**data});status(response,want);return response
    def get(b,view,**params):return b.request('/academic/index.php?'+urllib.parse.urlencode({'view':view,**params}))
    def meeting(schedule=1,statuses=None,**extra):
        stored=one('SELECT * FROM ak_pertemuan WHERE id_jadwal=? AND tanggal=?',[schedule,'2026-10-30'])
        students=range(21,23) if schedule==2 else range(1,21)
        data={'action':'pertemuan','id_jadwal':schedule,'tanggal':'2026-10-30','revision':stored['revision'] if stored else 0,'pertemuan_ke':'1','jam_ke':'1–2','tp_atp':'TP UJI','materi':'Materi integrasi '+tag,'kegiatan':'Latihan fixture','alasan':'Pengujian sintetis '+tag,'terverifikasi':'1'}
        for n in students:data[f'status[{n:07d}]']=(statuses or {}).get(n,'H')
        return {**data,**extra}
    def daily_data(action='rekonsiliasi',**extra):return {'action':action,'id_tahun_ajaran':1,'id_kelas':1,'tanggal':'2026-10-30','alasan':'Verifikasi fixture '+tag,**extra}
    def duty_grant(correction='0',active=True):
        return post(admin,{'action':'piket','id':1,'id_tahun_ajaran':1,'id_guru':3,'id_kelas':'','mulai':'2026-07-01','selesai':'2026-12-31','boleh_koreksi':correction,'catatan':'Tugas pengujian '+tag,**({} if active else {'operation':'cabut'})})
    def daily_counts():return {r['status']:int(r['n']) for r in db("SELECT status,COUNT(*) n FROM ak_absensi_harian WHERE id_kelas=1 AND tanggal='2026-10-30' GROUP BY status")}
    def export(b,kind,format='csv',**params):return b.request('/academic/export.php?'+urllib.parse.urlencode({'kind':kind,'format':format,**params}))
    def multipart(b,data,content,filename='uji.csv',path='/academic/index.php?view=impor&module=absensi&id_jadwal=1&tanggal=2026-10-30',want=200):
        token=csrf(b.request('/auth/change_password.php')[2].decode());boundary='boundary'+secrets.token_hex(16);parts=[]
        for key,value in {'csrf_token':token,**data}.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="berkas"; filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode()+content+b'\r\n');parts.append(f'--{boundary}--\r\n'.encode())
        response=b.request(path,'POST',b''.join(parts),{'Content-Type':'multipart/form-data; boundary='+boundary});status(response,want);return response
    structural_before={name:re.sub(r' AUTO_INCREMENT=[0-9]+','',list(db('SHOW CREATE TABLE `'+name+'`')[0].values())[1]) for name in snapshot(STATE/'private/inspector.json')['tables']}
    initial=snapshot(STATE/'private/inspector.json')
    admin=login('admin');teacher=login('teacher');other=login('other_teacher');duty=login('duty');student=login('student');head=login('head')
    test('auth_six_accounts_and_four_roles',lambda:[status(get(b,'beranda'),200) for b in [admin,teacher,other,duty,student,head]])
    test('login_does_not_mutate_schema_or_rows',lambda:check(snapshot(STATE/'private/inspector.json')==initial))
    for key in ['admin','teacher','student','head']:
        def logout(key=key):
            b=login(key);post(b,{},'/auth/logout.php');status(get(b,'beranda'),302)
        test('login_logout_'+key,logout)
    test('guest_protected_page',lambda:status(get(Browser(),'pertemuan'),302))
    test('csrf_missing',lambda:status(teacher.request('/academic/index.php?view=pertemuan','POST',meeting()),419))
    test('csrf_array',lambda:status(teacher.request('/academic/index.php','POST',{'csrf_token[]':'forged'}),419))
    def wrong_login():
        b=Browser();page=b.request('/auth/login.php');r=b.request('/auth/login.php','POST',{'csrf_token':csrf(page[2].decode()),'username':'unknown_'+tag,'password':'wrong-fixture'});status(r,200);check(b'Username atau password salah/nonaktif.' in r[2])
    test('generic_authentication_failure',wrong_login)
    for path in ['/db_sia_smkn2_magelang.sql','/.git/config','/.env','/logs/php-errors.log','/config/config.php','/ops/academic_fixture.php','/tests/academic_db.php','/../config/config.php','/%2e%2e/config/config.php','/vendor/autoload.php']:
        test('internal_file_block_'+path,lambda path=path:status(admin.request(path),404))
    for index,(b,view) in enumerate([(teacher,'fondasi'),(student,'pertemuan'),(head,'pertemuan'),(student,'piket'),(student,'jurnal'),(student,'impor')]):test('role_'+view+'_'+str(index),lambda b=b,view=view:status(get(b,view),403))
    test('teacher_roster_database_20',lambda:check(get(teacher,'pertemuan',id_jadwal=1,tanggal='2026-10-30')[2].count(b'data-student=')==20))
    test('teacher_foreign_schedule_read',lambda:status(get(teacher,'pertemuan',id_jadwal=2,tanggal='2026-10-30'),403))
    test('legacy_null_period_denied',lambda:status(get(teacher,'pertemuan',id_jadwal=5,tanggal='2026-10-29'),403))
    test('foreign_schedule_write',lambda:post(other,meeting(1),want=403))
    test('unverified_presence_rejected',lambda:post(teacher,meeting(1,terverifikasi='0'),want=422))
    test('all_pending_can_be_saved_without_presence_claim',lambda:post(teacher,meeting(1,{n:'B' for n in range(1,21)},terverifikasi='0')))
    test('pending_not_present_or_absent',lambda:check(int(scalar("SELECT COUNT(*) FROM ak_absensi_sesi a JOIN ak_pertemuan p ON p.id=a.id_pertemuan WHERE p.id_jadwal=1 AND p.tanggal='2026-10-30' AND a.status='B'"))==20))
    example={4:'S',5:'I'}
    test('attendance_20_example_saved',lambda:post(teacher,meeting(1,example,created_by=9999)))
    mid=int(scalar("SELECT id FROM ak_pertemuan WHERE id_jadwal=1 AND tanggal='2026-10-30'"))
    test('attendance_exact_18H_1S_1I_0A',lambda:check({r['status']:int(r['n']) for r in db('SELECT status,COUNT(*) n FROM ak_absensi_sesi WHERE id_pertemuan=? GROUP BY status',[mid])}=={'H':18,'S':1,'I':1}))
    test('actor_is_user_id_not_teacher_or_post',lambda:check(all(r['created_by']==2 and r['updated_by']==2 for r in db('SELECT created_by,updated_by FROM ak_absensi_sesi WHERE id_pertemuan=?',[mid]))))
    test('single_meeting_identity_and_unique_rows',lambda:check(int(scalar('SELECT COUNT(*) FROM ak_absensi_sesi WHERE id_pertemuan=?',[mid]))==20))
    for name,extra in [('invalid_status',{'status[0000001]':'Y'}),('wrong_weekday',{'tanggal':'2026-10-29'}),('stale_version',{'revision':0}),('missing_reason',{'alasan':''}),('future_date',{'tanggal':'2026-12-25'}),('extra_student',{'status[0000021]':'H'})]:test('attendance_'+name,lambda extra=extra:post(teacher,meeting(1,example,**extra),want=422))
    def partial_roster():
        data=meeting(1,example);del data['status[0000001]'];post(teacher,data,want=422)
    test('attendance_missing_student_atomic_rejection',partial_roster)
    test('journal_teacher_same_meeting_detail',lambda:check(('PERTEMUAN #'+str(mid)).encode() in get(teacher,'jurnal',id=mid)[2]))
    test('journal_foreign_teacher_denied',lambda:status(get(other,'jurnal',id=mid),403))
    test('journal_head_supervision_read',lambda:status(get(head,'jurnal',id=mid),200))
    test('journal_export_other_teacher_denied',lambda:status(export(other,'jurnal',id=mid),403))
    test('teacher_without_duty_cannot_reconcile',lambda:post(teacher,daily_data(),want=403))
    test('head_cannot_reconcile',lambda:post(head,daily_data(),want=403))
    duty_grant('1') # Resume repeated suite even when a previous run left confirmed daily data.
    test('incomplete_sessions_reconcile_to_pending',lambda:post(duty,daily_data()))
    # This assertion is decisive only before the second subject meeting exists.
    if not one("SELECT id FROM ak_pertemuan WHERE id_jadwal=4 AND tanggal='2026-10-30'"):
        test('missing_second_session_never_assumed_present',lambda:check(daily_counts()=={'B':20}))
    else:
        test('repeated_run_daily_statuses_explicitly_accounted',lambda:check(sum(daily_counts().values())==20))
    test('second_teacher_shared_class_session',lambda:post(other,meeting(4,example)))
    test('reconcile_complete_session_consensus',lambda:post(duty,daily_data()))
    test('daily_exact_18H_1S_1I',lambda:check(daily_counts()=={'H':18,'S':1,'I':1}))
    duty_grant('0')
    h=one("SELECT * FROM ak_absensi_harian WHERE tanggal='2026-10-30' AND nis='0000004'")
    correction=daily_data('koreksi_harian',id=h['id'],revision=h['revision'],status='A',keterangan='Koreksi sintetis')
    test('duty_monitor_not_admin_and_no_correction',lambda:post(duty,correction,want=403))
    test('duty_no_master_access',lambda:status(duty.request('/admin/users.php'),403))
    duty_grant('1')
    test('correction_permission_reason_and_audit',lambda:post(duty,correction))
    test('daily_correction_audit_actor',lambda:check(one("SELECT actor_id,alasan FROM ak_riwayat WHERE entity='harian' AND record_id=? ORDER BY id DESC LIMIT 1",[str(h['id'])])=={'actor_id':4,'alasan':'Verifikasi fixture '+tag}))
    h=one('SELECT * FROM ak_absensi_harian WHERE id=?',[h['id']]);correction['revision']=h['revision']
    test('correction_empty_reason_rejected',lambda:post(duty,{**correction,'alasan':''},want=422))
    test('correction_stale_revision_rejected',lambda:post(duty,{**correction,'revision':0},want=422))
    test('source_change_saved_without_daily_overwrite',lambda:post(teacher,meeting(1,{4:'B',5:'I'})))
    test('daily_stays_confirmed_until_review',lambda:check(one('SELECT status FROM ak_absensi_harian WHERE id=?',[h['id']])['status']=='A'))
    test('dashboard_marks_changed_session_evidence',lambda:check(b'bukti sesi yang berubah' in get(duty,'piket',tanggal='2026-10-30',id_kelas=1)[2]))
    duty_grant('0')
    before_daily=db("SELECT * FROM ak_absensi_harian WHERE tanggal='2026-10-30' ORDER BY id")
    test('monitor_cannot_overwrite_confirmed_daily_by_reconcile',lambda:post(duty,daily_data(),want=403))
    test('reconcile_denial_is_atomic',lambda:check(db("SELECT * FROM ak_absensi_harian WHERE tanggal='2026-10-30' ORDER BY id")==before_daily))
    duty_grant('1')
    test('permitted_reconcile_conflict_stays_pending',lambda:post(duty,daily_data()))
    test('conflicting_status_is_B',lambda:check(one('SELECT status FROM ak_absensi_harian WHERE id=?',[h['id']])['status']=='B'))
    post(teacher,meeting(1,example));post(duty,daily_data());duty_grant('0')
    # Master CRUD through retained secured controllers, synthetic records only.
    masters=[('jurusan','id_jurusan',{'kode_jurusan':'J'+tag,'nama_jurusan':'Jurusan uji '+tag}),('guru','id_guru',{'nip':'UJI-'+tag,'nama_guru':'Guru CRUD '+tag,'email':'','no_hp':''}),('mata_pelajaran','id_mapel',{'kode_mapel':'M'+tag,'nama_mapel':'Mapel CRUD '+tag,'kelompok':'Produktif','kkm':'75'})]
    ids={}
    for table,pk,data in masters:
        def create(table=table,pk=pk,data=data):
            post(admin,{'action':'create',**data},'/admin/master.php?table='+table);ids[table]=int(scalar(f'SELECT MAX({pk}) FROM {table}'))
        test('CRUD_'+table+'_create',create)
        test('CRUD_'+table+'_read',lambda table=table:status(admin.request('/admin/master.php?table='+table+'&q='+tag),200))
        test('CRUD_'+table+'_update',lambda table=table,data=data:post(admin,{'action':'update','original_id':ids[table],**data},'/admin/master.php?table='+table))
        for action in ['deactivate','activate']:
            test('CRUD_'+table+'_'+action,lambda table=table,action=action:post(admin,{'action':action,'original_id':ids[table]},'/admin/master.php?table='+table))
    data={'nama_kelas':'XI UJI '+tag,'tingkat':'XI','id_jurusan':ids['jurusan']};post(admin,{'action':'create',**data},'/admin/master.php?table=kelas');cid=int(scalar('SELECT MAX(id_kelas) FROM kelas'))
    for action in ['update','deactivate','activate']:test('CRUD_kelas_'+action,lambda action=action:post(admin,{'action':action,'original_id':cid,**data},'/admin/master.php?table=kelas'))
    nis='99'+str(int(tag,16)).zfill(8);sdata={'nis':nis,'nama_siswa':'Siswa CRUD '+tag,'jenis_kelamin':'P','tanggal_lahir':'2010-01-01','alamat':'Data sintetis','id_kelas':cid}
    test('CRUD_siswa_create',lambda:post(admin,{'action':'create',**sdata},'/admin/master.php?table=siswa'))
    for action in ['update','deactivate','activate']:test('CRUD_siswa_'+action,lambda action=action:post(admin,{'action':action,'original_id':nis,**sdata},'/admin/master.php?table=siswa'))
    udata={'username':'uji_rev_'+tag,'password':creds['password'],'role':'siswa','id_referensi':nis,'status':'aktif'}
    test('CRUD_user_create',lambda:post(admin,{'action':'create',**udata},'/admin/users.php'))
    uid=int(scalar('SELECT id_user FROM users WHERE username=?',[udata['username']]));temp=login(udata['username'])
    test('CRUD_user_read',lambda:status(admin.request('/admin/users.php?q='+tag),200))
    test('CRUD_user_update',lambda:post(admin,{'action':'update','id_user':uid,**udata,'password':''},'/admin/users.php'))
    test('CRUD_user_deactivate',lambda:post(admin,{'action':'deactivate','id_user':uid},'/admin/users.php'))
    test('session_revocation_next_request',lambda:status(get(temp,'beranda'),302))
    test('CRUD_user_reactivate',lambda:post(admin,{'action':'activate','id_user':uid},'/admin/users.php'))
    schedule={'id_guru':ids['guru'],'id_kelas':cid,'id_mapel':ids['mata_pelajaran'],'id_tahun_ajaran':1,'hari':'Senin','jam_mulai':'13:00','jam_selesai':'14:00','ruang':'UJI-'+tag}
    test('CRUD_schedule_create',lambda:post(admin,{'action':'create',**schedule},'/admin/penugasan.php'))
    sid=int(scalar('SELECT MAX(id_jadwal) FROM jadwal'))
    for action in ['update','deactivate','activate']:test('CRUD_schedule_'+action,lambda action=action:post(admin,{'action':action,'id_jadwal':sid,**schedule},'/admin/penugasan.php'))
    test('assignment_window_explicit_verification',lambda:post(admin,{'action':'penugasan','id_jadwal':sid,'mulai':'2026-07-01','selesai':'2026-12-31','terverifikasi':'1','catatan':'Penugasan fixture '+tag}))
    member={'action':'anggota','id_tahun_ajaran':1,'id_kelas':cid,'nis':nis,'nomor_absen':1,'mulai':'2026-07-01','selesai':'2026-12-31','alasan':'Anggota sintetis '+tag}
    test('membership_create',lambda:post(admin,member))
    aid=int(scalar('SELECT id FROM ak_anggota_kelas WHERE nis=?',[nis]));test('membership_overlap_rejected',lambda:post(admin,member,want=422))
    test('membership_close_effective_date',lambda:post(admin,{**member,'id':aid,'selesai':'2026-11-30'}))
    test('membership_used_number_cannot_change',lambda:post(admin,{'action':'anggota','id':1,'id_tahun_ajaran':1,'nis':'0000001','id_kelas':1,'nomor_absen':99,'mulai':'2026-07-01','selesai':'2026-12-31','alasan':'Uji penolakan'},want=422))
    test('assignment_legacy_window_denied',lambda:post(admin,{'action':'penugasan','id_jadwal':5,'mulai':'2026-07-01','selesai':'2026-12-31','terverifikasi':'1','catatan':'Uji penolakan'},want=422))
    test('assignment_historical_window_frozen',lambda:post(admin,{'action':'penugasan','id_jadwal':1,'mulai':'2026-07-02','selesai':'2026-12-31','terverifikasi':'1','catatan':'Uji penolakan'},want=422))
    year=2100+int(tag,16)%400
    while scalar('SELECT COUNT(*) FROM tahun_ajaran WHERE tahun_ajaran=?',[f'{year}/{year+1}']):year+=1
    pdata={'tahun_ajaran':f'{year}/{year+1}','semester':'Ganjil','status':'Tidak Aktif','dikunci':'0','rapor_diterbitkan':'0'}
    test('CRUD_period_create',lambda:post(admin,{'action':'create',**pdata},'/admin/tahun_ajaran.php'))
    pid=int(scalar('SELECT MAX(id_tahun_ajaran) FROM tahun_ajaran'));test('CRUD_period_update',lambda:post(admin,{'action':'update','id_tahun_ajaran':pid,**pdata},'/admin/tahun_ajaran.php'))
    # Calendar CRUD and publication boundaries.
    event={'action':'kalender','id_tahun_ajaran':1,'revision':0,'mulai':'2026-11-02','selesai':'2026-11-02','judul':'Agenda sintetis '+tag,'jenis':'Agenda','status':'draft','catatan':'Fixture bukan kalender resmi'}
    test('calendar_teacher_create_denied',lambda:post(teacher,event,want=403))
    test('calendar_create_draft',lambda:post(admin,event))
    eid=int(scalar('SELECT MAX(id) FROM ak_kalender'));test('calendar_draft_hidden_from_student',lambda:check(event['judul'].encode() not in get(student,'kalender',bulan='2026-11')[2]))
    test('calendar_duplicate_rejected',lambda:post(admin,event,want=422))
    test('calendar_approve',lambda:post(admin,{**event,'id':eid,'revision':1,'status':'disahkan'}))
    test('calendar_student_approved_visible',lambda:check(event['judul'].encode() in get(student,'kalender',bulan='2026-11')[2]))
    test('calendar_nonactivate_preserves_record',lambda:post(admin,{**event,'id':eid,'revision':2,'status':'nonaktif'}))
    test('calendar_holiday_cannot_invalidate_saved_meeting',lambda:post(admin,{**event,'judul':'Libur ditolak '+tag,'mulai':'2026-10-30','selesai':'2026-10-30','jenis':'Libur','status':'disahkan'},want=422))
    # Versioned grades and publication workflow.
    rule={'action':'aturan_nilai','id_jadwal':1,'tanggal':'2026-10-30','bobot_tugas':30,'bobot_uts':30,'bobot_uas':40,'bobot_praktik':0,'bobot_proyek':0,'catatan':'Aturan fixture '+tag}
    test('grade_rule_total_must_100',lambda:post(teacher,{**rule,'bobot_tugas':29},want=422))
    test('grade_rule_foreign_teacher_denied',lambda:post(other,rule,want=403))
    test('grade_rule_create_version',lambda:post(teacher,rule));rid=int(scalar('SELECT MAX(id) FROM ak_aturan_nilai WHERE id_guru=1'))
    def grade_data(schedule=1,ruleid=rid,nis='0000001',**extra):
        row=one('SELECT revision FROM ak_nilai WHERE nis=? AND id_tahun_ajaran=1 AND id_mapel=?',[nis,1 if schedule==1 else 2])
        data={'action':'nilai','id_jadwal':schedule,'tanggal':'2026-10-30','id_aturan':ruleid,'alasan':'Pengisian nilai uji '+tag,f'nilai[{nis}][revision]':row['revision'] if row else 0,f'nilai[{nis}][deskripsi]':'Capaian sintetis'}
        for key,value in {'tugas':80,'uts':70,'uas':90,'praktik':0,'proyek':0}.items():data[f'nilai[{nis}][{key}]']=value
        return {**data,**extra}
    test('grade_individual_save',lambda:post(teacher,grade_data()))
    test('grade_formula_81_and_predicate_C',lambda:check(one("SELECT nilai_akhir,predikat FROM ak_nilai WHERE nis='0000001' AND id_mapel=1")=={'nilai_akhir':'81.00','predikat':'C'}))
    test('grade_out_of_range',lambda:post(teacher,grade_data(**{'nilai[0000001][tugas]':101}),want=422))
    test('grade_foreign_student_denied',lambda:post(teacher,grade_data(nis='0000021'),want=403))
    test('grade_stale_version',lambda:post(teacher,grade_data(**{'nilai[0000001][revision]':0}),want=422))
    unchanged=one("SELECT * FROM ak_nilai WHERE nis='0000001' AND id_mapel=1")
    test('new_rule_no_historical_recalculation',lambda:post(teacher,{**rule,'bobot_tugas':40,'bobot_uts':20}))
    test('existing_grade_bytes_stay_same',lambda:check(one("SELECT * FROM ak_nilai WHERE nis='0000001' AND id_mapel=1")==unchanged))
    build={'action':'rapor_buat','id_tahun_ajaran':1,'nis':'0000001','tanggal':'2026-10-30','alasan':'Snapshot fixture '+tag}
    # On repeated runs both subject grades may already exist; enforce completeness on another pupil.
    test('report_incomplete_grades_blocked',lambda:post(admin,{**build,'nis':'0000019'},want=422))
    post(other,{**rule,'id_jadwal':4});rid2=int(scalar('SELECT MAX(id) FROM ak_aturan_nilai WHERE id_guru=2'))
    test('second_subject_teacher_grade',lambda:post(other,grade_data(4,rid2)))
    test('report_build_snapshot',lambda:post(admin,build));report_id=int(scalar('SELECT MAX(id) FROM ak_rapor_snapshot'))
    def transition(statusValue,want=302,browser=admin):
        row=one('SELECT revision FROM ak_rapor_status WHERE id_snapshot=?',[report_id]);return post(browser,{'action':'rapor_status','id':report_id,'revision':row['revision'],'status':statusValue,'alasan':'Keputusan fixture '+tag},want=want)
    test('student_cannot_read_draft_report_URL',lambda:status(get(student,'rapor',id=report_id),403))
    test('student_cannot_export_draft_report',lambda:status(export(student,'rapor',id=report_id),403))
    test('head_can_read_for_supervision',lambda:status(get(head,'rapor',id=report_id),200))
    test('teacher_cannot_export_whole_semester_report',lambda:status(export(teacher,'rapor',id=report_id),403))
    test('report_cannot_skip_verification',lambda:transition('diterbitkan',422))
    test('head_cannot_publish',lambda:transition('terverifikasi',403,head))
    test('report_verify',lambda:transition('terverifikasi'))
    test('student_cannot_read_verified_unpublished',lambda:status(get(student,'rapor',id=report_id),403))
    test('report_publish',lambda:transition('diterbitkan'))
    test('student_reads_published_own_report',lambda:status(get(student,'rapor',id=report_id),200))
    snapshot_before=one('SELECT payload_json,payload_hash FROM ak_rapor_snapshot WHERE id=?',[report_id])
    test('grade_edit_after_snapshot',lambda:post(teacher,grade_data(**{'nilai[0000001][tugas]':90})))
    test('published_snapshot_does_not_recompute',lambda:check(one('SELECT payload_json,payload_hash FROM ak_rapor_snapshot WHERE id=?',[report_id])==snapshot_before))
    test('snapshot_runtime_update_denied',lambda:db('UPDATE ak_rapor_snapshot SET payload_json=payload_json WHERE id=?',[report_id],config='runtime.json',success=False))
    test('rule_runtime_update_denied',lambda:db('UPDATE ak_aturan_nilai SET catatan=catatan WHERE id=?',[rid],config='runtime.json',success=False))
    test('audit_runtime_update_denied',lambda:db('UPDATE ak_riwayat SET alasan=alasan WHERE id=1',config='runtime.json',success=False))
    test('runtime_DDL_denied',lambda:db('CREATE TABLE ak_ddl_forbidden(id INT)',config='runtime.json',success=False))
    # CSV/XLSX preview, validation, commit and replay.
    rows=[['nis','status','keterangan']]+[[f'{n:07d}',example.get(n,'H'),'Fixture import '+tag] for n in range(1,21)]
    csvfile=io.StringIO();csv.writer(csvfile).writerows(rows);payload=csvfile.getvalue().encode()
    imeta={'action':'impor_preview','module':'absensi','id_jadwal':1,'tanggal':'2026-10-30','alasan':'Impor fixture '+tag}
    before_preview=snapshot(STATE/'private/inspector.json');preview=multipart(teacher,imeta,payload)
    test('import_preview_no_database_changes',lambda:check(snapshot(STATE/'private/inspector.json')==before_preview))
    token=re.search(rb'name="preview_token" value="([a-f0-9]+)"',preview[2]).group(1).decode()
    test('import_commit_requires_confirmation',lambda:post(teacher,{'action':'impor_commit','preview_token':token},want=422))
    test('import_commit_requires_verified_attendance',lambda:post(teacher,{'action':'impor_commit','preview_token':token,'konfirmasi':'1'},want=422))
    test('import_commit_to_database',lambda:post(teacher,{'action':'impor_commit','preview_token':token,'konfirmasi':'1','terverifikasi':'1'}))
    test('import_replay_blocked',lambda:post(teacher,{'action':'impor_commit','preview_token':token,'konfirmasi':'1','terverifikasi':'1'},want=422))
    test('import_duplicate_rejected',lambda:multipart(teacher,imeta,payload+payload.splitlines()[1]+b'\n',want=422))
    test('import_foreign_roster_rejected',lambda:multipart(teacher,imeta,payload.replace(b'0000020',b'0000021'),want=422))
    test('import_invalid_status_rejected',lambda:multipart(teacher,imeta,payload.replace(b',S,',b',Y,'),want=422))
    wb=Workbook();ws=wb.active
    for row in rows:ws.append(row)
    f=io.BytesIO();wb.save(f)
    test('xlsx_import_preview_leading_zero_NIS',lambda:multipart(teacher,imeta,f.getvalue(),'uji.xlsx'))
    ws['B2']='=1+1';bad_xlsx=io.BytesIO();wb.save(bad_xlsx)
    test('xlsx_formula_import_rejected',lambda:multipart(teacher,imeta,bad_xlsx.getvalue(),'formula.xlsx',want=422))
    # Downloads are parsed, not just checked for HTTP 200.
    for kind,params in [('jurnal',{'id':mid}),('agenda',{'id_tahun_ajaran':1}),('harian',{'id_kelas':1,'id_tahun_ajaran':1,'mulai':'2026-10-30','selesai':'2026-10-30'}),('kalender',{'id_tahun_ajaran':1}),('nilai',{'id_jadwal':1}),('rapor',{'id':report_id})]:
        actor=duty if kind=='harian' else student if kind=='rapor' else teacher
        for format in ['csv','xlsx','pdf','print']:
            def download(kind=kind,params=params,actor=actor,format=format):
                r=export(actor,kind,format,**params);status(r,200)
                if format=='xlsx':
                    sheet=load_workbook(io.BytesIO(r[2])).active;check(sheet.max_row>=1);check(all(cell.data_type!='f' for row in sheet for cell in row))
                    if kind=='harian':check(sheet.cell(2,2).value=='0000001')
                elif format=='pdf':check(r[2].startswith(b'%PDF-') and len(r[2])>1000 and b'/Type /Page' in r[2])
                elif format=='csv':check(len(list(csv.reader(io.StringIO(r[2].decode('utf-8-sig')))))>=1)
                else:check(b'<table>' in r[2] and b'<html' in r[2])
            test('export_'+kind+'_'+format,download)
    test('student_cannot_export_school_daily',lambda:status(export(student,'harian',id_kelas=1,id_tahun_ajaran=1,mulai='2026-10-30',selesai='2026-10-30'),403))
    def excel_types():
        r=export(duty,'harian','xlsx',id_kelas=1,id_tahun_ajaran=1,mulai='2026-10-30',selesai='2026-10-30');status(r,200);sheet=load_workbook(io.BytesIO(r[2])).active
        check(sheet['B2'].value=='0000001' and sheet['B2'].data_type=='s');check(sheet['E2'].value==1 and sheet['E2'].data_type=='n')
    test('excel_preserves_identifier_text_and_numeric_attendance_totals',excel_types)
    def excel_grade_numeric():
        r=export(teacher,'nilai','xlsx',id_jadwal=1);status(r,200);sheet=load_workbook(io.BytesIO(r[2])).active;check(sheet['A2'].value=='0000001' and sheet['C2'].data_type=='n')
    test('excel_grade_score_is_numeric_without_identifier_conversion',excel_grade_numeric)
    test('teacher_cannot_export_school_daily_without_duty',lambda:status(export(teacher,'harian',id_kelas=1,id_tahun_ajaran=1,mulai='2026-10-30',selesai='2026-10-30'),403))
    test('duty_permission_revocation',lambda:duty_grant(active=False))
    test('revoked_duty_export_denied',lambda:status(export(duty,'harian',id_kelas=1,id_tahun_ajaran=1,mulai='2026-10-30',selesai='2026-10-30'),403))
    duty_grant('1');post(duty,daily_data());duty_grant('0')
    test('final_demo_20_students_18H_1S_1I',lambda:check(daily_counts()=={'H':18,'S':1,'I':1}))
    test('fixture_database_foreign_key_check',lambda:check(scalar('SELECT @@foreign_key_checks')==1))
    test('same_schema_after_application_requests',lambda:check({name:re.sub(r' AUTO_INCREMENT=[0-9]+','',list(db('SHOW CREATE TABLE `'+name+'`')[0].values())[1]) for name in structural_before}==structural_before))
    report={'passed':sum(x['status']=='PASS' for x in results),'failed':sum(x['status']=='FAIL' for x in results),'skipped':0,'fixture_only':True,'database':runtime['DB_NAME'],'tests':results}
    save_json(STATE/'reports/academic-http-tests.json',report)
    print(f"{report['passed']} PASS, {report['failed']} FAIL, 0 SKIP")
    return 1 if report['failed'] else 0

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as error:
        print('FAIL runner '+type(error).__name__+' (private detail omitted)',file=sys.stderr);sys.exit(2)
