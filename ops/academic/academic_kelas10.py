#!/usr/bin/env python3
"""Import the user's clean class-X dummy roster into the isolated dev DB.

Uses existing authenticated HTTP CRUD/preview/commit endpoints. Source identity
columns are never inferred from NIK/NISN; no teacher assignment is invented.
Private provenance records disclose the synthetic DOB required by the legacy
NOT NULL column. No row contents/credentials are printed or committed.
"""
import argparse,csv,gzip,hashlib,io,json,os,re,secrets,subprocess,sys
from collections import Counter
from pathlib import Path
from openpyxl import load_workbook
ROOT=Path(__file__).resolve().parents[2];STATE=Path('/home/muflih/.local/state/sia-academic-dev/20261031')
sys.path.insert(0,str(ROOT/'tests'));sys.path.insert(0,str(ROOT/'ops'))
from academic_http import Browser,csrf
from r0_environment import mysql,save_json,snapshot

def source_rows(path):
    book=load_workbook(path,read_only=True,data_only=False);sheet=book.active;data=list(sheet.iter_rows());cached=list(load_workbook(path,read_only=True,data_only=True).active.iter_rows());headers=[str(c.value).strip().lower()if c.value is not None else '' for c in data[0]]
    required=['absen','nis','nama','kelamin','kelas']
    if headers[:5]!=required or any(headers[5:]):raise ValueError('Expected clean class-X five-column source, not NISN/NIK source')
    rows=[];seen=set();numbers={}
    for excel_row,cells in enumerate(data[1:],2):
        if not any(c.value is not None for c in cells):continue
        if any(c.value is not None for c in cells[5:])or any(c.data_type=='f'for i,c in enumerate(cells[:5])if i!=1):raise ValueError('Unexpected data/formula in source')
        number,nis,name,sex,klass=[c.value for c in cached[excel_row-1][:5]]
        # This workbook increments NIS using =B<previous-row>+1. Never execute
        # arbitrary formulas or trust an unverified cached identity.
        if cells[1].data_type=='f':
            previous=cached[excel_row-2][1].value
            if cells[1].value!=f'=B{excel_row-1}+1' or not isinstance(previous,int) or not isinstance(nis,int) or nis!=previous+1:raise ValueError('Unsupported/stale NIS formula cache')
        if type(number)is not int or not 1<=number<=1000 or not isinstance(nis,(int,str)) or not isinstance(name,str):raise ValueError('Invalid identifier/roll/name format')
        nis=str(nis).strip();name=str(name).strip();sex=str(sex).strip();raw_class=str(klass).strip()
        match=re.fullmatch(r'X\s+(PPLG|AKL|MPLB|PM)\s*(\d+)',raw_class)
        if not match or not re.fullmatch(r'[0-9]{1,15}',nis)or not name or len(name)>100 or sex not in ['L','P']:raise ValueError('Invalid clean roster fields')
        klass='X '+match[1]+' '+match[2]
        if nis in seen or number in numbers.setdefault(klass,set()):raise ValueError('Duplicate NIS or class roll number')
        seen.add(nis);numbers[klass].add(number);rows.append({'row':excel_row,'nis':nis,'nama':name,'kelamin':sex,'kelas':klass,'source_class':raw_class,'program':match[1],'absen':number})
    if not rows:raise ValueError('Empty roster')
    return rows

def main():
    os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--apply',action='store_true');p.add_argument('--expected-database',required=True);args=p.parse_args()
    cfg=json.loads((STATE/'private/runtime.json').read_text());assert cfg['APP_ENV']=='testing' and cfg['DB_NAME']==args.expected_database=='sia_academic_dev_20261031' and cfg.get('DB_SOCKET') and cfg['DB_USER']!='root'
    source=Path(args.source).resolve();assert source==Path('/home/muflih/sistem_akademik/data kelas 10 clean.xlsx')
    digest=hashlib.sha256(source.read_bytes()).hexdigest();rows=source_rows(source);counts=dict(sorted(Counter(r['kelas']for r in rows).items()))
    def db(sql,params=None):
        r=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private/inspector.json')],input=json.dumps({'sql':sql,'args':params or []}).encode(),capture_output=True)
        if r.returncode:raise RuntimeError('Fixture inspector failed')
        return json.loads(r.stdout)
    period=db("SELECT t.*,p.mulai,p.selesai,p.catatan FROM tahun_ajaran t JOIN ak_periode p USING(id_tahun_ajaran) WHERE t.id_tahun_ajaran=1")[0]
    assert period['tahun_ajaran']=='2026/2027' and period['semester']=='Ganjil' and period['status']=='Aktif' and not period['dikunci'] and 'SINTETIS' in period['catatan'].upper()
    ledger=STATE/'private'/('kelas10-'+digest[:12]+'.json');summary={'source_sha256':digest,'source_file':source.name,'students':len(rows),'classes':counts,'period':'Fixture sintetis 2026/2027 Ganjil, bukan tahun yang diasumsikan dari Excel','dob_policy':'2010-01-01 adalah placeholder UJI; tanggal lahir tidak ada dalam sumber','source_has_NIK':False,'source_has_NISN':False}
    if ledger.exists():
        old=json.loads(ledger.read_text());assert old['status']=='complete','Partial import retained; operator review required, no reset/overwrite'
        for item in old['mapping']:
            found=db('SELECT s.nis,s.nama_siswa,s.id_kelas,a.nomor_absen FROM siswa s JOIN ak_anggota_kelas a ON a.nis=s.nis AND a.id_tahun_ajaran=1 WHERE s.nis=?',[item['nis']]);assert len(found)==1 and found[0]['id_kelas']==item['id_kelas'] and found[0]['nomor_absen']==item['absen']
        print(json.dumps({'status':'already_imported_verified','students':len(rows),'classes':counts}));return
    placeholders=','.join('?'for _ in rows)
    assert not db('SELECT nis FROM siswa WHERE nis IN('+placeholders+')',[r['nis']for r in rows]),'NIS already exists; refusing to overwrite or guess identity'
    if not args.apply:print(json.dumps({'status':'preview_validated',**summary},ensure_ascii=False));return
    # Fresh create-only private backup before the first application mutation.
    client=Path('/home/muflih/.local/state/sia-r0/20261030-r0/private/stage-admin.cnf');assert mysql(client,'SELECT @@skip_networking').strip()==b'1'
    before=snapshot(STATE/'private/inspector.json');backup=STATE/'backups'/('before-kelas10-'+secrets.token_hex(4)+'.sql.gz')
    dump=subprocess.run(['mariadb-dump','--defaults-extra-file='+str(client),'--single-transaction','--skip-lock-tables','--skip-add-drop-table','--skip-add-locks','--skip-disable-keys','--skip-comments',cfg['DB_NAME']],capture_output=True);assert dump.returncode==0
    with gzip.open(backup,'xb')as stream:stream.write(dump.stdout)
    assert snapshot(STATE/'private/inspector.json')==before
    progress={'status':'prepared','summary':summary,'backup':str(backup),'backup_sha256':hashlib.sha256(backup.read_bytes()).hexdigest()};save_json(ledger,progress)
    c=json.loads((STATE/'private/test-accounts.json').read_text());b=Browser();r=b.request('/auth/login.php');r=b.request('/auth/login.php','POST',{'csrf_token':csrf(r[2].decode()),'username':c['admin'],'password':c['password']});assert r[0]==302
    def post(path,data,want=302):
        token=csrf(b.request('/auth/change_password.php')[2].decode());r=b.request(path,'POST',{'csrf_token':token,**data});assert r[0]==want,'Application rejected import; partial state retained for review';return r
    majors={};classes={}
    for program in sorted({r['program']for r in rows}):
        found=db('SELECT id_jurusan,status FROM jurusan WHERE kode_jurusan=?',[program])
        if not found:post('/admin/master.php?table=jurusan',{'action':'create','kode_jurusan':program,'nama_jurusan':program+' (Data Uji)'});found=db('SELECT id_jurusan,status FROM jurusan WHERE kode_jurusan=?',[program])
        assert len(found)==1 and found[0]['status']=='aktif';majors[program]=found[0]['id_jurusan']
    for klass in counts:
        program=next(r['program']for r in rows if r['kelas']==klass);found=db('SELECT * FROM kelas WHERE nama_kelas=?',[klass])
        if not found:post('/admin/master.php?table=kelas',{'action':'create','nama_kelas':klass,'tingkat':'X','id_jurusan':majors[program]});found=db('SELECT * FROM kelas WHERE nama_kelas=?',[klass])
        assert len(found)==1 and found[0]['status']=='aktif' and found[0]['id_jurusan']==majors[program];classes[klass]=found[0]['id_kelas']
    def import_csv(module,data):
        output=io.StringIO();csv.writer(output).writerows(data);boundary='kelas10'+secrets.token_hex(12);token=csrf(b.request('/auth/change_password.php')[2].decode());fields={'csrf_token':token,'action':'impor_preview','module':module,'id_tahun_ajaran':1,'alasan':'Data dummy kelas X sumber '+digest[:12]};parts=[]
        for k,v in fields.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="berkas"; filename="roster-kelas10.csv"\r\nContent-Type: text/csv\r\n\r\n'.encode()+output.getvalue().encode()+f'\r\n--{boundary}--\r\n'.encode())
        path='/academic/index.php?view=impor&module='+module;r=b.request(path,'POST',b''.join(parts),{'Content-Type':'multipart/form-data; boundary='+boundary});assert r[0]==200,'Preview rejected; no automatic retry/reset'
        token=re.search(rb'name="preview_token" value="([a-f0-9]+)"',r[2]);assert token
        post(path,{'action':'impor_commit','preview_token':token.group(1).decode(),'konfirmasi':'1'})
    import_csv('siswa',[['nis','nama_siswa','jenis_kelamin','tanggal_lahir','id_kelas','alamat']]+[[r['nis'],r['nama'],r['kelamin'],'2010-01-01',classes[r['kelas']],'DATA UJI. Tanggal lahir placeholder 2010-01-01, tidak berasal dari Excel. Sumber '+digest[:12]]for r in rows])
    progress['status']='students_saved';save_json(ledger,progress)
    import_csv('anggota',[['nis','id_kelas','nomor_absen','mulai','selesai']]+[[r['nis'],classes[r['kelas']],r['absen'],period['mulai'],period['selesai']]for r in rows])
    mapping=[]
    for row in rows:
        found=db('SELECT s.*,a.nomor_absen FROM siswa s JOIN ak_anggota_kelas a ON a.nis=s.nis AND a.id_tahun_ajaran=1 WHERE s.nis=?',[row['nis']]);assert len(found)==1
        found=found[0];assert found['nama_siswa']==row['nama'] and found['jenis_kelamin']==row['kelamin'] and found['id_kelas']==classes[row['kelas']] and found['nomor_absen']==row['absen']
        mapping.append({'source_row':row['row'],'nis':row['nis'],'id_kelas':classes[row['kelas']],'absen':row['absen']})
    assert hashlib.sha256(source.read_bytes()).hexdigest()==digest
    save_json(ledger,{**progress,'status':'complete','mapping':mapping});save_json(STATE/'reports/kelas10-import.json',{'status':'PASS',**summary,'students_imported':len(mapping),'class_ids':classes,'source_unchanged':True,'teachers_or_schedules_created':0,'auto_student_accounts_created':0,'backup_sha256':progress['backup_sha256']})
    print(json.dumps({'status':'PASS','students_imported':len(mapping),'classes':counts,'source_unchanged':True,'schedules_created':0},ensure_ascii=False))

if __name__=='__main__':
    try:main()
    except Exception as e:sys.stderr.write('Kelas-X import refused/failed ('+type(e).__name__+'); private details retained; no reset or overwrite attempted.\n');sys.exit(1)
