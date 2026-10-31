#!/usr/bin/env python3
"""Current staff policy: Admin bulk, mapel duties, informational wali, head monitor."""
import io,json,os,re,secrets,subprocess,sys,unicodedata,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'));sys.path.insert(0,str(ROOT/'ops'))
from academic_http import STATE,Browser,csrf
from r0_environment import save_json
sys.path.insert(0,str(STATE/'tools/python'));from pypdf import PdfReader
from openpyxl import load_workbook

def main():
 os.umask(0o077);cfg=json.loads((STATE/'private/runtime.json').read_text());assert cfg['APP_ENV']=='testing'and cfg['DB_NAME']=='sia_academic_dev_20261031'and cfg.get('DB_SOCKET')and cfg['HOMEROOM_MODE']=='informational'and cfg['ROOM_CATALOG_ENFORCED']=='1'
 c=json.loads((STATE/'private/test-accounts.json').read_text());assert c['password']=='password';tag=secrets.token_hex(3);results=[]
 def check(v):
  if not v:raise AssertionError('Staff-policy condition failed; private fixture contents omitted')
 def test(name,fn):
  try:fn();results.append({'test':name,'status':'PASS'})
  except Exception as e:results.append({'test':name,'status':'FAIL','error_type':type(e).__name__})
  print(results[-1]['status']+' '+name,flush=True)
 def db(sql,args=None):
  r=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private/inspector.json')],input=json.dumps({'sql':sql,'args':args or []}).encode(),capture_output=True);check(not r.returncode);return json.loads(r.stdout)
 def login(username):
  b=Browser();r=b.request('/auth/login.php');check(b.request('/auth/login.php','POST',{'csrf_token':csrf(r[2].decode()),'username':username,'password':c['password']})[0]==302);return b
 def post(b,data,path='/academic/index.php?view=beranda',want=302):
  token=csrf(b.request('/auth/change_password.php')[2].decode());r=b.request(path,'POST',{'csrf_token':token,**data});check(r[0]==want);return r
 admin=login(c['admin']);head=login(c['head']);wali=login(c['wali']);student=login(c['student'])
 test('simple_fixture_logins_still_check_real_DB',lambda:check(all(b.request('/academic/index.php')[0]==200 for b in [admin,head,wali,student])))
 test('old_generic_import_GET_redirects_to_Admin_bulk',lambda:check(admin.request('/academic/index.php?view=impor')[0]==302 and admin.request('/academic/index.php?view=impor')[1]['Location'].startswith('/admin/bulk_upload.php')))
 test('no_change_password_or_generic_import_menu',lambda:check(all(b'href="../auth/change_password.php"'not in admin.request(p)[2]and b'Impor / Ekspor'not in admin.request(p)[2]for p in ['/admin/master.php?table=siswa','/academic/index.php'])))
 test('29_user_room_references_stored_in_real_DB',lambda:check(all(db('SELECT id_ruang FROM ak_ruang WHERE nama_ruang=? AND status=\'aktif\'',[n])for n in json.loads((STATE/'reports/room-catalog.json').read_text())['names'])))
 test('Admin_schedule_list_pagination_20',lambda:check(admin.request('/admin/penugasan.php')[2].count(b'<tr>')-1<=20))
 post(admin,{'action':'create','nip':'ST-'+tag,'nama_guru':'Guru Mapel Uji '+tag,'email':'','no_hp':''},'/admin/master.php?table=guru');gid=db('SELECT id_guru FROM guru WHERE nip=?',['ST-'+tag])[0]['id_guru']
 post(admin,{'action':'create','nama_kelas':'Uji Staf '+tag,'tingkat':'X','id_jurusan':1},'/admin/master.php?table=kelas');cid=db('SELECT id_kelas FROM kelas WHERE nama_kelas=?',['Uji Staf '+tag])[0]['id_kelas']
 room='UJI-'+tag;post(admin,{'action':'create','kode_ruang':room,'nama_ruang':room,'jenis':'Kelas'},'/admin/master.php?table=ak_ruang')
 username='uji_mapel_'+tag;post(admin,{'action':'create','username':username,'password':c['password'],'role':'guru','id_referensi':gid,'status':'aktif'},'/admin/users.php');uid=db('SELECT id_user FROM users WHERE username=?',[username])[0]['id_user'];teacher=login(username)
 pupils=[]
 for n in [1,2,3]:
  nis=f'0005{int(tag,16):08d}{n}';pupils.append(nis)
  post(admin,{'action':'create','nis':nis,'nama_siswa':'Siswa Staf Uji '+tag+' '+str(n),'jenis_kelamin':'L','tanggal_lahir':'2010-01-01','alamat':'Data testing staf','id_kelas':cid},'/admin/master.php?table=siswa')
  post(admin,{'action':'anggota','id_tahun_ajaran':1,'nis':nis,'id_kelas':cid,'nomor_absen':n,'mulai':'2026-07-01','selesai':'2026-12-31','alasan':'Fixture staf'})
 schedule={'action':'create','id_guru':gid,'id_kelas':cid,'id_mapel':1,'id_tahun_ajaran':1,'hari':'Jumat','jam_mulai':'10:20','jam_selesai':'10:50','ruang':room}
 test('unknown_room_POST_rejected_by_server',lambda:post(admin,{**schedule,'ruang':'TIDAK-ADA'},'/admin/penugasan.php',422))
 test('Admin_assigns_teacher_subject_class_and_DB_room',lambda:post(admin,schedule,'/admin/penugasan.php'))
 sid=db('SELECT id_jadwal FROM jadwal WHERE id_guru=? AND id_kelas=?',[gid,cid])[0]['id_jadwal']
 post(admin,{'action':'penugasan','id_jadwal':sid,'mulai':'2026-07-01','selesai':'2026-12-31','terverifikasi':'1','catatan':'Penugasan data uji staf'})
 widguru=db('SELECT id_referensi FROM users WHERE username=?',[c['wali']])[0]['id_referensi'];post(admin,{'action':'wali','id_guru':widguru,'id_kelas':cid,'id_tahun_ajaran':1,'mulai':'2026-07-01','selesai':'2026-12-31','catatan':'Wali sebagai informasi penanggung jawab'})
 monitor='/academic/index.php?view=beranda&tanggal=2026-10-30&id_guru='+str(gid)
 test('head_dashboard_teacher_class_room_and_unfilled_journal',lambda:check(all(v.encode()in head.request(monitor)[2]for v in ['Guru Mapel Uji '+tag,'Uji Staf '+tag,room,'Belum diisi'])))
 test('teacher_cannot_self_assign_Admin_via_metadata',lambda:(post(teacher,{'action':'update','id_user':uid,'role':'admin','user_metadata[role]':'admin','app_metadata[role]':'admin'},'/admin/users.php',403),check(db('SELECT role FROM users WHERE id_user=?',[uid])[0]['role']=='guru')))
 test('head_cannot_manage_users_or_bulk_master',lambda:check(all(head.request(p)[0]==403 for p in ['/admin/users.php','/admin/bulk_upload.php?module=guru'])))
 test('other_class_meeting_IDOR_rejected',lambda:check(teacher.request('/academic/index.php?view=pertemuan&id_jadwal=1&tanggal=2026-10-30')[0]==403))
 body={'action':'pertemuan','id_jadwal':sid,'tanggal':'2026-10-30','revision':0,'pertemuan_ke':1,'jam_ke':'5','tp_atp':'Berpikir komputasional','materi':'Dekomposisi masalah','kegiatan':'Diskusi dan presentasi','refleksi':'Membuat poster','tindak_lanjut':'Latihan lanjutan','catatan':'Data uji foto agenda/jurnal','id_guru_pengganti':'','alasan':'Pengisian pertama fixture','terverifikasi':'1','created_by':'9999'}
 for nis,status in zip(pupils,['H','S','I']):body['status['+nis+']']=status
 test('mapel_teacher_saves_one_meeting_attendance_journal_agenda',lambda:post(teacher,body))
 meeting=db('SELECT * FROM ak_pertemuan WHERE id_jadwal=?',[sid])[0];mid=meeting['id']
 test('meeting_actor_DB_user_id_not_client_metadata',lambda:check(meeting['created_by']==uid and all(r['created_by']==uid for r in db('SELECT created_by FROM ak_absensi_sesi WHERE id_pertemuan=?',[mid]))))
 test('reload_persists_3_student_roster_and_material',lambda:check(teacher.request(f'/academic/index.php?view=pertemuan&id_jadwal={sid}&tanggal=2026-10-30')[2].count(b'data-student=')==3 and b'Dekomposisi masalah'in teacher.request('/academic/index.php?view=jurnal&id='+str(mid))[2]))
 wali_name=db('SELECT nama_guru FROM guru WHERE id_guru=?',[widguru])[0]['nama_guru']
 test('head_dashboard_journal_status_and_actual_wali_metadata',lambda:check(b'Sudah diisi'in head.request(monitor)[2]and wali_name.encode()in head.request(monitor)[2]))
 test('head_read_only_cannot_submit_teaching',lambda:post(head,body,want=403))
 for kind,params,words in [('jurnal',{'id':mid},['JURNAL KEGIATAN BELAJAR MENGAJAR','Dekomposisi masalah']),('agenda',{'id_tahun_ajaran':1,'id_kelas':cid},['BUKU AGENDA HARIAN GURU','Membuat poster'])]:
  def pdf(kind=kind,params=params,words=words):
   r=teacher.request('/academic/export.php?'+urllib.parse.urlencode({'kind':kind,'format':'pdf',**params}));check(r[0]==200);text=' '.join(p.extract_text()for p in PdfReader(io.BytesIO(r[2])).pages);text=re.sub(r'\s+','',unicodedata.normalize('NFKC',text));check(all(re.sub(r'\s+','',w)in text for w in words))
  test('real_PDF_matches_physical_book_'+kind,pdf)
 post(admin,{'action':'rekonsiliasi','id_tahun_ajaran':1,'id_kelas':cid,'tanggal':'2026-10-30','alasan':'Rekap harian fixture staf'})
 post(teacher,{'action':'aturan_nilai','id_jadwal':sid,'tanggal':'2026-10-30','bobot_tugas':30,'bobot_uts':30,'bobot_uas':40,'bobot_praktik':0,'bobot_proyek':0,'catatan':'Aturan fixture staf'});rule=db('SELECT MAX(id) id FROM ak_aturan_nilai WHERE id_guru=?',[gid])[0]['id']
 grade={'action':'nilai','id_jadwal':sid,'tanggal':'2026-10-30','id_aturan':rule,'alasan':'Nilai fixture staf'}
 for k,v in {'revision':0,'tugas':80,'uts':80,'uas':80,'praktik':0,'proyek':0,'deskripsi':'Mampu dekomposisi masalah'}.items():grade[f'nilai[{pupils[0]}][{k}]']=v
 post(teacher,grade);post(admin,{'action':'rapor_buat','id_tahun_ajaran':1,'nis':pupils[0],'tanggal':'2026-10-30','alasan':'Rapor fixture kebijakan staf'})
 report=db('SELECT * FROM ak_rapor_snapshot WHERE nis=? ORDER BY id DESC LIMIT 1',[pupils[0]])[0];rid=report['id'];test('current_report_workflow_Admin_verification_version_3',lambda:check(json.loads(report['payload_json'])['workflow_version']==3))
 test('informational_wali_has_no_report_review_privilege',lambda:(check(wali.request('/academic/index.php?view=rapor&id='+str(rid))[0]==403),post(wali,{'action':'rapor_review','id':rid,'revision':1,'keputusan':'disetujui','catatan':'Tidak berwenang'},want=403)))
 test('Admin_explicitly_verifies_and_publishes_without_wali_gate',lambda:(post(admin,{'action':'rapor_status','id':rid,'revision':1,'status':'terverifikasi','alasan':'Verifikasi Admin'}),post(admin,{'action':'rapor_status','id':rid,'revision':2,'status':'diterbitkan','alasan':'Keputusan penerbitan Admin'})))
 test('optional_student_still_cannot_read_another_report',lambda:check(student.request('/academic/index.php?view=rapor&id='+str(rid))[0]==403))
 for kind,b,params in [('rapor',head,{'id':rid}),('nilai',teacher,{'id_jadwal':sid})]:
  def downloads(kind=kind,b=b,params=params):
   for fmt in ['xlsx','csv','pdf','print']:
    r=b.request('/academic/export.php?'+urllib.parse.urlencode({'kind':kind,'format':fmt,**params}));check(r[0]==200)
    if fmt=='xlsx':text=' '.join(str(v)for row in load_workbook(io.BytesIO(r[2]),read_only=True).active.values for v in row)
    elif fmt=='pdf':text=' '.join(p.extract_text()for p in PdfReader(io.BytesIO(r[2])).pages)
    else:text=r[2].decode('utf-8-sig')
    check(pupils[0]in text)
  test('inline_download_contents_XLSX_CSV_PDF_print_'+kind,downloads)
 userbody={'action':'update','id_user':uid,'username':username,'password':'','status':'aktif','role':'kepala_sekolah','id_referensi':''}
 test('Admin_role_change_revokes_existing_teacher_session',lambda:(post(admin,userbody,'/admin/users.php'),check(teacher.request('/academic/index.php')[0]==302)))
 post(admin,{**userbody,'role':'guru','id_referensi':gid},'/admin/users.php')
 save_json(STATE/'private/staff-manual-fixture.json',{'teacher_username':username,'guru_id':gid,'kelas_id':cid,'jadwal_id':sid,'ruang':room,'meeting_id':mid,'report_id':rid,'date':'2026-10-30','nis':pupils})
 report={'passed':sum(x['status']=='PASS'for x in results),'failed':sum(x['status']=='FAIL'for x in results),'skipped':0,'tests':results,'policy':'Current runtime: informational wali, Admin verifies reports, enforced DB room catalogue','manual_fixture':{'teacher_username':username,'kelas_id':cid,'jadwal_id':sid,'date':'2026-10-30','report_id':rid,'room':room}};save_json(STATE/'reports/staff-http-tests.json',report);return bool(report['failed'])
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:print('Staff test runner failed ('+type(e).__name__+'); private details omitted.',file=sys.stderr);sys.exit(2)
