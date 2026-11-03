#!/usr/bin/env python3
"""Create-only external Next review copy using schema metadata and synthetic rows."""
from pathlib import Path
import sqlite3,shutil,os,secrets,json,subprocess,hashlib
os.umask(0o077)
root=Path(__file__).resolve().parents[1];state=Path.home()/'.local/state/sia-tsx-review-20261103';state.mkdir(mode=0o700,exist_ok=True)
app=state/'app'
if app.exists():raise SystemExit('Review copy already exists; preserved. Use its existing synthetic fixture, never reset the original database.')
app.mkdir(mode=0o700)
for name in ['src','public','package.json','tsconfig.json','next-env.d.ts','next.config.ts','postcss.config.mjs']:
 p=root/name
 if p.is_dir():shutil.copytree(p,app/name)
 elif p.exists():shutil.copy2(p,app/name)
(app/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
(app/'data').mkdir(mode=0o700)
for name in ['reports','screenshots']:(state/name).mkdir(mode=0o700)
source=sqlite3.connect('file:'+str(root/'data/sia.db')+'?mode=ro',uri=True)
source.row_factory=sqlite3.Row
schema=[r['sql']for r in source.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL")]
target=sqlite3.connect(app/'data/sia.db');target.row_factory=sqlite3.Row
for sql in schema:target.execute(sql)
def put(table,**data):
 cols=[r['name']for r in target.execute('PRAGMA table_info('+table+')')];data={k:str(v)for k,v in data.items()if k in cols};target.execute('INSERT INTO '+table+'('+','.join(data)+') VALUES('+','.join('?'for _ in data)+')',list(data.values()))
password=secrets.token_urlsafe(22)
r=subprocess.run(['node','-e','let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>process.stdout.write(require("bcryptjs").hashSync(s,10)));'],input=password.encode(),cwd=root,capture_output=True,check=True);hashed=r.stdout.decode()
accounts=[('1','uji_admin','admin',''),('2','uji_guru','guru','1'),('3','uji_guru_lain','guru','2'),('4','uji_kepsek','kepala_sekolah',''),('5','uji_siswa','siswa','9000001')]
for uid,username,role,ref in accounts:put('users',id_user=uid,username=username,password=hashed,role=role,id_referensi=ref,status='aktif')
put('jurusan',id_jurusan=1,kode_jurusan='PPLG',nama_jurusan='Program Uji')
for cid,name in [(1,'XII PPLG 2'),(2,'XII PPLG 1')]:put('kelas',id_kelas=cid,nama_kelas=name,tingkat='XII',id_jurusan=1,status='aktif')
for gid,name in [(1,'Guru Review Satu'),(2,'Guru Review Dua')]:put('guru',id_guru=gid,nip='REVIEW-'+str(gid),nama_guru=name,status='aktif')
for mid,name in [(1,'Mapel Review A'),(2,'Mapel Review B')]:put('mata_pelajaran',id_mapel=mid,kode_mapel='REV'+str(mid),nama_mapel=name,kkm=75,status='aktif')
put('tahun_ajaran',id_tahun_ajaran=1,tahun_ajaran='2026/2027',semester='Ganjil',status='Aktif',dikunci=0,rapor_diterbitkan=0)
put('ak_periode',id_tahun_ajaran=1,mulai='2026-07-01',selesai='2026-12-31',hari_efektif='1,2,3,4,5',terverifikasi=1,catatan='Fixture Review',updated_by=1)
for sid,gid,cid,mid in [(1,1,1,1),(2,2,2,2),(3,1,1,2)]:
 put('jadwal',id_jadwal=sid,id_guru=gid,id_mapel=mid,id_kelas=cid,hari='Jumat',jam_mulai='07:45',jam_selesai='08:45',ruang='A'+str(cid),id_tahun_ajaran=1,status='aktif')
 put('ak_penugasan',id_jadwal=sid,mulai='2026-07-01',selesai='2026-12-31',terverifikasi=1,catatan='Fixture',updated_by=1)
for i,cid,code in [(1,1,'H'),(2,1,'S'),(3,2,'I')]:
 nis='900000'+str(i);put('siswa',nis=nis,nama_siswa='Siswa Review '+str(i),jenis_kelamin='L',tanggal_lahir='2009-01-01',id_kelas=cid,status='aktif')
 put('ak_anggota_kelas',id=i,nis=nis,id_kelas=cid,id_tahun_ajaran=1,nomor_absen=i,mulai='2026-07-01',selesai='2026-12-31',created_by=1)
 put('ak_absensi_harian',id=i,nis=nis,id_kelas=cid,id_tahun_ajaran=1,id_anggota=i,tanggal='2026-10-30',status=code,created_by=2,updated_by=2,revision=1)
put('ak_rapor_snapshot',id=1,nis='9000001',id_tahun_ajaran=1,id_kelas=1,versi=1,payload_json=json.dumps({'siswa':{'nis':'9000001','nama':'Siswa Review 1'},'nilai':[]}),payload_hash='fixture',created_by=1)
put('ak_rapor_status',id_snapshot=1,status='draft',revision=1)
target.commit();target.close();source.close()
(state/'private.json').write_text(json.dumps({'password':password,'session_secret':secrets.token_hex(32)}))
def fingerprint():
 out={}
 for p in (root/'data').glob('sia.db*'):out[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
 return out
(state/'reports/original-db-before.json').write_text(json.dumps(fingerprint(),indent=2))
print('Isolated Next review copy and synthetic fixture created. No school rows copied; original DB hashes captured.')

# The review server is explicitly requested with --serve; no original server is managed.
if '--serve' in __import__('sys').argv:
 os.chdir(app);os.environ['SESSION_SECRET']=json.loads((state/'private.json').read_text())['session_secret'];os.environ['NEXT_TELEMETRY_DISABLED']='1'
 os.execvp('node',['node',str(root/'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','18128'])
