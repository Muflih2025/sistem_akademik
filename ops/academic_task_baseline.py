#!/usr/bin/env python3
"""Create-only before-work baseline accounting for the user's new input files."""
import hashlib,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'));sys.path.insert(0,str(ROOT/'ops'))
from r1_integrity import manifest
from r0_environment import snapshot,save_json

def main():
 os.umask(0o077);state=Path('/home/muflih/.local/state/sia-academic-dev/20261031');reports=state/'reports';output=reports/'kelas10-baseline'
 if output.exists():raise RuntimeError('Baseline already exists; never overwrite earlier evidence')
 current={name:manifest(Path(path)) for name,path in [('target','/home/muflih/sistem_akademik'),('source','/home/muflih/Sistem-Informasi-Akademik-Sekolah-Laravel'),('active-release','/home/muflih/.local/share/sia-releases/r0-531d2f8')]}
 old=json.loads((reports/'target-before.json').read_text());differences={key for key in old.keys()|current['target'].keys() if old.get(key)!=current['target'].get(key)}
 assert differences <= {'.gitignore','data kelas 10 clean.xlsx'},'Unexpected protected target change needs investigation'
 for name in ['source','active-release']:assert current[name]==json.loads((reports/(name+'-before.json')).read_text())
 active=snapshot(Path('/home/muflih/.local/state/sia-r0/activation-20261030/private/active-config.json'));assert active==json.loads((reports/'active-database-before.json').read_text())
 output.mkdir(mode=0o700)
 for name,data in current.items():save_json(output/(name+'-before.json'),data)
 save_json(output/'active-database-before.json',active)
 for name,args in [('git-target-before.txt',['git','-C','/home/muflih/sistem_akademik','status','--short']),('service-before.txt',['systemctl','show','sistem-akademik.service','--property=User','--property=ActiveState','--property=MainPID','--property=ExecMainStartTimestamp'])]:
  (output/name).write_bytes(subprocess.check_output(args));(output/name).chmod(0o600)
 (output/'service-before.sha256').write_text(hashlib.sha256(Path('/etc/systemd/system/sistem-akademik.service.d/90-r0.conf').read_bytes()).hexdigest())
 save_json(output/'user-input-differences.json',{'observed_before_this_task':sorted(differences),'agent_modified_these_files':False,'older_baselines_preserved':True})
 print('PASS new before-work baseline; user workbook/.gitignore preserved, source/release/active DB still match original audit.')
if __name__=='__main__':
 try:main()
 except Exception:sys.stderr.write('Baseline refused; no original baseline or protected data modified.\n');sys.exit(1)
