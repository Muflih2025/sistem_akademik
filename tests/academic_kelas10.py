#!/usr/bin/env python3
"""Read-back checks for the explicitly supplied class-X development dataset."""
import hashlib,io,json,os,subprocess,sys
from pathlib import Path
from openpyxl import load_workbook
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'));sys.path.insert(0,str(ROOT/'ops'))
from academic_kelas10 import source_rows
from academic_http import Browser,csrf,STATE
from r0_environment import snapshot,save_json

def main():
 os.umask(0o077);results=[]
 def check(value):
  if not value:raise AssertionError('Dataset/reference condition failed; private row contents omitted')
 def test(name,fn):
  try:fn();results.append({'test':name,'status':'PASS'})
  except Exception as e:results.append({'test':name,'status':'FAIL','error_type':type(e).__name__})
  print(results[-1]['status']+' '+name,flush=True)
 def db(sql,args=None,config='inspector.json'):
  r=subprocess.run(['php',str(ROOT/'tests/academic_db.php'),str(STATE/'private'/config)],input=json.dumps({'sql':sql,'args':args or []}).encode(),capture_output=True);check(r.returncode==0);return json.loads(r.stdout)
 source=Path('/home/muflih/sistem_akademik/data kelas 10 clean.xlsx');digest=hashlib.sha256(source.read_bytes()).hexdigest();rows=source_rows(source)
 summary=json.loads((STATE/'reports/kelas10-import.json').read_text());ids=list(summary['class_ids'].values());marks=','.join('?'for _ in ids)
 stored=db('SELECT s.*,a.nomor_absen,a.mulai,a.selesai,a.id_tahun_ajaran FROM siswa s JOIN ak_anggota_kelas a ON a.nis=s.nis WHERE a.id_kelas IN('+marks+') AND a.id_tahun_ajaran=1',ids);by_nis={r['nis']:r for r in stored}
 test('replacement_source_hash_unchanged_389_students_11_classes',lambda:check(digest==summary['source_sha256']=='0edb2f32099e0a13c95fd3f4b2f37d548c931903503085ccb8fc0dd509596429' and len(rows)==len(stored)==389 and len(ids)==11))
 def exact():
  for r in rows:
   found=by_nis[r['nis']];check(found['nama_siswa']==r['nama'] and found['jenis_kelamin']==r['kelamin'] and found['nomor_absen']==r['absen'] and found['id_kelas']==summary['class_ids'][r['kelas']] and found['status']=='aktif')
 test('every_source_NIS_name_gender_class_roll_read_back_exactly',exact)
 test('DOB_placeholder_explicitly_marked_not_from_workbook',lambda:check(all(r['tanggal_lahir']=='2010-01-01' and 'DATA UJI' in r['alamat'] and 'tidak berasal dari Excel' in r['alamat']for r in stored)))
 test('membership_uses_existing_explicit_synthetic_period',lambda:check(all(r['id_tahun_ajaran']==1 and r['mulai']=='2026-07-01' and r['selesai']=='2026-12-31'for r in stored)))
 before=json.loads((STATE/'private/kelas10-protected-before.json').read_text());after=json.loads((STATE/'private/kelas10-protected-after-import.json').read_text())
 test('at_import_all_existing_rows_preserved_in_13_tables',lambda:check(all(all(r in after[t]for r in old)for t,old in before.items())))
 for table in ['guru','jadwal','users','ak_penugasan','ak_pertemuan','ak_absensi_sesi','ak_absensi_harian','ak_nilai','ak_rapor_snapshot']:
  test('at_import_no_changes_'+table,lambda t=table:check(before[t]==after[t]))
 test('no_invented_teacher_schedule_for_new_classes',lambda:check(not db('SELECT id_jadwal FROM jadwal WHERE id_kelas IN('+marks+')',ids)))
 test('no_unverified_attendance_written_for_new_classes',lambda:check(not db('SELECT id FROM ak_absensi_harian WHERE id_kelas IN('+marks+')',ids)))
 def idempotent():
  before=snapshot(STATE/'private/inspector.json');r=subprocess.run(['python3',str(ROOT/'ops/academic/academic_kelas10.py'),'--source',str(source),'--expected-database=sia_academic_dev_20261031','--apply'],capture_output=True);check(r.returncode==0 and json.loads(r.stdout)['status']=='already_imported_verified' and before==snapshot(STATE/'private/inspector.json'))
 test('repeated_import_is_read_only_without_duplicates',idempotent)
 references=db('SELECT * FROM ak_jam_belajar WHERE versi=1');profiles={r['nama']:json.loads(r['payload_json'])for r in references}
 test('bell_reference_three_versioned_profiles_stored_in_real_DB',lambda:check(len(references)==3 and all(r['versi']==1 for r in references)))
 test('bell_slots_10_Monday_10_TuesdayThursday_8_Friday',lambda:check(sorted(sum(x[0]is not None for x in p['slots'])for p in profiles.values())==[8,10,10]))
 friday=next(r for r in references if r['status']=='perlu_konfirmasi');fp=json.loads(friday['payload_json'])
 test('Friday_1050_1140_retained_pending_confirmation',lambda:check(any(x[:3]==[6,'10:50','11:40']for x in fp['slots']) and any(x[0]is None and x[1]=='11:40' and x[2]=='13:00' and 'belum' in x[3]for x in fp['slots'])))
 grantee="'ak_dev_runtime_1031'@'localhost'"
 test('runtime_bell_reference_append_only_no_update_delete',lambda:check({r['PRIVILEGE_TYPE']for r in db('SELECT PRIVILEGE_TYPE FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE=? AND TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',[grantee,'ak_jam_belajar'])}=={'SELECT','INSERT'}))
 credentials=json.loads((STATE/'private/test-accounts.json').read_text())
 def login(role):
  b=Browser();r=b.request('/auth/login.php');check(b.request('/auth/login.php','POST',{'csrf_token':csrf(r[2].decode()),'username':credentials[role],'password':credentials['password']})[0]==302);return b
 duty=login('duty');teacher=login('teacher');student=login('student');cid=summary['class_ids']['X PPLG 2']
 test('teacher_cannot_bypass_new_class_assignment_via_export',lambda:check(teacher.request(f'/academic/export.php?kind=harian&format=csv&id_kelas={cid}&id_tahun_ajaran=1&mulai=2026-10-30&selesai=2026-10-30')[0]==403))
 test('student_cannot_read_admin_master',lambda:check(student.request('/admin/master.php?table=siswa')[0]==403))
 def export():
  r=duty.request(f'/academic/export.php?kind=harian&format=xlsx&id_kelas={cid}&id_tahun_ajaran=1&mulai=2026-10-30&selesai=2026-10-30');check(r[0]==200)
  records=list(load_workbook(io.BytesIO(r[2]),read_only=True,data_only=True).active.values)
  # Actual XLSX has title/header rows; validate each source identity and B status.
  for row in [r for r in rows if r['kelas']=='X PPLG 2']:
   matches=[r for r in records if row['nis'] in [str(v)for v in r] and row['nama'] in r];check(len(matches)==1 and 'B' in matches[0] and 'H' not in matches[0] and 'A' not in matches[0])
 test('Piket_real_XLSX_35_students_all_unconfirmed_not_H_or_A',export)
 def private_files():
  b=Browser()
  for path in ['/data%20kelas%2010%20clean.xlsx','/NIS%20NIK%20KLS%2011.xlsx','/database/fixtures/jam_belajar_referensi.json','/ops/academic/academic_kelas10.py']:
   check(b.request(path)[0]in [403,404])
 test('source_workbooks_and_internal_scripts_not_web_accessible',private_files)
 report={'passed':sum(r['status']=='PASS'for r in results),'failed':sum(r['status']=='FAIL'for r in results),'skipped':0,'tests':results,'source_sha256':digest,'students_verified':len(rows),'classes_verified':len(ids)};save_json(STATE/'reports/kelas10-tests.json',report);return bool(report['failed'])
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:print('Dataset verification runner failed ('+type(e).__name__+'); private contents omitted.');sys.exit(2)
