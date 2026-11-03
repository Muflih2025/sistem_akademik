#!/usr/bin/env python3
"""Domain scenarios with persisted state and decoded CSV/XLSX/PDF artifacts."""
import csv,hashlib,io,json,os,re,secrets,subprocess,sys,urllib.parse,unicodedata
from pathlib import Path
from openpyxl import Workbook,load_workbook
sys.path.insert(0,str(Path(__file__).resolve().parent))
from academic_http import Browser,csrf,ROOT,STATE
sys.path.insert(0,str(STATE/'tools/python'))
from pypdf import PdfReader

def main():
 os.umask(0o077);creds=json.loads((STATE/'private/test-accounts.json').read_text());tag=secrets.token_hex(3);results=[]
 cfg=json.loads((STATE/'private/runtime.json').read_text());assert cfg['DB_NAME']=='sia_academic_dev_20261031' and cfg.get('DB_SOCKET') and cfg['APP_ENV']=='testing'
 def check(v,m='Expected condition not met'):
  if not v:raise AssertionError(m)
 def test(name,fn):
  try:fn();results.append({'test':name,'status':'PASS'})
  except Exception as e:results.append({'test':name,'status':'FAIL','error_type':type(e).__name__,'detail':str(e) if isinstance(e,AssertionError) else 'Private details omitted'})
  print(results[-1]['status']+' '+name,flush=True)
 def db(sql,args=None,config='inspector.json',success=True):
  r=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private'/config)],input=json.dumps({'sql':sql,'args':args or []}).encode(),capture_output=True)
  if not success:check(r.returncode!=0);return
  check(r.returncode==0,'Fixture helper failed');return json.loads(r.stdout)
 def one(sql,args=None):return next(iter(db(sql,args)),None)
 def scalar(sql,args=None):return next(iter(one(sql,args).values()))
 def login(key):
  b=Browser();r=b.request('/auth/login.php');r=b.request('/auth/login.php','POST',{'csrf_token':csrf(r[2].decode()),'username':creds[key],'password':creds['password']});check(r[0]==302);return b
 admin=login('admin');teacher=login('teacher');wali=login('wali');student=login('student');head=login('head');piket=login('duty');other=login('other_teacher')
 def post(b,data,want=302,path='/academic/index.php?view=beranda'):
  r=b.request('/auth/change_password.php');check(r[0]==200);r=b.request(path,'POST',{'csrf_token':csrf(r[2].decode()),**data});check(r[0]==want,'HTTP '+str(r[0])+' expected '+str(want));return r
 def get(b,path,want=200):r=b.request(path);check(r[0]==want,'HTTP '+str(r[0])+' expected '+str(want));return r
 def build():
  post(admin,{'action':'rapor_buat','id_tahun_ajaran':1,'nis':'0000001','tanggal':'2026-10-30','alasan':'Snapshot completion '+tag});return int(scalar('SELECT MAX(id) FROM ak_rapor_snapshot'))
 rid=build()
 def revision():return scalar('SELECT revision FROM ak_rapor_status WHERE id_snapshot=?',[rid])
 def review(decision='disetujui',b=wali,want=302,**extra):return post(b,{'action':'rapor_review','id':rid,'revision':revision(),'keputusan':decision,'catatan':'Pemeriksaan wali nyata fixture '+tag,**extra},want)
 def transition(target,want=302):return post(admin,{'action':'rapor_status','id':rid,'revision':revision(),'status':target,'alasan':'Pemeriksaan admin fixture '+tag},want)
 test('wali_can_read_assigned_class_draft',lambda:get(wali,'/academic/index.php?view=rapor&id='+str(rid)))
 test('subject_teacher_cannot_read_unassigned_whole_report',lambda:get(teacher,'/academic/index.php?view=rapor&id='+str(rid),403))
 test('admin_cannot_verify_without_wali',lambda:transition('terverifikasi',422))
 def legacy_draft_gate():
  source=one('SELECT * FROM ak_rapor_snapshot WHERE id=?',[rid]);payload=json.loads(source['payload_json']);payload.pop('workflow_version',None);raw=json.dumps(payload,separators=(',',':'));version=int(scalar('SELECT MAX(versi) FROM ak_rapor_snapshot WHERE nis=? AND id_tahun_ajaran=?',[source['nis'],source['id_tahun_ajaran']]))+1
  result=db('INSERT INTO ak_rapor_snapshot(nis,id_tahun_ajaran,id_kelas,versi,payload_json,payload_hash,created_by) VALUES(?,?,?,?,?,?,?)',[source['nis'],source['id_tahun_ajaran'],source['id_kelas'],version,raw,hashlib.sha256(raw.encode()).hexdigest(),1]);legacy_id=int(result['id']);db("INSERT INTO ak_rapor_status(id_snapshot,status) VALUES(?,'draft')",[legacy_id]);post(admin,{'action':'rapor_status','id':legacy_id,'revision':1,'status':'terverifikasi','alasan':'Uji gate snapshot versi lama'},422)
 test('legacy_unpublished_snapshot_cannot_bypass_wali_gate',legacy_draft_gate)

 test('head_cannot_impersonate_wali_review',lambda:review(b=head,want=403))
 test('piket_cannot_review_without_wali_assignment',lambda:review(b=piket,want=403))
 test('wali_can_request_revision_and_admin_is_blocked',lambda:(review('perlu_perbaikan'),transition('terverifikasi',422)))
 test('wali_stale_form_rejected',lambda:review(want=422,revision=0))
 def persisted_review():
  review(actor_id=1)
  row=one('SELECT actor_id,payload_hash,source_hash FROM ak_review_rapor WHERE id_snapshot=? ORDER BY id DESC',[rid]);snapshot=one('SELECT payload_hash,payload_json FROM ak_rapor_snapshot WHERE id=?',[rid]);check(row['actor_id']==scalar('SELECT id_user FROM users WHERE username=?',[creds['wali']]) and row['payload_hash']==snapshot['payload_hash'] and row['source_hash']==json.loads(snapshot['payload_json'])['source_hash'])
 test('wali_acceptance_persists_actor_hash_and_revision',persisted_review)
 test('review_append_only_grants',lambda:db('UPDATE ak_review_rapor SET catatan=catatan WHERE id_snapshot=?',[rid],config='runtime.json',success=False))
 test('wali_cannot_publish',lambda:post(wali,{'action':'rapor_status','id':rid,'revision':revision(),'status':'diterbitkan','alasan':'Uji penolakan'},403))
 test('wali_admin_student_publication_full_flow',lambda:(transition('terverifikasi'),transition('diterbitkan'),get(student,'/academic/index.php?view=rapor&id='+str(rid))))
 test('wali_cannot_review_after_publication',lambda:review(want=422))
 test('wali_does_not_gain_admin_CRUD',lambda:get(wali,'/admin/users.php',403))
 rule={'action':'aturan_nilai','id_jadwal':2,'tanggal':'2026-10-30','bobot_tugas':30,'bobot_uts':30,'bobot_uas':40,'bobot_praktik':0,'bobot_proyek':0,'catatan':'Aturan kelas pembanding '+tag};post(other,rule);ruleid=int(scalar('SELECT MAX(id) FROM ak_aturan_nilai WHERE id_kelas=2 AND id_guru=2'))
 old=one("SELECT revision FROM ak_nilai WHERE nis='0000021' AND id_mapel=2 AND id_tahun_ajaran=1")
 post(other,{'action':'nilai','id_jadwal':2,'tanggal':'2026-10-30','id_aturan':ruleid,'alasan':'Kelas pembanding '+tag,'nilai[0000021][revision]':old['revision'] if old else 0,'nilai[0000021][tugas]':80,'nilai[0000021][uts]':80,'nilai[0000021][uas]':80,'nilai[0000021][praktik]':0,'nilai[0000021][proyek]':0,'nilai[0000021][deskripsi]':'Nilai fixture pembanding'})
 post(admin,{'action':'rapor_buat','id_tahun_ajaran':1,'nis':'0000021','tanggal':'2026-10-30','alasan':'Rapor cakupan pembanding '+tag});foreign=int(scalar('SELECT MAX(id) FROM ak_rapor_snapshot'))
 test('assigned_wali_cannot_read_other_class_snapshot',lambda:get(wali,'/academic/index.php?view=rapor&id='+str(foreign),403))
 test('assigned_wali_cannot_forge_other_class_review_POST',lambda:post(wali,{'action':'rapor_review','id':foreign,'revision':1,'keputusan':'disetujui','catatan':'Uji penolakan'},403))
 # A new class gives reproducible duty/wali and batch-import scopes without editing existing fixtures.
 post(admin,{'action':'create','nama_kelas':'FC '+tag,'tingkat':'XII','id_jurusan':1},path='/admin/master.php?table=kelas');cid=int(scalar('SELECT MAX(id_kelas) FROM kelas'))
 task={'action':'wali','id_tahun_ajaran':1,'id_guru':1,'id_kelas':cid,'mulai':'2026-07-01','selesai':'2026-12-31','catatan':'Tugas wali fixture '+tag}
 test('wali_assignment_create',lambda:post(admin,task));wid=int(scalar('SELECT MAX(id) FROM ak_wali_kelas'))
 test('wali_assignment_overlap_rejected',lambda:post(admin,task,422))
 test('wali_assignment_update_unused',lambda:post(admin,{**task,'id':wid,'selesai':'2026-12-30'}))
 test('wali_assignment_revocation_persists',lambda:post(admin,{**task,'id':wid,'operation':'cabut'}))
 nis1='007'+str(int(tag,16)).zfill(8);nis2='006'+str(int(tag,16)).zfill(8)
 for nis in [nis1,nis2]:post(admin,{'action':'create','nis':nis,'nama_siswa':'Siswa Completion '+nis,'jenis_kelamin':'P','tanggal_lahir':'2010-01-01','id_kelas':cid,'alamat':'Sintetis'},path='/admin/master.php?table=siswa')
 def upload(module,rows,extra=None,want=200,as_xlsx=False,b=admin):
  if as_xlsx:
   wb=Workbook();sheet=wb.active
   for row in rows:sheet.append(row)
   stream=io.BytesIO();wb.save(stream);content=stream.getvalue();filename='completion.xlsx'
  else:stream=io.StringIO();csv.writer(stream).writerows(rows);content=stream.getvalue().encode();filename='completion.csv'
  boundary='completion'+secrets.token_hex(8);parts=[];token=csrf(b.request('/auth/change_password.php')[2].decode());data={'csrf_token':token,'action':'impor_preview','module':module,'id_tahun_ajaran':1,'alasan':'Impor completion '+tag,**(extra or {})}
  for k,v in data.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
  parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="berkas"; filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode()+content+f'\r\n--{boundary}--\r\n'.encode())
  r=b.request('/academic/index.php?view=impor&module='+module,'POST',b''.join(parts),{'Content-Type':'multipart/form-data; boundary='+boundary});check(r[0]==want,'Import HTTP '+str(r[0])+' expected '+str(want))
  if want==200:return re.search(rb'name="preview_token" value="([a-f0-9]+)"',r[2]).group(1).decode()
 def commit(token,verified=False,want=302):return post(admin,{'action':'impor_commit','preview_token':token,'konfirmasi':'1',**({'terverifikasi':'1'} if verified else {})},want)
 ah=['nis','id_kelas','nomor_absen','mulai','selesai'];ar=[[nis1,str(cid),'1','2026-07-01','2026-12-31'],[nis2,str(cid),'2','2026-07-01','2026-12-31']]
 test('member_batch_duplicate_roll_rejected',lambda:upload('anggota',[ah,ar[0],[nis2,str(cid),'1','2026-07-01','2026-12-31']],want=422))
 before=int(scalar('SELECT COUNT(*) FROM ak_anggota_kelas'));token=upload('anggota',[ah,*ar],as_xlsx=True)
 test('member_xlsx_preview_does_not_persist',lambda:check(int(scalar('SELECT COUNT(*) FROM ak_anggota_kelas'))==before))
 test('member_xlsx_commit_and_readback',lambda:(commit(token),check(int(scalar('SELECT COUNT(*) FROM ak_anggota_kelas WHERE id_kelas=?',[cid]))==2)))
 test('member_import_existing_overlap_rejected',lambda:upload('anggota',[ah,*ar],want=422))
 test('teacher_cannot_import_membership',lambda:upload('anggota',[ah,*ar],want=403,b=teacher))
 post(admin,{'action':'create','nip':'FC-'+tag,'nama_guru':'Guru Completion '+tag,'email':'','no_hp':''},path='/admin/master.php?table=guru');gid=int(scalar('SELECT MAX(id_guru) FROM guru'))
 ph=['id_guru','id_mapel','id_kelas','hari','jam_mulai','jam_selesai','ruang','mulai','selesai','catatan'];pr=[str(gid),'1',str(cid),'Jumat','13:00','14:00','FC-'+tag,'2026-07-01','2026-12-31','Verifikasi fixture '+tag]
 test('assignment_import_overlap_inside_batch_rejected',lambda:upload('penugasan',[ph,pr,[*pr[:4],'13:30','14:30',*pr[6:]]],want=422))
 token=upload('penugasan',[ph,pr]);test('assignment_import_requires_administrative_verification',lambda:commit(token,want=422))
 test('assignment_csv_commit_creates_schedule_and_window_atomically',lambda:commit(token,True))
 test('assignment_import_database_readback',lambda:check(one('SELECT p.terverifikasi,j.id_tahun_ajaran FROM ak_penugasan p JOIN jadwal j ON j.id_jadwal=p.id_jadwal WHERE j.id_guru=? AND j.id_kelas=?',[gid,cid])=={'terverifikasi':1,'id_tahun_ajaran':1}))
 test('assignment_duplicate_database_rejected',lambda:upload('penugasan',[ph,pr],want=422))
 test('assignment_legacy_id_header_not_accepted',lambda:upload('penugasan',[['id_jadwal',*ph],['5',*pr]],want=422))
 # Decode real exported files and assert their contents correspond to persisted source records.
 mid=int(scalar("SELECT id FROM ak_pertemuan WHERE id_jadwal=1 AND tanggal='2026-10-30'"))
 calendar_title='Kegiatan PDF nyata '+tag;post(admin,{'action':'kalender','id_tahun_ajaran':1,'revision':0,'mulai':'2026-11-05','selesai':'2026-11-05','judul':calendar_title,'jenis':'Agenda','status':'draft','catatan':'Fixture completion'})
 for kind,b,params,expected in [
  ('jurnal',teacher,{'id':mid},['JURNAL KEGIATAN BELAJAR MENGAJAR','Siswa Uji 04','0000001']),
  ('agenda',teacher,{'id_tahun_ajaran':1},['BUKU AGENDA HARIAN GURU','Siswa Uji 04','Refleksi KBM']),
  ('harian',piket,{'id_kelas':1,'id_tahun_ajaran':1,'mulai':'2026-10-30','selesai':'2026-10-30'},['0000001','Siswa Uji 04']),
  ('nilai',teacher,{'id_jadwal':1},['0000001','Siswa Uji 01']),
  ('rapor',student,{'id':rid},['0000001','Pemrograman','Basis Data']),
  ('kalender',admin,{'id_tahun_ajaran':1},[calendar_title])]:
  def decoded(kind=kind,b=b,params=params,expected=expected):
   r=get(b,'/academic/export.php?'+urllib.parse.urlencode({'kind':kind,'format':'pdf',**params}));reader=PdfReader(io.BytesIO(r[2]));text=re.sub(r'\s+','',unicodedata.normalize('NFKC',' '.join(page.extract_text()for page in reader.pages)));check(all(re.sub(r'\s+','',word) in text for word in expected),'Decoded PDF missing persisted source text');(STATE/'reports'/('completion-'+kind+'.pdf')).write_bytes(r[2])
  test('PDF_readback_contents_'+kind,decoded)
  def spreadsheet(kind=kind,b=b,params=params):
   r=get(b,'/academic/export.php?'+urllib.parse.urlencode({'kind':kind,'format':'xlsx',**params}));sheet=load_workbook(io.BytesIO(r[2])).active;check(sheet.max_row>1);check(not any(c.data_type=='f' for row in sheet for c in row))
  test('XLSX_readback_'+kind,spreadsheet)
 # Old previews cannot be committed after a different invalid upload.
 token=upload('penugasan',[ph,[*pr[:4],'15:00','16:00',*pr[6:]]])
 upload('penugasan',[ph,pr],want=422)
 test('failed_new_upload_invalidates_previous_preview',lambda:commit(token,True,422))
 for actor,name in [(admin,'admin'),(head,'head')]:
  def grade_summary(actor=actor):
   r=get(actor,'/academic/export.php?kind=nilai&format=xlsx&id_tahun_ajaran=1&id_kelas=1&id_mapel=1');sheet=load_workbook(io.BytesIO(r[2])).active;rows=list(sheet.values);check(any(x[0]=='0000001' for x in rows[1:]));check(all(x[2]=='XII PPLG 2' and 'Pemrograman' in x[3] for x in rows[1:]))
  test('filtered_grade_export_readback_'+name,grade_summary)
 test('header_is_black_and_S2_removed',lambda:check(b'.navbar.bg-navy{background:#111111' in get(Browser(),'/index.php')[2] and b'>S2<' not in get(Browser(),'/index.php')[2]))
 report={'passed':sum(x['status']=='PASS'for x in results),'failed':sum(x['status']=='FAIL'for x in results),'skipped':0,'tests':results,'fixture_only':True,'pdf_readback':'pypdf extract_text, expected persisted identifiers/content'};(STATE/'reports/completion-http-tests.json').write_text(json.dumps(report,indent=2)+'\n');print(f"{report['passed']} PASS, {report['failed']} FAIL, 0 SKIP");return int(report['failed']>0)

if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:print('FAIL completion runner '+type(e).__name__+'; private detail omitted.',file=sys.stderr);sys.exit(2)
