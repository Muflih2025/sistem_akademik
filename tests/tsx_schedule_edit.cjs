'use strict';
// Fresh external fixture from tsx_teacher_setup.py; never the school database.
const { fs, path, state, base, db, assert, request, login, browser, context, unchanged } = require('./tsx_admin_helpers.cjs');
const results = [];
let appBrowser;
const pass = id => { results.push({ id, status: 'PASS' }); console.log('PASS ' + id); };
async function json(url, session, body, expected = 200) {
  const r = await request(url, session, body);
  assert.equal(r.status, expected, JSON.stringify({ url, error: r.json?.error })); return r.json;
}
async function post(page, name) {
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin' && r.request().method() === 'POST');
  await page.getByRole('button', { name, exact: true }).click();
  const r = await pending, data = await r.json(); assert.equal(r.status(), 200, JSON.stringify(data)); return data.data;
}
const scheduleRow = id => db.prepare('SELECT * FROM jadwal WHERE id_jadwal=?').get(id);
const assignments = () => db.prepare('SELECT * FROM ak_penugasan ORDER BY id_jadwal').all();
const history = () => ['ak_pertemuan', 'ak_absensi_sesi', 'ak_absensi_harian', 'ak_nilai', 'ak_rapor_snapshot'].map(t => db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all());
const auditCount = () => db.prepare('SELECT COUNT(*) n FROM ak_riwayat').get().n;

(async () => {
  const admin = await login('uji_admin'), duty = await login('uji_piket'), teacher = await login('uji_guru_lain');
  const list = async id => (await json('/api/admin?table=jadwal&limit=1000', admin)).data.find(j => j.id_jadwal === id);
  const update = (row, changes, expected = 200) => json('/api/admin', admin, { ...row, table: 'jadwal', action: 'update', id: row.id_jadwal, alasan: 'Koreksi teruji sebelum pemakaian', ...changes }, expected);
  const create = async changes => (await json('/api/admin', admin, { table: 'jadwal', action: 'create', id_guru: '3', id_mapel: '1', id_kelas: '2', id_tahun_ajaran: '1', hari: 'Selasa', jam_mulai: '15:30', jam_selesai: '16:10', ruang: '', penugasan_mulai: '2026-07-01', penugasan_selesai: '2026-12-31', verifikasi_penugasan: '1', ...changes })).data;
  const fresh = await create({}), id = fresh.id_jadwal;
  assert.equal((await list(id)).konteks_terkunci, false);
  const assignmentsBefore = assignments();
  appBrowser = await browser();
  const ctx = await context(appBrowser, admin), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base + '/admin/jadwal');
    const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Selasa', exact: true }) }).filter({ has: page.getByRole('cell', { name: '15:30', exact: true }) });
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByText('Jadwal ini belum memiliki riwayat pemakaian.', { exact: false }).waitFor();
    await page.getByLabel('Guru', { exact: true }).selectOption('2');
    await page.getByLabel('Mata pelajaran', { exact: true }).selectOption('2');
    await page.getByLabel('Jam mulai', { exact: true }).fill('15:40');
    await page.getByLabel('Jam selesai', { exact: true }).fill('16:20');
    await page.getByLabel('Alasan perubahan', { exact: true }).fill('Koreksi guru, mapel dan jam pada jadwal terverifikasi');
    const edited = await post(page, 'Simpan');
    assert.equal(edited.id_jadwal, id);
    await page.reload();
    await page.getByRole('cell', { name: '15:40', exact: true }).waitFor();
    assert.equal(scheduleRow(id).id_guru, '2'); assert.equal(scheduleRow(id).id_mapel, '2');
    assert.deepEqual(assignments(), assignmentsBefore);
    assert((await json('/api/jadwal', teacher)).data.some(j => j.id_jadwal === id && j.jam_mulai === '15:40'));
    assert(!(await json('/api/jadwal', duty)).data.some(j => j.id_jadwal === id));
    pass('VERIFIED_unused_schedule_browser_edit_reload_assignment_and_teacher_visibility');

    const current = await list(id), before = scheduleRow(id), audits = auditCount();
    await update(current, { hari: 'Jumat', jam_mulai: '07:45', jam_selesai: '08:45' }, 409);
    await update(current, { jam_mulai: '17:00', jam_selesai: '16:00' }, 422);
    await update(fresh, { jam_mulai: '16:00', jam_selesai: '17:00' }, 409);
    await json('/api/admin', duty, { ...current, table: 'jadwal', action: 'update', id, jam_mulai: '16:00' }, 403);
    assert.deepEqual(scheduleRow(id), before); assert.equal(auditCount(), audits);
    pass('VALIDATION_collision_invalid_time_stale_version_and_non_admin_rejected_atomically');

    const year = (await json('/api/admin?table=tahun_ajaran', admin)).data.find(y => y.id_tahun_ajaran === '1');
    for (const key of ['dikunci', 'rapor_diterbitkan']) {
      const locked = (await json('/api/admin', admin, { ...year, table: 'tahun_ajaran', action: 'update', id: '1', [key]: '1' })).data;
      assert.equal((await list(id)).konteks_terkunci, true);
      await update(await list(id), { jam_mulai: '15:50' }, 409);
      await json('/api/admin', admin, { ...locked, table: 'tahun_ajaran', action: 'update', id: '1', [key]: '0' });
    }
    // Legacy active periods with incompatible dates must not retain old assignments.
    db.prepare("INSERT INTO tahun_ajaran(id_tahun_ajaran,tahun_ajaran,semester,status,dikunci,rapor_diterbitkan) VALUES('89','2027/2028','Ganjil','Aktif','0','0')").run();
    db.prepare("INSERT INTO ak_periode(id_tahun_ajaran,mulai,selesai,hari_efektif,terverifikasi) VALUES('89','2027-07-01','2027-12-31','1,2,3,4,5','1')").run();
    const wrongRange = await update(await list(id), { id_tahun_ajaran: '89' }, 422);
    assert.match(wrongRange.error, /Rentang tanggal tidak sesuai periode/);
    assert.deepEqual(assignments(), assignmentsBefore);
    pass('PERIOD_locked_published_and_incompatible_assignment_dates_rejected');

    const grade = await json('/api/nilai?id_jadwal=' + id, teacher);
    await json('/api/nilai', teacher, { id_jadwal: id, id_aturan: grade.rule.id, items: grade.data.map(s => ({ ...s, nilai_tugas: 80, nilai_uts: 80, nilai_uas: 80, nilai_praktik: 0, nilai_proyek: 0 })) });
    assert.equal(db.prepare('SELECT COUNT(*) n FROM ak_pertemuan WHERE id_jadwal=?').get(id).n, 0);
    const graded = await list(id), savedHistory = history();
    assert.equal(graded.konteks_terkunci, true); assert.match(graded.alasan_kunci, /nilai/);
    await update(graded, { id_guru: '3' }, 409);
    await page.reload();
    const gradedRow = page.getByRole('row').filter({ has: page.getByRole('cell', { name: '15:40', exact: true }) });
    await gradedRow.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByText('Penugasan jadwal sudah memiliki riwayat nilai.', { exact: false }).waitFor();
    for (const label of ['Guru', 'Mata pelajaran', 'Kelas', 'Periode', 'Hari', 'Jam mulai', 'Jam selesai', 'Ruang']) assert(await page.getByLabel(label, { exact: true }).isDisabled(), label);
    assert(await page.getByLabel('Status', { exact: true }).isEnabled());
    await page.getByLabel('Status', { exact: true }).selectOption('nonaktif');
    await page.getByLabel('Alasan perubahan', { exact: true }).fill('Jadwal selesai digunakan');
    await post(page, 'Simpan'); assert.equal(scheduleRow(id).status, 'nonaktif');
    assert.deepEqual(history(), savedHistory);
    pass('HISTORY_grades_without_meetings_lock_context_but_browser_can_edit_status');

    await page.reload(); await gradedRow.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Salin ke jadwal baru', exact: true }).click();
    await page.getByRole('heading', { name: 'Tambah Jadwal mengajar', exact: true }).waitFor();
    assert(await page.getByLabel('Guru', { exact: true }).isEnabled());
    assert.equal(await page.getByLabel('Guru', { exact: true }).inputValue(), '2');
    assert.equal(await page.getByLabel('Penugasan mulai', { exact: true }).inputValue(), '2026-07-01');
    const copy = await post(page, 'Simpan');
    assert.notEqual(copy.id_jadwal, id); assert.equal(scheduleRow(id).status, 'nonaktif');
    assert.equal(db.prepare('SELECT terverifikasi FROM ak_penugasan WHERE id_jadwal=?').get(copy.id_jadwal).terverifikasi, '1');
    await json('/api/admin', admin, { ...await list(id), table: 'jadwal', id, action: 'activate' }, 409);
    assert.deepEqual(history(), savedHistory);
    pass('COPY_new_schedule_has_new_id_and_assignment_preserves_history_and_blocks_conflicting_reactivation');

    const meetingSchedule = await create({ hari: 'Rabu' }), staleMetadata = await list(meetingSchedule.id_jadwal);
    assert.equal(staleMetadata.konteks_terkunci, false);
    const attendance = await json(`/api/absensi?id_jadwal=${meetingSchedule.id_jadwal}&tanggal=2026-10-28`, duty);
    await json('/api/absensi', duty, { id_jadwal: meetingSchedule.id_jadwal, tanggal: '2026-10-28', pertemuan_ke: 1, materi: 'Pertemuan pertama setelah form admin dibuka', items: attendance.data });
    const beforeRace = history();
    const race = await update(staleMetadata, { hari: 'Kamis' }, 409);
    assert.match(race.error, /riwayat jurnal atau absensi/);
    assert.equal((await list(meetingSchedule.id_jadwal)).konteks_terkunci, true);
    assert.deepEqual(history(), beforeRace);
    pass('HISTORY_new_meeting_after_admin_load_blocks_edit_and_preserves_attendance');

    const reportSchedule = await create({ id_kelas: '1', hari: 'Senin' });
    const reportRow = await list(reportSchedule.id_jadwal);
    assert.equal(reportRow.konteks_terkunci, true); assert.match(reportRow.alasan_kunci, /arsip rapor/);
    const reportGuard = await update(reportRow, { jam_mulai: '15:45' }, 409);
    assert.match(reportGuard.error, /arsip rapor/);
    const audit = db.prepare("SELECT * FROM ak_riwayat WHERE entity='jadwal' AND record_id=? AND action='ubah' ORDER BY rowid LIMIT 1").get(id);
    assert.equal(audit.actor_id, admin.user.id_user); assert.match(audit.alasan, /Koreksi guru/);
    assert.deepEqual(errors, []);
    pass('HISTORY_report_context_protected_and_successful_corrections_record_admin_reason');
  } finally { await ctx.close(); }
  unchanged(); pass('INTEGRITY_original_school_database_unchanged');
})().catch(error => {
  results.push({ id: 'schedule-edit', status: 'FAIL', message: error.stack }); console.error(error.stack);
}).finally(async () => {
  if (appBrowser) await appBrowser.close(); db.close();
  const report = { passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, tests: results };
  fs.writeFileSync(path.join(state, 'reports/schedule-edit.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed} PASS, ${report.failed} FAIL`); process.exitCode = report.failed ? 1 : 0;
});
