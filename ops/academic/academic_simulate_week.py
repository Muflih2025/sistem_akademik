#!/usr/bin/env python3
"""Curated 26–30 October demo, using real application POSTs, never a reset.

Prepare creates only the documented synthetic core's schedules/meetings/grades.
Finalize reconciles daily records and publishes example reports after browser edits.
"""
import argparse, json, os, pathlib, subprocess, sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
STATE=pathlib.Path('/home/muflih/.local/state/sia-academic-dev/20261031')
sys.path.insert(0,str(ROOT/'tests'))
from academic_http import Browser,csrf

def main():
 os.umask(0o077);parser=argparse.ArgumentParser();parser.add_argument('phase',choices=['prepare','finalize']);options=parser.parse_args()
 cfg=json.loads((STATE/'private/runtime.json').read_text());assert cfg['APP_ENV']=='testing'and cfg['DB_NAME']=='sia_academic_dev_20261031'and cfg.get('DB_SOCKET')and cfg['DB_USER']!='root'
 assert json.loads((STATE/'reports/cleanup-applied.json').read_text())['status']=='PASS'
 creds=json.loads((STATE/'private/test-accounts.json').read_text())
 def db(sql,args=[]):
  p=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private/inspector.json')],input=json.dumps({'sql':sql,'args':args}),capture_output=True,text=True);assert p.returncode==0,'Private database inspection failed';return json.loads(p.stdout)
 def login(key):
  b=Browser();r=b.request('/auth/login.php');assert b.request('/auth/login.php','POST',{'csrf_token':csrf(r[2].decode()),'username':creds[key],'password':creds['password']})[0]==302;return b
 def post(b,data,path='/akademik'):
  r=b.request(path);assert r[0]==200,'Form inaccessible'
  out=b.request(path,'POST',{'csrf_token':csrf(r[2].decode()),**data})
  assert out[0]==302,'Application rejected demo operation: '+str(out[0]);return out
 reportpath=STATE/'reports/simulation-week.json';admin=login('admin');g1=login('teacher');g2=login('other_teacher');piket=login('duty')
 days=[('Senin','2026-10-26','07:40','09:00'),('Selasa','2026-10-27','07:00','08:20'),('Rabu','2026-10-28','07:00','08:20'),('Kamis','2026-10-29','07:00','08:20'),('Jumat','2026-10-30','07:45','08:45')]
 if options.phase=='prepare':
  if reportpath.exists():raise RuntimeError('Demo already exists; no reset/reseed permitted')
  assert db('SELECT COUNT(*) n FROM siswa')[0]['n']==411 and db('SELECT COUNT(*) n FROM kelas')[0]['n']==36
  assert not db('SELECT id FROM ak_pertemuan'),'Expected reviewed cleanup state'
  protected={}
  ledger=json.loads((STATE/'private/kelas10-0edb2f32099e.json').read_text())['mapping'];excel=[r['nis']for r in ledger]
  for t in ['siswa','ak_anggota_kelas']:
   protected[t]=db('SELECT * FROM '+t+' WHERE nis IN('+','.join('?'for _ in excel)+') ORDER BY nis',excel)
  for t in ['kelas','jurusan','ak_ruang','ak_jam_belajar']:
   protected[t]=db('SELECT * FROM '+t+' ORDER BY 1')
  (STATE/'private/simulation-school-protected.json').write_text(json.dumps(protected,ensure_ascii=False))
  # The NULL-period record is a synthetic negative fixture, not any of the
  # 18 original assignments in the untouched active database.
  post(admin,{'action':'deactivate','id_jadwal':5},'/admin/penugasan.php')
  schedules=[]
  for day,date,start,until in days:
   for teacher,klass,subject,room,core in [(1,1,1,'Lab PPLG 1',1 if day=='Jumat'else 3 if day=='Senin'else None),(2,2,2,'A1',2 if day=='Jumat'else None)]:
    body={'action':'update'if core else'create','id_guru':teacher,'id_kelas':klass,'id_mapel':subject,'id_tahun_ajaran':1,'hari':day,'jam_mulai':start,'jam_selesai':until,'ruang':room}
    if core:body['id_jadwal']=core
    post(admin,body,'/admin/penugasan.php');sid=core or db('SELECT MAX(id_jadwal) id FROM jadwal WHERE id_guru=? AND id_kelas=? AND hari=?',[teacher,klass,day])[0]['id']
    post(admin,{'action':'penugasan','id_jadwal':sid,'mulai':'2026-10-26','selesai':'2026-10-30','terverifikasi':1,'catatan':'SIMULASI 5 HARI, penugasan demo eksplisit bukan jadwal sekolah resmi'})
    schedules.append({'id':sid,'teacher':teacher,'class':klass,'subject':subject,'day':day,'date':date,'start':start,'until':until,'room':room,'fill':not(teacher==2 and day in ['Rabu','Jumat'])})
  post(admin,{'action':'update','id_jadwal':4,'id_guru':2,'id_kelas':1,'id_mapel':2,'id_tahun_ajaran':1,'hari':'Jumat','jam_mulai':'08:45','jam_selesai':'09:45','ruang':'Lab PPLG 1'},'/admin/penugasan.php')
  post(admin,{'action':'penugasan','id_jadwal':4,'mulai':'2026-10-26','selesai':'2026-10-30','terverifikasi':1,'catatan':'SIMULASI 5 HARI, sesi lanjutan jam 3–4'})
  schedules.append({'id':4,'teacher':2,'class':1,'subject':2,'day':'Jumat','date':'2026-10-30','start':'08:45','until':'09:45','room':'Lab PPLG 1','fill':True})
  wid=db("SELECT id_referensi FROM users WHERE username='uji_wali'")[0]['id_referensi']
  post(admin,{'action':'wali','id_guru':wid,'id_kelas':1,'id_tahun_ajaran':1,'mulai':'2026-07-01','selesai':'2026-12-31','catatan':'Wali informasi kelas simulasi'})
  statuses={
   'Senin':{4:'S',5:'I'},'Selasa':{7:'A'},'Rabu':{4:'S',8:'B'},'Kamis':{},'Jumat':{4:'S',5:'I'}
  }
  for s in schedules:
   if not s['fill']:continue
   b=g1 if s['teacher']==1 else g2;roster=db('SELECT nis,nomor_absen FROM ak_anggota_kelas WHERE id_kelas=? AND id_tahun_ajaran=1 ORDER BY nomor_absen',[s['class']]);sample=statuses[s['day']]if s['class']==1 else({2:'I'}if s['day']=='Selasa'else{2:'S'}if s['day']=='Kamis'else{})
   body={'action':'pertemuan','id_jadwal':s['id'],'tanggal':s['date'],'revision':0,'pertemuan_ke':1+next(i for i,d in enumerate(days)if d[0]==s['day']),'jam_ke':'3–4'if s['id']==4 else'1–2','tp_atp':'Simulasi TP/ATP '+s['day'],'materi':'Simulasi '+s['day']+': dekomposisi masalah','kegiatan':'Diskusi dan latihan kelas simulasi','refleksi':'Kemajuan siswa dicatat pada simulasi '+s['day'],'tindak_lanjut':'Latihan pertemuan berikutnya','catatan':'SIMULASI, bukan catatan sekolah nyata','id_guru_pengganti':'','alasan':'Simulasi lima hari melalui backend nyata','terverifikasi':1}
   for pupil in roster:
    code=sample.get(pupil['nomor_absen'],'H');body['status['+pupil['nis']+']']=code;body['keterangan['+pupil['nis']+']']='Belum ada konfirmasi'if code=='B'else'Uji '+code if code!='H'else''
   post(b,body,'/absensi?id_jadwal='+str(s['id'])+'&tanggal='+s['date']);s['meeting_id']=db('SELECT id FROM ak_pertemuan WHERE id_jadwal=? AND tanggal=?',[s['id'],s['date']])[0]['id']
  grade_scopes=[next(s for s in schedules if s['teacher']==1),next(s for s in schedules if s['teacher']==2 and s['class']==2),next(s for s in schedules if s['id']==4)]
  for s in grade_scopes:
   b=g1 if s['teacher']==1 else g2;body={'action':'aturan_nilai','id_jadwal':s['id'],'tanggal':s['date'],'bobot_tugas':30,'bobot_uts':30,'bobot_uas':40,'bobot_praktik':0,'bobot_proyek':0,'catatan':'Konfigurasi nilai simulasi lima hari'};post(b,body,'/nilai?id_jadwal='+str(s['id'])+'&tanggal='+s['date']);rule=db('SELECT MAX(id) id FROM ak_aturan_nilai WHERE id_guru=? AND id_kelas=? AND id_mapel=?',[s['teacher'],s['class'],s['subject']])[0]['id'];body={'action':'nilai','id_jadwal':s['id'],'tanggal':s['date'],'id_aturan':rule,'alasan':'Input nilai cohort simulasi'}
   for i,pupil in enumerate(db('SELECT nis FROM ak_anggota_kelas WHERE id_kelas=? AND id_tahun_ajaran=1 ORDER BY nomor_absen',[s['class']])):
    value=(80 if s['teacher']==1 else 85)+i%5
    for k,v in {'revision':0,'tugas':value,'uts':value,'uas':value,'praktik':0,'proyek':0,'deskripsi':'Capaian pembelajaran simulasi'}.items():body['nilai['+pupil['nis']+']['+k+']']=v
   post(b,body,'/nilai?id_jadwal='+str(s['id'])+'&tanggal='+s['date'])
  post(admin,{'action':'kalender','id_tahun_ajaran':1,'revision':0,'judul':'Simulasi: evaluasi kegiatan belajar','mulai':'2026-10-29','selesai':'2026-10-29','jenis':'Agenda','status':'disahkan','catatan':'Agenda testing, tidak mengubah hari efektif'},'/kalender?id_tahun_ajaran=1&bulan=2026-10')
  report={'phase':'prepared','days':[d[1]for d in days],'schedules':schedules,'curated_students':22,'excel_students_preserved':389,'filled':9,'unfilled':2,'class_1_expected':{'2026-10-26':{'H':18,'S':1,'I':1,'A':0,'B':0},'2026-10-27':{'H':19,'S':0,'I':0,'A':1,'B':0},'2026-10-28':{'H':18,'S':1,'I':0,'A':0,'B':1},'2026-10-29':{'H':20,'S':0,'I':0,'A':0,'B':0},'2026-10-30':{'H':18,'S':1,'I':1,'A':0,'B':0}}};reportpath.write_text(json.dumps(report,indent=2)+'\n');print('PASS prepared: 11 schedules, 9 journals, 2 deliberately unfilled; 42 grades')
 else:
  report=json.loads(reportpath.read_text());assert report['phase']=='prepared','Already finalized; do not replay'
  for date in report['days']:
   for klass in [1,2]:post(piket,{'action':'rekonsiliasi','id_tahun_ajaran':1,'id_kelas':klass,'tanggal':date,'alasan':'Rekonsiliasi awal simulasi lima hari melalui Guru Piket'},'/piket?id_tahun_ajaran=1&id_kelas='+str(klass)+'&tanggal='+date)
  report['reports']=[]
  for nis in ['0000001','0000002']:
   post(admin,{'action':'rapor_buat','id_tahun_ajaran':1,'nis':nis,'tanggal':'2026-10-30','alasan':'Snapshot rapor simulasi setelah lima hari'},'/rapor');rid=db('SELECT MAX(id) id FROM ak_rapor_snapshot WHERE nis=?',[nis])[0]['id']
   for status in ['terverifikasi','diterbitkan']:
    rev=db('SELECT revision FROM ak_rapor_status WHERE id_snapshot=?',[rid])[0]['revision'];post(admin,{'action':'rapor_status','id':rid,'revision':rev,'status':status,'alasan':'Keputusan Admin pada rapor simulasi'},'/rapor?id='+str(rid))
   report['reports'].append({'id':rid,'nis':nis,'status':'diterbitkan'})
  protected=json.loads((STATE/'private/simulation-school-protected.json').read_text());excel=[r['nis']for r in protected['siswa']]
  for t,rows in protected.items():
   current=db('SELECT * FROM '+t+(' WHERE nis IN('+','.join('?'for _ in excel)+') ORDER BY nis'if t in ['siswa','ak_anggota_kelas']else' ORDER BY 1'),excel if t in ['siswa','ak_anggota_kelas']else[]);assert current==rows,'Protected school data changed'
  report.update({'phase':'finalized','daily_records':db('SELECT COUNT(*) n FROM ak_absensi_harian')[0]['n'],'school_data_unchanged':True});reportpath.write_text(json.dumps(report,indent=2)+'\n');print('PASS finalized: daily reconciliation and 2 published report snapshots; school records unchanged')

if __name__=='__main__':
 try:main()
 except Exception as e:print('FAIL week simulation '+type(e).__name__+'; '+str(e)if isinstance(e,(AssertionError,RuntimeError))else'FAIL private details omitted',file=sys.stderr);raise SystemExit(1)
