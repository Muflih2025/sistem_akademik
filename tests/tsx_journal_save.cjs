'use strict';
// Fresh schema-only fixture from tsx_teacher_setup.py; never the school database.
const { fs, path, state, base, db, assert, request, login, browser, context, unchanged } = require('./tsx_admin_helpers.cjs');
const results = [];
function record(id) { results.push({ id, status: 'PASS' }); console.log('PASS ' + id); }
const meeting = () => db.prepare("SELECT * FROM ak_pertemuan WHERE id_jadwal='1' AND tanggal='2026-10-30'").get();
async function ready(page) {
  await page.waitForFunction(() => {
    const input = document.querySelector('[aria-label="Materi pembelajaran"]');
    return input && !input.disabled;
  });
}
async function save(page, endpoint = '/api/jurnal') {
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === endpoint && r.request().method() === 'POST');
  await page.getByRole('button', { name: endpoint === '/api/jurnal' ? 'Simpan Jurnal' : 'Simpan Absensi & Jurnal', exact: true }).click();
  const response = await pending;
  assert.equal(response.status(), 200, await response.text());
  await page.locator('[data-status=success]').waitFor();
}
(async () => {
  assert.equal(db.prepare('SELECT COUNT(*) n FROM ak_pertemuan').get().n, 0, 'Create a fresh fixture for each journal regression');
  const guru = await login('uji_guru'), other = await login('uji_guru_lain'), b = await browser();
  try {
    const ctx = await context(b, guru), page = await ctx.newPage(), browserErrors = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    await page.goto(base + '/guru/jurnal?id_jadwal=1&tanggal=2026-10-30'); await ready(page);
    await page.getByLabel('Materi pembelajaran', { exact: true }).fill('Jurnal mandiri sebelum absensi');
    await page.getByLabel('Jam pelajaran (opsional)', { exact: true }).fill(' 1 - 2 ');
    await save(page);
    assert.equal(meeting().jam_ke, '1 - 2');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM ak_absensi_sesi').get().n, 0);
    await page.reload(); await ready(page);
    assert.equal(await page.getByLabel('Materi pembelajaran', { exact: true }).inputValue(), 'Jurnal mandiri sebelum absensi');
    record('JOURNAL_create_with_trimmed_lesson_and_reload_without_inventing_attendance');

    const before = meeting(), audits = db.prepare('SELECT COUNT(*) n FROM ak_riwayat').get().n;
    await page.getByLabel('Materi pembelajaran', { exact: true }).fill('Koreksi jurnal setelah reload');
    await page.getByRole('button', { name: 'Simpan Jurnal', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Alasan koreksi wajib diisi' }).waitFor();
    assert.equal(meeting().revision, before.revision);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM ak_riwayat').get().n, audits);
    record('JOURNAL_empty_correction_reason_shows_actionable_error_without_writes');

    await page.getByLabel('Alasan koreksi', { exact: true }).fill('Melengkapi jurnal mandiri');
    await save(page); await page.reload(); await ready(page);
    assert.equal(await page.getByLabel('Materi pembelajaran', { exact: true }).inputValue(), 'Koreksi jurnal setelah reload');
    const history = db.prepare("SELECT alasan FROM ak_riwayat WHERE entity='ak_pertemuan' AND action='ubah' ORDER BY rowid DESC LIMIT 1").get();
    assert.equal(history.alasan, 'Melengkapi jurnal mandiri');
    record('JOURNAL_correction_persists_and_records_reason');

    await page.goto(base + '/guru/absen?id_jadwal=1&tanggal=2026-10-30'); await ready(page);
    await page.getByLabel('9000001 H', { exact: true }).click();
    await page.getByLabel('9000002 S', { exact: true }).click();
    await page.getByLabel('Alasan koreksi', { exact: true }).fill('Melengkapi kehadiran pertemuan');
    await save(page, '/api/absensi');
    const sessions = JSON.stringify(db.prepare('SELECT * FROM ak_absensi_sesi ORDER BY nis').all());
    await page.goto(base + '/guru/jurnal?id_jadwal=1&tanggal=2026-10-30'); await ready(page);
    await page.getByLabel('Materi pembelajaran', { exact: true }).fill('Jurnal setelah absensi tersimpan');
    await page.getByLabel('Alasan koreksi', { exact: true }).fill('Melengkapi kegiatan pembelajaran');
    await save(page); await page.reload(); await ready(page);
    assert.equal(meeting().materi, 'Jurnal setelah absensi tersimpan');
    assert.equal(JSON.stringify(db.prepare('SELECT * FROM ak_absensi_sesi ORDER BY nis').all()), sessions);
    assert.equal(await page.getByLabel('Materi pembelajaran', { exact: true }).inputValue(), meeting().materi);
    record('JOURNAL_edit_after_attendance_preserves_all_session_rows');

    // A successful POST must stay a success when refreshing the history fails.
    await page.route('**/api/jurnal?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Simulasi riwayat tidak tersedia' }) }));
    await page.getByLabel('Materi pembelajaran', { exact: true }).fill('Simpan tetap berhasil saat riwayat gagal dimuat');
    await page.getByLabel('Alasan koreksi', { exact: true }).fill('Uji gangguan pemuatan riwayat');
    await save(page);
    await page.locator('[data-status=success]').filter({ hasText: 'Riwayat belum dapat diperbarui' }).waitFor();
    assert.equal(await page.locator('[data-status=error]').count(), 0);
    assert.equal(meeting().materi, 'Simpan tetap berhasil saat riwayat gagal dimuat');
    await page.unroute('**/api/jurnal?*'); await page.reload(); await ready(page);
    assert.equal(await page.getByLabel('Materi pembelajaran', { exact: true }).inputValue(), meeting().materi);
    record('JOURNAL_history_refresh_failure_does_not_report_saved_data_as_failed');

    // A wrong day is rejected with a visible error; choosing the correct date recovers.
    await page.getByLabel('Tanggal KBM', { exact: true }).fill('2026-10-29');
    await page.getByRole('alert').filter({ hasText: 'Tanggal tidak sesuai' }).waitFor();
    assert(await page.getByRole('button', { name: 'Simpan Jurnal', exact: true }).isDisabled());
    await page.getByLabel('Tanggal KBM', { exact: true }).fill('2026-10-30'); await ready(page);
    assert.equal(await page.getByLabel('Materi pembelajaran', { exact: true }).inputValue(), meeting().materi);
    record('JOURNAL_wrong_day_cannot_write_and_correct_date_recovers');

    const current = meeting();
    let r = await request('/api/jurnal', guru, { ...current, revision: 0, alasan: 'Versi lama' });
    assert.equal(r.status, 409);
    r = await request('/api/jurnal', other, { ...current, alasan: 'Guru di luar penugasan' }); assert.equal(r.status, 403);
    r = await request('/api/jurnal', guru, { ...current, jam_ke: '99', alasan: 'Jam tidak valid' }); assert.equal(r.status, 422);
    r = await request('/api/jurnal', guru, { ...current, alasan: '' }); assert.equal(r.status, 422);
    assert.equal(meeting().revision, current.revision);
    assert.equal(JSON.stringify(db.prepare('SELECT * FROM ak_absensi_sesi ORDER BY nis').all()), sessions);
    record('JOURNAL_server_keeps_revision_scope_reason_and_lesson_guards');

    // Seed a legacy lesson label in this synthetic DB. Editing other fields
    // must not reject an unchanged historical value after adding normalization.
    db.prepare("UPDATE ak_pertemuan SET jam_ke=? WHERE id_jadwal='1' AND tanggal='2026-10-30'").run(' Jam lama 1 dan 2 ');
    await page.reload(); await ready(page);
    await page.getByLabel('Materi pembelajaran', { exact: true }).fill('Koreksi materi dengan jam legacy tetap');
    await page.getByLabel('Alasan koreksi', { exact: true }).fill('Mempertahankan isian jam historis');
    await save(page);
    assert.equal(meeting().jam_ke, ' Jam lama 1 dan 2 ');
    record('JOURNAL_unchanged_legacy_lesson_label_remains_editable');
    assert.deepEqual(browserErrors, []); record('JOURNAL_no_browser_runtime_errors');
    await ctx.close();
  } finally { await b.close(); }
  unchanged(); record('INTEGRITY_original_school_database_unchanged');
})().catch(error => {
  results.push({ id: 'journal_regression', status: 'FAIL', message: error.stack }); console.error(error.stack);
}).finally(() => {
  db.close();
  const report = { method: 'Real Chromium clicks, reloads, SQLite checks and HTTP against an isolated synthetic database', passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, tests: results };
  fs.writeFileSync(path.join(state, 'reports/journal-save.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed} PASS, ${report.failed} FAIL`); process.exitCode = report.failed ? 1 : 0;
});
