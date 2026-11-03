#!/usr/bin/env python3
"""Reproducible source-only release: Git commit + canonical manifest + gzip mtime=0."""
import argparse,gzip,hashlib,io,json,os,subprocess,sys,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def main():
    os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('--commit',required=True);p.add_argument('--output',required=True);a=p.parse_args()
    commit=subprocess.check_output(['git','-C',str(ROOT),'rev-parse',a.commit+'^{commit}']).decode().strip()
    assert subprocess.run(['git','-C',str(ROOT),'merge-base','--is-ancestor','042ea9c',commit]).returncode==0
    output=Path(a.output).resolve();assert not output.exists() and not output.is_relative_to(ROOT)
    epoch=int(subprocess.check_output(['git','-C',str(ROOT),'show','-s','--format=%ct',commit]))
    data={};modes={}
    for record in subprocess.check_output(['git','-C',str(ROOT),'ls-tree','-rz',commit]).split(b'\0'):
        if not record:continue
        meta,name=record.split(b'\t',1);mode,kind,blob=meta.split();name=name.decode();assert kind==b'blob' and mode in [b'100644',b'100755']
        assert not Path(name).is_absolute() and '..' not in Path(name).parts
        data[name]=subprocess.check_output(['git','-C',str(ROOT),'cat-file','blob',blob.decode()]);modes[name]=0o555 if mode==b'100755' else 0o444
    manifest={'commit':commit,'baseline_r0':'531d2f8','baseline_r1':'042ea9c197dde03e48031108657ecbb7aedd869c','format':'sia-reproducible-r15-v1','files':{name:hashlib.sha256(value).hexdigest() for name,value in sorted(data.items())}}
    data['RELEASE.json']=(json.dumps(manifest,sort_keys=True,indent=2)+'\n').encode();modes['RELEASE.json']=0o444
    memory=io.BytesIO()
    with tarfile.open(fileobj=memory,mode='w',format=tarfile.PAX_FORMAT) as archive:
        directories=sorted({str(parent) for name in data for parent in Path(name).parents if str(parent)!='.'})
        for directory in directories:
            info=tarfile.TarInfo(directory+'/');info.type=tarfile.DIRTYPE;info.mode=0o555;info.mtime=epoch;info.uid=info.gid=0;info.uname=info.gname='root';archive.addfile(info)
        for name,value in sorted(data.items()):
            info=tarfile.TarInfo(name);info.size=len(value);info.mode=modes[name];info.mtime=epoch;info.uid=info.gid=0;info.uname=info.gname='root';archive.addfile(info,io.BytesIO(value))
    with output.open('xb') as stream:
        with gzip.GzipFile(filename='',mode='wb',fileobj=stream,mtime=0,compresslevel=9) as compressed:compressed.write(memory.getvalue())
    output.chmod(0o400);print(json.dumps({'commit':commit,'files':len(data)-1,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'output':str(output)}))

if __name__=='__main__':main()
