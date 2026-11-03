#!/usr/bin/env python3
"""Append the user-provided room/laboratory catalogue through Admin CRUD."""
import json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'));sys.path.insert(0,str(ROOT/'ops'))
from academic_http import STATE,Browser,csrf
from r0_environment import save_json
def main():
 os.umask(0o077);cfg=json.loads((STATE/'private/runtime.json').read_text());assert cfg['APP_ENV']=='testing'and cfg['DB_NAME']=='sia_academic_dev_20261031'and cfg.get('DB_SOCKET')
 names=['A1','A2','A5','A9','A10','A11','B4','B8','B10','B15','B16','C1','C2','C4','C5','C6','C7','C8','C9','C10','Lab PPLG 1','Lab PPLG 2','Lab PPLG 3','KKPI 1','KKPI 2','Lab AKL','Lab Simulasi AKL','Lab Simulasi PM','Lab Bisnis'];assert len(names)==29
 c=json.loads((STATE/'private/test-accounts.json').read_text());b=Browser();r=b.request('/auth/login.php');assert b.request('/auth/login.php','POST',{'csrf_token':csrf(r[2].decode()),'username':c['admin'],'password':c['password']})[0]==302
 created=0
 for name in names:
  code=name.upper().replace(' ','-');kind='Laboratorium'if name.startswith(('Lab','KKPI'))else'Kelas'
  r=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private/inspector.json')],input=json.dumps({'sql':'SELECT * FROM ak_ruang WHERE kode_ruang=?','args':[code]}).encode(),capture_output=True);assert not r.returncode;old=json.loads(r.stdout)
  if old:assert len(old)==1 and old[0]['nama_ruang']==name and old[0]['jenis']==kind,'Refuse to overwrite changed room'
  else:
   r=b.request('/admin/master.php?table=ak_ruang','POST',{'csrf_token':csrf(b.request('/auth/change_password.php')[2].decode()),'action':'create','kode_ruang':code,'nama_ruang':name,'jenis':kind});assert r[0]==302;created+=1
 save_json(STATE/'reports/room-catalog.json',{'status':'PASS','rooms':29,'classrooms':20,'laboratories':9,'created':created,'existing_rows_overwritten':0,'A10_basis':'User list says 10; supplied map explicitly labels A10','names':names});print('PASS 29 room/lab references; no existing room or schedule overwritten')
if __name__=='__main__':
 try:main()
 except Exception:print('Room catalogue refused; private context omitted; no reset attempted.',file=sys.stderr);sys.exit(1)
