#!/usr/bin/env python3
"""Export/validate an admin review and produce a correction PLAN only.

Never connects for writes or applies a period. A file hash validates evidence
integrity, not the truth/authority of the document; school admin must verify it.
"""
import argparse,csv,hashlib,json,os,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FIELDS=['id_penugasan','id_guru','nama_guru','id_mapel','mata_pelajaran','id_kelas','kelas','tahun_ajaran_existing','semester_existing','observasi_nilai_bukan_bukti','sumber_bukti_periode','alasan_ambigu','klasifikasi','rekomendasi','status_review_admin','id_periode_disetujui','jenis_bukti','referensi_bukti','berkas_bukti','sha256_bukti','peninjau_admin','tanggal_persetujuan']
KINDS={'SK_PEMBAGIAN_TUGAS','JADWAL_RESMI_BERPERIODE','DOKUMEN_SEKOLAH_BERPERIODE'}

def export_rows(source):
    rows=[]
    for record in source:
        observed='; '.join(str(p['id_tahun_ajaran'])+': '+p['tahun_ajaran']+' '+p['semester'] for p in record.get('grade_periods_observed',[]))
        invalid=record['jam_mulai']>=record['jam_selesai']
        row={key:'' for key in FIELDS};row.update(id_penugasan=str(record['id_jadwal']),id_guru=str(record['id_guru']),nama_guru=record['nama_guru'],id_mapel=str(record['id_mapel']),mata_pelajaran=record['nama_mapel'],id_kelas=str(record['id_kelas']),kelas=record['nama_kelas'],observasi_nilai_bukan_bukti=observed or 'Tidak ada',sumber_bukti_periode='Belum ada SK/jadwal resmi terverifikasi',alasan_ambigu='Kolom periode penugasan belum tersedia pada sumber; observasi nilai tidak mengikat id_jadwal dan bukan bukti masa berlaku.',klasifikasi='KONFLIK' if invalid else 'AMBIGU',rekomendasi='Investigasi jam/relasi yang tidak valid' if invalid else 'Verifikasi dokumen resmi; pertahankan arsip. Buat successor berperiode hanya sesudah persetujuan.',status_review_admin='PENDING ADMIN REVIEW')
        rows.append(row)
    return rows

def validate(rows,source,periods):
    source_map={str(r['id_jadwal']):r for r in source};period_map={str(p['id_tahun_ajaran']):p for p in periods};seen=set();actions=[];pending=[];conflicts=[]
    for row in rows:
        identity=row['id_penugasan']
        if identity in seen or identity not in source_map:raise ValueError('ID penugasan tidak dikenal/duplikat')
        seen.add(identity);original=source_map[identity]
        for field,key in [('id_guru','id_guru'),('id_kelas','id_kelas'),('id_mapel','id_mapel')]:
            if row[field]!=str(original[key]):raise ValueError('Identitas konteks berbeda dari snapshot; perlu investigasi')
        if row['status_review_admin']!='DISETUJUI ADMIN':pending.append(identity);continue
        period=period_map.get(row['id_periode_disetujui'])
        if not period:raise ValueError('Periode disetujui tidak dikenal')
        if row['jenis_bukti'] not in KINDS:raise ValueError('Tanggal saat ini/observasi nilai bukan jenis bukti resmi')
        if not row['referensi_bukti'].strip() or not row['peninjau_admin'].strip() or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',row['tanggal_persetujuan']):raise ValueError('Persetujuan dan referensi bukti wajib lengkap')
        from datetime import date
        date.fromisoformat(row['tanggal_persetujuan'])
        evidence=Path(row['berkas_bukti']).resolve()
        if not evidence.is_file() or evidence.is_relative_to(ROOT):raise ValueError('Bukti harus berupa file privat di luar repository')
        if not re.fullmatch('[a-f0-9]{64}',row['sha256_bukti']) or hashlib.sha256(evidence.read_bytes()).hexdigest()!=row['sha256_bukti']:raise ValueError('Hash bukti tidak cocok')
        if original['jam_mulai']>=original['jam_selesai']:conflicts.append(identity);continue
        for action in actions:
            other=source_map[action['id_penugasan']]
            if action['id_periode_disetujui']==row['id_periode_disetujui'] and other['hari']==original['hari'] and original['jam_mulai']<other['jam_selesai'] and original['jam_selesai']>other['jam_mulai'] and (other['id_guru']==original['id_guru'] or other['id_kelas']==original['id_kelas'] or (original.get('ruang') and original['ruang']==other.get('ruang'))):raise ValueError('Konflik antar usulan pada periode yang sama; investigasi diperlukan')
        actions.append({'id_penugasan':identity,'id_periode_disetujui':row['id_periode_disetujui'],'tahun_ajaran':period['tahun_ajaran'],'semester':period['semester'],'classification':'BUKTI FORMAT/INTEGRITAS VALID — OTORITAS TETAP DIVERIFIKASI ADMIN','source_record_sha256':hashlib.sha256(json.dumps(original,sort_keys=True).encode()).hexdigest(),'evidence_sha256':row['sha256_bukti'],'operation':'RETAIN ORIGINAL; REVIEW DEACTIVATION AND CREATE VERIFIED SUCCESSOR','execution_status':'PLAN ONLY' if period['status']=='Aktif' else 'HOLD FOR R2 HISTORICAL PERIOD','reviewer':row['peninjau_admin']})
    if seen!=set(source_map):raise ValueError('Review harus mencakup tepat seluruh snapshot')
    return {'applied':False,'database_writes':False,'pending_admin_review':pending,'conflicts':conflicts,'proposals':actions,'source_snapshot_sha256':hashlib.sha256(json.dumps(source,sort_keys=True).encode()).hexdigest(),'requires_fresh_database_conflict_check':True,'requires_operator_authorization':True}

def main():
    os.umask(0o077);p=argparse.ArgumentParser();p.add_argument('action',choices=['export','plan']);p.add_argument('--source',required=True);p.add_argument('--periods',required=True);p.add_argument('--review');p.add_argument('--output',required=True);a=p.parse_args()
    output=Path(a.output).resolve();assert not output.exists() and not output.is_relative_to(ROOT),'Refuse overwriting or repository output'
    source=json.loads(Path(a.source).read_text());periods=json.loads(Path(a.periods).read_text())
    if a.action=='export':
        with output.open('x',newline='') as stream:
            writer=csv.DictWriter(stream,fieldnames=FIELDS);writer.writeheader()
            for row in export_rows(source):writer.writerow({k:("'"+v if v.startswith(('=','+','-','@','\t','\r')) else v) for k,v in row.items()})
    else:
        if not a.review:raise ValueError('Review file required')
        with Path(a.review).open(newline='') as stream:rows=list(csv.DictReader(stream))
        output.write_text(json.dumps(validate(rows,source,periods),ensure_ascii=False,indent=2)+'\n')
    output.chmod(0o600);print('Prepared private admin review/plan only; no database writes.')

if __name__=='__main__':
    try:main()
    except Exception:sys.stderr.write('Review validation refused; inspect inputs privately. No updates applied.\n');sys.exit(1)
