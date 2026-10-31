#!/usr/bin/env python3
"""Sequential reproducible verification of the isolated academic development app."""
import json,os,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
STATE=Path('/home/muflih/.local/state/sia-academic-dev/20261031')

def main():
 os.umask(0o077);config=json.loads((STATE/'private/runtime.json').read_text())
 assert config['DB_NAME']=='sia_academic_dev_20261031' and config['APP_ENV']=='testing' and config.get('DB_SOCKET')
 env={**os.environ,'PLAYWRIGHT_BROWSERS_PATH':config['PDF_BROWSERS_PATH'],'LD_LIBRARY_PATH':config['PDF_LIBRARY_PATH']}
 suites=[('http',['python3','tests/academic_http.py'],'academic-http-tests.json'),('edges',['python3','tests/academic_edges.py'],'academic-edge-tests.json'),('completion',['python3','tests/academic_completion_http.py'],'completion-http-tests.json'),('functional-browser',['node','tests/academic_functional_browser.cjs'],'functional-browser-tests.json'),('browser',['node','tests/academic_browser.cjs'],'academic-browser-tests.json'),('login',['node','tests/login_layout.cjs'],'login-layout-tests.json'),('integrity',['python3','tests/academic_integrity.py'],'academic-integrity-tests.json')]
 reports=[]
 for name,args,file in suites:
  start=time.time();log=STATE/'reports'/(name+'-latest.log')
  with log.open('w')as output:r=subprocess.run(args,cwd=ROOT,env=env,stdout=output,stderr=subprocess.STDOUT)
  report_path=STATE/'reports'/file
  if report_path.exists() and report_path.stat().st_mtime>=start:
   data=json.loads(report_path.read_text());entry={'suite':name,'passed':data['passed'],'failed':data['failed'],'skipped':data['skipped'],'exit_code':r.returncode,'report':file}
  else:entry={'suite':name,'passed':0,'failed':1,'skipped':0,'exit_code':r.returncode,'report':file,'runner_failure':True}
  if r.returncode and entry['failed']==0:entry['failed']=1;entry['runner_failure']=True
  reports.append(entry);print(f"{name}: {entry['passed']} PASS, {entry['failed']} FAIL, {entry['skipped']} SKIP",flush=True)
  # A failed suite can leave scoped fixtures incomplete. Preserve all evidence;
  # never reset the DB and do not certify later suites against a partial run.
  if r.returncode or entry['failed']:break
 summary={'passed':sum(x['passed']for x in reports),'failed':sum(x['failed']for x in reports),'skipped':sum(x['skipped']for x in reports),'suites':reports,'all_suites_executed':len(reports)==len(suites),'database':config['DB_NAME'],'url':'http://127.0.0.1:18125','active_8085_modified':False}
 (STATE/'reports/academic-suite-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
 print(f"TOTAL {summary['passed']} PASS, {summary['failed']} FAIL, {summary['skipped']} SKIP",flush=True)
 return 1 if summary['failed']or not summary['all_suites_executed']else 0

if __name__=='__main__':sys.exit(main())
