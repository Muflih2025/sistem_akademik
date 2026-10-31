#!/usr/bin/env python3
"""Sequential verification of legacy compatibility and the current staff policy."""
import argparse,json,os,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
STATE=Path('/home/muflih/.local/state/sia-academic-dev/20261031')

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--baseline-directory');parser.add_argument('--with-kelas10',action='store_true');parser.add_argument('--with-progression',action='store_true');parser.add_argument('--with-bulk-master',action='store_true');parser.add_argument('--with-staff',action='store_true');options=parser.parse_args()
 os.umask(0o077);cfgpath=STATE/'private/runtime.json';config=json.loads(cfgpath.read_text());assert config['DB_NAME']=='sia_academic_dev_20261031'and config['APP_ENV']=='testing'and config.get('DB_SOCKET')
 env={**os.environ,'PLAYWRIGHT_BROWSERS_PATH':config['PDF_BROWSERS_PATH'],'LD_LIBRARY_PATH':config['PDF_LIBRARY_PATH']}
 suites=[('http',['python3','tests/academic_http.py'],'academic-http-tests.json'),('edges',['python3','tests/academic_edges.py'],'academic-edge-tests.json'),('completion',['python3','tests/academic_completion_http.py'],'completion-http-tests.json'),('functional-browser',['node','tests/academic_functional_browser.cjs'],'functional-browser-tests.json'),('browser',['node','tests/academic_browser.cjs'],'academic-browser-tests.json'),('login',['node','tests/login_layout.cjs'],'login-layout-tests.json')]
 if options.with_kelas10:suites.extend([('kelas10',['python3','tests/academic_kelas10.py'],'kelas10-tests.json'),('kelas10-browser',['node','tests/academic_kelas10.cjs'],'kelas10-browser-tests.json')])
 if options.with_progression:suites.extend([('progression-http',['python3','tests/academic_progression.py'],'progression-http-tests.json'),('progression-browser',['node','tests/academic_progression.cjs'],'progression-browser-tests.json')])
 if options.with_bulk_master:suites.extend([('bulk-master-http',['python3','tests/academic_bulk_master.py'],'bulk-master-http-tests.json'),('bulk-master-browser',['node','tests/academic_bulk_master.cjs'],'bulk-master-browser-tests.json')])
 if options.with_staff:suites.extend([('staff-http',['python3','tests/academic_staff.py'],'staff-http-tests.json'),('staff-browser',['node','tests/academic_staff.cjs'],'staff-browser-tests.json'),('module-upload',['node','tests/academic_module_upload.cjs'],'module-upload-tests.json')])
 integrity=['python3','tests/academic_integrity.py']
 if options.baseline_directory:integrity.extend(['--baseline-directory',options.baseline_directory])
 suites.append(('integrity',integrity,'academic-integrity-tests.json'))
 keys=['HOMEROOM_MODE','ROOM_CATALOG_ENFORCED','ADMIN_BULK_ONLY'];original={k:config.get(k)for k in keys};compat=False
 def policy(legacy):
  c=json.loads(cfgpath.read_text());desired={'HOMEROOM_MODE':'review','ROOM_CATALOG_ENFORCED':'0','ADMIN_BULK_ONLY':'0'}if legacy else original
  for k,v in desired.items():
   if v is None:c.pop(k,None)
   else:c[k]=v
  cfgpath.write_text(json.dumps(c,indent=2)+'\n');r=subprocess.run(['python3',str(ROOT/'ops/academic_server.py'),'refresh'],capture_output=True);assert r.returncode==0,'Local policy refresh failed; private context omitted'
 reports=[]
 try:
  if options.with_staff:policy(True);compat=True
  for name,args,file in suites:
   if compat and name in ['bulk-master-http','bulk-master-browser','staff-http','staff-browser','integrity']:policy(False);compat=False
   start=time.time();log=STATE/'reports'/(name+'-latest.log')
   with log.open('w')as out:r=subprocess.run(args,cwd=ROOT,env=env,stdout=out,stderr=subprocess.STDOUT)
   path=STATE/'reports'/file
   if path.exists()and path.stat().st_mtime>=start:
    data=json.loads(path.read_text());entry={'suite':name,'passed':data['passed'],'failed':data['failed'],'skipped':data['skipped'],'exit_code':r.returncode,'report':file}
   else:entry={'suite':name,'passed':0,'failed':1,'skipped':0,'exit_code':r.returncode,'report':file,'runner_failure':True}
   if r.returncode and entry['failed']==0:entry['failed']=1;entry['runner_failure']=True
   entry['policy']='legacy_review_compatibility'if compat else'configured_current_policy';reports.append(entry);print(f"{name}: {entry['passed']} PASS, {entry['failed']} FAIL, {entry['skipped']} SKIP ({entry['policy']})",flush=True)
   if r.returncode or entry['failed']:break
 finally:
  current=json.loads(cfgpath.read_text())
  if options.with_staff and any(current.get(k)!=original[k]for k in keys):policy(False)
 summary={'passed':sum(x['passed']for x in reports),'failed':sum(x['failed']for x in reports),'skipped':sum(x['skipped']for x in reports),'suites':reports,'all_suites_executed':len(reports)==len(suites),'database':config['DB_NAME'],'url':'http://127.0.0.1:18125','active_8085_modified':False,'configured_policy_restored':all(json.loads(cfgpath.read_text()).get(k)==original[k]for k in keys),'policy_note':'Legacy review-gate tests explicitly run in compatibility mode; bulk/staff/integrity suites prove the configured current policy. No policy is changed on 8085.'}
 (STATE/'reports/academic-suite-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(f"TOTAL {summary['passed']} PASS, {summary['failed']} FAIL, {summary['skipped']} SKIP",flush=True);return 1 if summary['failed']or not summary['all_suites_executed']else 0
if __name__=='__main__':sys.exit(main())
