#!/usr/bin/env python3
"""Bulk master import through real XLSX upload, confirmation and PDO read-back."""
import datetime,io,json,os,re,secrets,subprocess,sys,zipfile
from pathlib import Path
from openpyxl import Workbook,load_workbook
from openpyxl.utils.datetime import CALENDAR_MAC_1904
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'));sys.path.insert(0,str(ROOT/'ops'))
from academic_http import STATE,Browser,csrf
from r0_environment import snapshot,save_json
HEADERS={'jurusan':['kode_jurusan','nama_jurusan'],'kelas':['nama_kelas','tingkat','id_jurusan'],'siswa':['nis','nama_siswa','jenis_kelamin','tanggal_lahir','id_kelas','alamat'],'guru':['nip','nama_guru','email','no_hp'],'mata_pelajaran':['kode_mapel','nama_mapel','kelompok','kkm']}

def main():
 os.umask(0o077);cfg=json.loads((STATE/'private/runtime.json').read_text());assert cfg['APP_ENV']=='testing'and cfg['DB_NAME']=='sia_academic_dev_20261031'and cfg.get('DB_SOCKET')
 credentials=json.loads((STATE/'private/test-accounts.json').read_text());tag=secrets.token_hex(3);results=[]
 def check(value):
  if not value:raise AssertionError('Bulk upload condition failed; private source/fixture contents omitted')
 def test(name,fn):
  try:fn();results.append({'test':name,'status':'PASS'})
  except Exception as e:results.append({'test':name,'status':'FAIL','error_type':type(e).__name__})
  print(results[-1]['status']+' '+name,flush=True)
 def db(sql,args=None):
  r=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private/inspector.json')],input=json.dumps({'sql':sql,'args':args or []}).encode(),capture_output=True);check(r.returncode==0);return json.loads(r.stdout)
 def login(role):
  b=Browser();r=b.request('/auth/login.php');check(b.request('/auth/login.php','POST',{'csrf_token':csrf(r[2].decode()),'username':credentials[role],'password':credentials['password']})[0]==302);return b
 admin=login('admin');roles={r:login(r)for r in ['teacher','student','head','duty']}
 def xlsx(module,rows,epoch1904=False,iso=False):
  book=Workbook(iso_dates=iso)
  if epoch1904:book.epoch=CALENDAR_MAC_1904
  sheet=book.active;sheet.title='Data';sheet.append(HEADERS[module])
  for row in rows:sheet.append(row)
  stream=io.BytesIO();book.save(stream);return stream.getvalue()
 def upload(module,rows=None,content=None,b=admin,want=200,extension='xlsx'):
  boundary='bulk'+secrets.token_hex(10);token=csrf(b.request('/auth/change_password.php')[2].decode());parts=[]
  for key,value in {'csrf_token':token,'action':'impor_preview','module':module,'alasan':'Sumber fixture bulk HTTP '+tag}.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
  data=content if content is not None else xlsx(module,rows)
  parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="berkas"; filename="uji-bulk.{extension}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode()+data+f'\r\n--{boundary}--\r\n'.encode())
  r=b.request('/admin/bulk_upload.php?module='+module,'POST',b''.join(parts),{'Content-Type':'multipart/form-data; boundary='+boundary});check(r[0]==want)
  if want==200:
   match=re.search(rb'name="preview_token" value="([a-f0-9]+)"',r[2]);check(match is not None);return match.group(1).decode()
 def commit(token,want=302,confirm=True):
  r=admin.request('/admin/bulk_upload.php','POST',{'csrf_token':csrf(admin.request('/auth/change_password.php')[2].decode()),'action':'impor_commit','preview_token':token,**({'konfirmasi':'1'}if confirm else {})});check(r[0]==want)
 initial_users=db('SELECT id_user,username,role,id_referensi,status,password FROM users ORDER BY id_user')
 for module in HEADERS:
  def templates(module=module):
   r=admin.request('/academic/export.php?kind=template&format=xlsx&module='+module);check(r[0]==200);book=load_workbook(io.BytesIO(r[2]));check(list(next(book.active.values))==HEADERS[module]and all(c.data_type!='f'for row in book.active for c in row));check(module in r[1]['Content-Disposition'])
  test('template_XLSX_actual_workbook_'+module,templates)
  for role,b in roles.items():
   test('deny_'+role+'_template_and_upload_'+module,lambda b=b,module=module:(check(b.request('/academic/export.php?kind=template&format=xlsx&module='+module)[0]==403),upload(module,rows=[['blocked']],b=b,want=403)))
 major_rows=[[f'B{tag}{n:03d}',f'Jurusan Bulk HTTP {tag} {n}']for n in range(25)]
 batches={'jurusan':major_rows}
 for module in ['jurusan','kelas','siswa','guru','mata_pelajaran']:
  if module=='kelas':
   major=db('SELECT id_jurusan FROM jurusan WHERE kode_jurusan=?',[major_rows[0][0]])[0]['id_jurusan'];batches[module]=[[f'BH {tag} {n}','X',major]for n in range(25)]
  if module=='siswa':
   cid=db('SELECT id_kelas FROM kelas WHERE nama_kelas=?',[batches['kelas'][0][0]])[0]['id_kelas'];batches[module]=[[f'0008{int(tag,16):08d}{n:02d}',f'Siswa Bulk HTTP {tag} {n}','P',datetime.datetime(2010,2,3),cid,None]for n in range(25)]
  if module=='guru':batches[module]=[[f'BH-{tag}-{n}',f'Guru Bulk HTTP {tag} {n}',None,None]for n in range(25)]
  if module=='mata_pelajaran':batches[module]=[[f'M{tag}{n:03d}',f'Mapel Bulk HTTP {tag} {n}','Produktif',75]for n in range(25)]
  before=snapshot(STATE/'private/inspector.json');token=upload(module,rows=batches[module]);test('preview_no_DB_write_'+module,lambda before=before:check(before==snapshot(STATE/'private/inspector.json')))
  test('commit_confirmation_required_'+module,lambda token=token:commit(token,422,False))
  test('commit_25_real_rows_'+module,lambda token=token:commit(token))
  key={'jurusan':'kode_jurusan','kelas':'nama_kelas','siswa':'nis','guru':'nip','mata_pelajaran':'kode_mapel'}[module]
  def readback(module=module,key=key):
   for values in batches[module]:
    row=db('SELECT * FROM `'+module+'` WHERE `'+key+'`=?',[values[0]]);check(len(row)==1)
    for h,v in zip(HEADERS[module],values):
     expected=v.strftime('%Y-%m-%d')if isinstance(v,datetime.datetime)else v
     check(float(row[0][h])==float(expected) if h=='kkm' else (row[0][h]==expected if expected is not None else row[0][h]is None))
  test('all_25_rows_read_back_exactly_'+module,readback)
  test('token_replay_rejected_'+module,lambda token=token:commit(token,422))
  test('existing_identity_rejected_without_overwrite_'+module,lambda module=module:upload(module,rows=[batches[module][0]],want=422))
 test('no_accounts_created_or_passwords_reset',lambda:check(initial_users==db('SELECT id_user,username,role,id_referensi,status,password FROM users ORDER BY id_user')))
 test('case_insensitive_batch_duplicates_rejected',lambda:upload('jurusan',rows=[[f'C{tag}','Fixture 1'],[f'c{tag}','Fixture 2']],want=422))
 test('invalid_major_relation_rejected',lambda:upload('kelas',rows=[[f'BAD {tag}','XI','2147483647']],want=422))
 test('invalid_grade_threshold_rejected',lambda:upload('mata_pelajaran',rows=[[f'BAD{tag}','Fixture','Produktif','101']],want=422))
 test('invalid_birth_date_rejected',lambda:upload('siswa',rows=[[f'005{int(tag,16):08d}','Fixture','L','2010-02-30',cid,'']],want=422))
 for label,epoch,iso in [('1904',True,False),('ISO',False,True)]:
  def native_date(label=label,epoch=epoch,iso=iso):
   nis=f'0007{int(tag,16):08d}'+('1'if epoch else'2');token=upload('siswa',content=xlsx('siswa',[[nis,'Fixture native date','L',datetime.datetime(2010,2,3),cid,None]],epoch,iso));commit(token);check(db('SELECT tanggal_lahir FROM siswa WHERE nis=?',[nis])[0]['tanggal_lahir']=='2010-02-03')
  test('native_Excel_date_'+label+'_accepted_and_DB_read_back',native_date)
 test('native_Excel_datetime_nonmidnight_rejected',lambda:upload('siswa',rows=[[f'0006{int(tag,16):08d}','Fixture time','L',datetime.datetime(2010,2,3,12,30),cid,'']],want=422))
 test('formula_cells_rejected',lambda:upload('jurusan',rows=[['=1+2','Formula rejected']],want=422))
 # A real workbook whose sheet order differs from its physical sheet file numbers.
 book=Workbook();book.active.append(['Not the data sheet']);sheet=book.create_sheet('Data');sheet.append(HEADERS['jurusan']);sheet.append([f'R{tag}','Reordered fixture']);stream=io.BytesIO();book.save(stream)
 output=io.BytesIO()
 with zipfile.ZipFile(io.BytesIO(stream.getvalue()))as old,zipfile.ZipFile(output,'w')as new:
  for info in old.infolist():
   data=old.read(info.filename)
   if info.filename=='xl/workbook.xml':
    import xml.etree.ElementTree as ET
    xml=ET.fromstring(data);sheets=xml.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheets');items=list(sheets);sheets[:]=items[::-1];data=ET.tostring(xml,encoding='utf-8',xml_declaration=True)
   new.writestr(info,data)
 test('first_workbook_sheet_resolved_from_relationships',lambda:upload('jurusan',content=output.getvalue()))
 # A raced identity after preview must roll back earlier inserts in the same batch.
 first=[f'X{tag}1','Atomic first'];second=[f'X{tag}2','Atomic second'];token=upload('jurusan',rows=[first,second]);r=admin.request('/admin/master.php?table=jurusan','POST',{'csrf_token':csrf(admin.request('/auth/change_password.php')[2].decode()),'action':'create','kode_jurusan':second[0],'nama_jurusan':second[1]});check(r[0]==302)
 before=snapshot(STATE/'private/inspector.json');test('late_database_duplicate_rolls_back_entire_batch',lambda:(commit(token,422),check(not db('SELECT id_jurusan FROM jurusan WHERE kode_jurusan=?',[first[0]])),check(all({k:v for k,v in after.items()if k!='schema_sha256'}=={k:v for k,v in before['tables'][table].items()if k!='schema_sha256'}for table,after in snapshot(STATE/'private/inspector.json')['tables'].items()))))
 large=[[f'L{tag[:4]}{n:04d}',f'Large preview {n}']for n in range(2000)];test('2000_row_XLSX_preview_accepted',lambda:upload('jurusan',rows=large))
 test('preview_pages_only_20_of_2000_rows',lambda:check(admin.request('/admin/bulk_upload.php?module=jurusan&preview_page=2')[2].count(b'<tr>')-1==20))
 test('2001_row_XLSX_rejected',lambda:upload('jurusan',rows=large+[[f'Z{tag}','Overflow']],want=422))
 report={'passed':sum(r['status']=='PASS'for r in results),'failed':sum(r['status']=='FAIL'for r in results),'skipped':0,'tests':results,'master_modules':list(HEADERS),'rows_committed_per_module':25,'largest_preview_rows':2000};save_json(STATE/'reports/bulk-master-http-tests.json',report);return bool(report['failed'])
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:print('Bulk master test runner failed ('+type(e).__name__+'); private details omitted.',file=sys.stderr);sys.exit(2)
