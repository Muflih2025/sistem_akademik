#!/usr/bin/env python3
import copy,hashlib,json,os,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'ops'))
from r15_assignment_review import export_rows,validate

def main():
    os.umask(0o077);state=Path(sys.argv[1]);source=json.loads((state/'reports/legacy-source.json').read_text());periods=json.loads((state/'reports/periods-source.json').read_text());results=[]
    def test(name,fn):
        try:fn();results.append({'test':name,'status':'PASS'})
        except Exception:results.append({'test':name,'status':'FAIL'})
        print(results[-1]['status']+' '+name)
    def check(value):assert value
    def reject(rows):
        try:validate(rows,source,periods)
        except ValueError:return
        raise AssertionError('Invalid review accepted')
    rows=export_rows(source)
    test('all_18_actual_records_pending_without_period_guess',lambda:check(len(rows)==18 and all(r['status_review_admin']=='PENDING ADMIN REVIEW' and not r['tahun_ajaran_existing'] and not r['semester_existing'] for r in rows)))
    test('pending_review_makes_no_correction_proposals',lambda:check(validate(rows,source,periods)['proposals']==[]))
    changed=copy.deepcopy(rows);changed[0]['id_guru']='999999';test('changed_teacher_context_rejected',lambda:reject(changed))
    test('missing_snapshot_row_rejected',lambda:reject(rows[:-1]))
    test('duplicate_row_rejected',lambda:reject(rows+[rows[0]]))
    approved=copy.deepcopy(rows);approved[0].update(status_review_admin='DISETUJUI ADMIN',id_periode_disetujui=str(periods[0]['id_tahun_ajaran']),jenis_bukti='CURRENT_DATE',referensi_bukti='SIMULATION',peninjau_admin='Fixture admin — SIMULATION',tanggal_persetujuan='2026-10-31')
    test('current_date_not_period_evidence',lambda:reject(approved))
    approved[0]['jenis_bukti']='SK_PEMBAGIAN_TUGAS';test('approval_without_evidence_file_rejected',lambda:reject(approved))
    with tempfile.TemporaryDirectory(dir=state/'private',prefix='synthetic-evidence-') as folder:
        evidence=Path(folder)/'SIMULATED-SK.txt';evidence.write_text('SYNTHETIC TEST ONLY; NOT A REAL SCHOOL APPROVAL')
        approved[0].update(berkas_bukti=str(evidence),sha256_bukti=hashlib.sha256(evidence.read_bytes()).hexdigest())
        test('synthetic_complete_review_produces_plan_never_applies',lambda:check(validate(approved,source,periods)['database_writes'] is False and len(validate(approved,source,periods)['proposals'])==1))
        bad=copy.deepcopy(approved);bad[0]['sha256_bukti']='0'*64;test('tampered_evidence_rejected',lambda:reject(bad))
        bad=copy.deepcopy(approved);bad[0]['id_periode_disetujui']='999999';test('unknown_period_rejected',lambda:reject(bad))
    report={'passed':sum(t['status']=='PASS' for t in results),'failed':sum(t['status']=='FAIL' for t in results),'skipped':0,'tests':results,'actual_approvals':0,'actual_records_applied':0};(state/'reports/assignment-tests.json').write_text(json.dumps(report,indent=2)+'\n');print(f"{report['passed']} PASS, {report['failed']} FAIL, 0 SKIP");return bool(report['failed'])

if __name__=='__main__':sys.exit(main())
