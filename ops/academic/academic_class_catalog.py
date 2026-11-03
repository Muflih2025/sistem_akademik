#!/usr/bin/env python3
"""Create-only class catalogue explicitly requested by the user, development only."""
import argparse,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tests'));sys.path.insert(0,str(ROOT/'ops'))
from academic_http import STATE,Browser,csrf
from r0_environment import save_json

def main():
 os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');p.add_argument('--expected-database',required=True);args=p.parse_args()
 cfg=json.loads((STATE/'private/runtime.json').read_text());assert cfg['APP_ENV']=='testing' and cfg['DB_NAME']==args.expected_database=='sia_academic_dev_20261031' and cfg.get('DB_SOCKET') and cfg['DB_USER']!='root'
 def db(sql,params=None):
  r=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private/inspector.json')],input=json.dumps({'sql':sql,'args':params or []}).encode(),capture_output=True);assert r.returncode==0;return json.loads(r.stdout)
 expected=[(level,program,n)for level in ['X','XI','XII']for program in ['PPLG','AKL','PM','MPLB']for n in [1,2,3]]
 majors={p:db("SELECT id_jurusan FROM jurusan WHERE kode_jurusan=? AND status='aktif'",[p])[0]['id_jurusan']for p in ['PPLG','AKL','PM','MPLB']}
 b=None;created=0
 if args.apply:
  c=json.loads((STATE/'private/test-accounts.json').read_text());b=Browser();r=b.request('/auth/login.php');assert b.request('/auth/login.php','POST',{'csrf_token':csrf(r[2].decode()),'username':c['admin'],'password':c['password']})[0]==302
 for level,program,n in expected:
  name=f'{level} {program} {n}';old=db('SELECT * FROM kelas WHERE nama_kelas=?',[name])
  if old:assert len(old)==1 and old[0]['tingkat']==level and old[0]['id_jurusan']==majors[program] and old[0]['status']=='aktif','Existing class differs; no overwrite'
  elif args.apply:
   token=csrf(b.request('/auth/change_password.php')[2].decode());r=b.request('/admin/master.php?table=kelas','POST',{'csrf_token':token,'action':'create','nama_kelas':name,'tingkat':level,'id_jurusan':majors[program]});assert r[0]==302;created+=1
 if args.apply:
  for level,program,n in expected:assert len(db("SELECT id_kelas FROM kelas WHERE nama_kelas=? AND status='aktif'",[f'{level} {program} {n}']))==1
  save_json(STATE/'reports/class-catalog.json',{'status':'PASS','expected_classes':36,'created_this_run':created,'existing_rows_overwritten':0,'student_or_teacher_assignments_created':0,'basis':'User explicitly confirmed X/XI/XII, PPLG/AKL/PM/MPLB, parallel 1/2/3'})
 print(json.dumps({'status':'PASS'if args.apply else'preview','classes':36,'created':created,'overwrites':0}))
if __name__=='__main__':
 try:main()
 except Exception:print('Class catalogue refused; existing data preserved, private details omitted.',file=sys.stderr);sys.exit(1)
