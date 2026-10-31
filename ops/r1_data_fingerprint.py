#!/usr/bin/env python3
"""Read-only fingerprints of original columns across an additive migration."""
import argparse,json,os,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'ops'))
from r0_environment import save_json
from r1_rehearsal import query,projection

def main():
    os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('action',choices=['capture','verify']);p.add_argument('--config',required=True);p.add_argument('--baseline',required=True);a=p.parse_args()
    config=Path(a.config).resolve();baseline=Path(a.baseline).resolve()
    assert ROOT not in baseline.parents and baseline.parent.stat().st_mode&0o077==0,'Private external baseline required'
    columns=query(config,'SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION')
    if a.action=='capture':
        assert not baseline.exists(),'Refusing to overwrite a baseline'
        identity=query(config,'SELECT DATABASE() AS database_name')[0]['database_name']
        save_json(baseline,{'columns':columns,'data':projection(config,columns),'database':identity});print('PASS: private read-only original-column baseline captured.')
    else:
        original=json.loads(baseline.read_text());identity=query(config,'SELECT DATABASE() AS database_name')[0]['database_name']
        valid=identity==original['database'] and all(c in columns for c in original['columns']) and original['data']==projection(config,original['columns'])
        print('PASS: original columns and row fingerprints unchanged.' if valid else 'FAIL: schema/data drift; stop and review without restoring over current data.')
        return not valid

if __name__=='__main__':sys.exit(main())
