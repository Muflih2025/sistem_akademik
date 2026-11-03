#!/usr/bin/env python3
"""Control only the protected localhost development runtime; no production targets."""
import argparse,subprocess,sys
from pathlib import Path

def main():
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['start','stop','restart','refresh','status']);args=parser.parse_args()
    root=Path(__file__).resolve().parents[2]
    result=subprocess.run(['sudo','-n','python3',str(root/'ops/academic/academic_runtime.py'),args.action],capture_output=True)
    if result.returncode:
        sys.stderr.write('Development runtime unavailable; install its isolated local unit using the documented command. No fallback or production restart.\n');return 1
    sys.stdout.buffer.write(result.stdout);return 0
if __name__=='__main__':sys.exit(main())
