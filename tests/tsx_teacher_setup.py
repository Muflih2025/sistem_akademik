#!/usr/bin/env python3
"""Create-only teacher regression sandbox; copies schema metadata, never school rows."""
from pathlib import Path
import sqlite3,shutil,os,secrets,json,subprocess,hashlib,argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--state',type=Path,default=Path.home()/'.local/state/sia-teacher-fixes-20261104/review')
parser.add_argument('--port',type=int,default=18128)
parser.add_argument('--serve',action='store_true')
parser.add_argument('--webpack',action='store_true',help='Optional Webpack reproduction; default matches pnpm dev (Turbopack)')
parser.add_argument('--paperless',action='store_true',help='Add 18 synthetic members for the 20-student physical-book acceptance audit')
args=parser.parse_args()
if not 1024 <= args.port <= 65535:parser.error('--port must be between 1024 and 65535')
os.umask(0o077)
root=Path(__file__).resolve().parents[1];state=args.state.expanduser().resolve()
if state==root or root in state.parents:parser.error('--state must be outside the repository')
state.mkdir(mode=0o700,exist_ok=True)
app=state/'app'
if app.exists():raise SystemExit('Review copy already exists; preserved. Use its existing synthetic fixture, never reset the original database.')
app.mkdir(mode=0o700)
for name in ['src','public','package.json','tsconfig.json','next-env.d.ts','next.config.ts','postcss.config.mjs']:
 p=root/name
 if p.is_dir():shutil.copytree(p,app/name)
 elif p.exists():shutil.copy2(p,app/name)
(app/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
# The repository itself needs no extra root. Only this external sandbox links
# dependencies from elsewhere; use the documented narrow additional-root option.
config=app/'next.config.ts'
config.write_text(config.read_text().replace('reactStrictMode: true,', 'reactStrictMode: true,\n  turbopack: { root: '+json.dumps(str(app))+' },\n  experimental: { turbopackAdditionalRoots: { fixtureDependencies: { path: '+json.dumps(str(root))+' } } },'))
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

# Add only synthetic data required by the teacher bug regression.
fixture=sqlite3.connect(app/'data/sia.db')
def add(table,**row):
 fixture.execute('INSERT INTO '+table+'('+','.join(row)+') VALUES('+','.join('?' for _ in row)+')',list(map(str,row.values())))
for sid,day in [(4,'Senin'),(5,'Selasa'),(6,'Rabu'),(7,'Kamis')]:
 add('jadwal',id_jadwal=sid,id_guru=1,id_mapel=1,id_kelas=1,hari=day,jam_mulai='07:40',jam_selesai='09:00',ruang='A1',id_tahun_ajaran=1,status='aktif')
 add('ak_penugasan',id_jadwal=sid,mulai='2026-07-01',selesai='2026-12-31',terverifikasi=1)
for mid,gid,cid in [(1,1,1),(2,1,1),(2,2,2)]:
 add('ak_aturan_nilai',id=f'rule-{gid}-{mid}',id_tahun_ajaran=1,id_kelas=cid,id_mapel=mid,id_guru=gid,versi=1,bobot_json=json.dumps(dict(tugas=30,uts=30,uas=40,praktik=0,proyek=0)),kkm=75,formula='weighted_kkm_v1')
add('guru',id_guru=3,nama_guru='Guru Piket Review',status='aktif')
add('users',id_user=6,username='uji_piket',password=hashed,role='guru',id_referensi=3,status='aktif')
add('ak_tugas_piket',id='task-review',id_guru=3,id_tahun_ajaran=1,id_kelas=0,mulai='2026-07-01',selesai='2026-12-31',aktif=1,boleh_koreksi=0)
add('ak_nilai',id='old-period',nis=9000001,id_anggota=1,id_tahun_ajaran=2,id_kelas=1,id_mapel=1,id_guru=1,komponen_json='{}',nilai_akhir='60')
if args.paperless:
 for number in range(3,21):
  nis='98000'+str(number).zfill(2)
  add('siswa',nis=nis,nama_siswa='Siswa Paper '+str(number).zfill(2),jenis_kelamin='L',id_kelas=1,status='aktif')
  add('ak_anggota_kelas',id='paper-'+str(number),nis=nis,id_kelas=1,id_tahun_ajaran=1,nomor_absen=number,mulai='2026-07-01',selesai='2026-12-31',created_by=1)
fixture.commit();fixture.close()
print('Synthetic Mon–Fri schedules, grade rules and duty account added.')
server_args=[str(root/'node_modules/next/dist/bin/next'),'dev',*(['--webpack'] if args.webpack else []),'--hostname','127.0.0.1','--port',str(args.port)]
# Restart this same sandbox without resetting its database or exposing its secret.
(state/'serve.cjs').write_text("const fs=require('fs'),p=require('path'),cp=require('child_process');\n"
 "const secret=JSON.parse(fs.readFileSync(p.join(__dirname,'private.json')));\n"
 "const child=cp.spawn(process.execPath,"+json.dumps(server_args)+",{cwd:p.join(__dirname,'app'),stdio:'inherit',env:{...process.env,SESSION_SECRET:secret.session_secret,NEXT_TELEMETRY_DISABLED:'1'}});\n"
 "for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>child.kill(sig));\n"
 "child.on('exit',code=>process.exit(code??0));\n")
if args.serve:
 os.chdir(app);os.environ['SESSION_SECRET']=json.loads((state/'private.json').read_text())['session_secret'];os.environ['NEXT_TELEMETRY_DISABLED']='1'
 os.execvp('node',['node',*server_args])
