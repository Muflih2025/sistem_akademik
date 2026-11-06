#!/usr/bin/env python3
"""Install one pinned pure-Python PDF reader in private test tooling, never runtime."""
import hashlib,io,json,os,sys,urllib.request,zipfile
from pathlib import Path

def main():
 os.umask(0o077);state=Path('/home/muflih/.local/state/sia-academic-dev/20261031');target=state/'tools/python';target.mkdir(parents=True,exist_ok=True,mode=0o700)
 version='6.21.4';meta=json.load(urllib.request.urlopen('https://pypi.org/pypi/pypdf/'+version+'/json',timeout=20));wheel=next(x for x in meta['urls']if x['filename'].endswith('py3-none-any.whl'))
 data=urllib.request.urlopen(wheel['url'],timeout=20).read();assert hashlib.sha256(data).hexdigest()==wheel['digests']['sha256']
 with zipfile.ZipFile(io.BytesIO(data))as z:
  assert all(not Path(n).is_absolute() and '..' not in Path(n).parts for n in z.namelist());z.extractall(target)
 (state/'reports/pdf-test-dependency.json').write_text(json.dumps({'name':'pypdf','version':version,'sha256':wheel['digests']['sha256'],'scope':'private tests only'}));print('PASS pinned private PDF text parser.')
if __name__=='__main__':
 try:main()
 except Exception:sys.stderr.write('Private test dependency setup failed; no application/DB changes.\n');sys.exit(1)
