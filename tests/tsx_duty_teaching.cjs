'use strict';
// External synthetic fixture only; may follow tsx_complete_workflows.cjs.
const { fs, path, state, base, db, assert, request, login, browser, context, unchanged } = require('./tsx_admin_helpers.cjs');
const ExcelJS = require('exceljs');
const results = [], nonce = require('crypto').randomBytes(4).toString('hex');
let appBrowser;
function pass(id) { results.push({ id, status: 'PASS' }); console.log('PASS ' + id); }
async function json(url, session, body, expected = 200) {
  const r = await request(url, session, body);
  assert.equal(r.status, expected, JSON.stringify({ url, error: r.json?.error })); return r.json;
}
async function post(page, name, endpoint) {
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === endpoint && r.request().method() === 'POST');
  await page.getByRole('button', { name, exact: true }).click();
  const response = await pending, data = await response.json(); assert.equal(response.status(), 200, JSON.stringify(data)); return data.data;
}
const dailyRows = () => db.prepare('SELECT * FROM ak_absensi_harian ORDER BY id').all();
const meetingRows = () => db.prepare('SELECT * FROM ak_pertemuan ORDER BY id').all();
const auditCount = () => db.prepare('SELECT COUNT(*) n FROM ak_riwayat').get().n;

(async () => {
  const duty = await login('uji_piket'), admin = await login('uji_admin');
  assert(duty.user.is_piket);
  assert.equal((await json('/api/jadwal', duty)).data.length, 0, 'Duty fixture must begin without an own teaching assignment');
  appBrowser = await browser();
  const ctx = await context(appBrowser, duty), page = await ctx.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/guru/impor');
    await page.getByText('Belum ada penugasan mengajar terverifikasi untuk akun ini.', { exact: false }).waitFor();
    assert.equal(await page.getByLabel('Berkas impor', { exact: true }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Unduh Template CSV', exact: true }).count(), 0);
    await page.getByRole('link', { name: 'Buka presensi harian piket', exact: true }).click();
    await page.waitForURL(base + '/piket');
    await page.goto(base + '/guru/absen?tanggal=2026-10-29');
    await page.getByText('Absensi sesi membutuhkan jadwal mengajar milik Anda,', { exact: false }).waitFor();
    assert.equal(await page.getByLabel('Materi pembelajaran', { exact: true }).count(), 0);
    assert.equal(await page.getByLabel('Cari siswa', { exact: true }).count(), 0);
    await page.getByRole('link', { name: 'Buka presensi harian piket', exact: true }).waitFor();
    await page.goto(base + '/guru/jadwal?tanggal=2026-10-29');
    await page.getByText('Jadwal pribadi muncul setelah admin menetapkan dan memverifikasi penugasan mengajar.', { exact: false }).waitFor();
    pass('DUTY_without_teaching_assignment_has_clear_guidance_and_daily_attendance_link');

    const dailyBefore = dailyRows();
    await page.goto(base + '/guru/jurnal?tanggal=2026-10-29');
    const classPicker = page.getByLabel('Kelas jurnal', { exact: true });
    await classPicker.locator('option[value="1/1"]').waitFor({ state: 'attached' });
    await classPicker.selectOption('1/1');
    await page.getByLabel('Pilih / edit jurnal kelas', { exact: true }).selectOption('7');
    await page.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).click();
    const dialog = page.getByRole('dialog');
    assert.match(await dialog.innerText(), /XII PPLG 2/);
    assert.match(await dialog.innerText(), /29-10-2026/);
    await dialog.getByRole('button', { name: 'Ya, edit jurnal ini', exact: true }).click();
    const material = 'Jurnal kolaboratif oleh guru piket ' + nonce;
    await page.getByLabel('Materi pembelajaran', { exact: true }).fill(material);
    await page.getByLabel('Alasan koreksi', { exact: true }).fill('Pemeriksaan jurnal bersama');
    const journal = await post(page, 'Simpan Jurnal', '/api/jurnal');
    assert.equal(journal.id_guru, '1');
    assert.equal(journal.updated_by, duty.user.id_user);
    await page.reload();
    await classPicker.selectOption('1/1');
    await page.getByLabel('Pilih / edit jurnal kelas', { exact: true }).selectOption('7');
    await page.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Materi pembelajaran', { exact: true }).inputValue(), material);
    const history = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Riwayat Jurnal KBM', exact: true }) });
    await history.getByText(material, { exact: true }).waitFor();
    assert.deepEqual(dailyRows(), dailyBefore);
    pass('DUTY_shared_class_journal_confirmation_save_and_history_reload_without_own_schedule');

    const draft = (await json('/api/admin', admin, { table: 'jadwal', action: 'create', id_guru: '3', id_mapel: '1', id_kelas: '1', id_tahun_ajaran: '1', hari: 'Kamis', jam_mulai: '15:30', jam_selesai: '16:10', ruang: '' })).data;
    assert(!(await json('/api/jadwal', duty)).data.some(j => j.id_jadwal === draft.id_jadwal));
    await json('/api/foundation', admin, { kind: 'penugasan', id_jadwal: draft.id_jadwal, mulai: '2026-07-01', selesai: '2026-12-31', terverifikasi: '1', catatan: 'Penugasan mengajar sintetis guru piket' });
    assert((await json('/api/jadwal?tanggal=2026-10-29', duty)).data.some(j => j.id_jadwal === draft.id_jadwal));
    await page.goto(base + '/guru/jadwal?tanggal=2026-10-29');
    await page.getByRole('link', { name: 'Buka Absen', exact: true }).click();
    await page.getByLabel('9000001 H', { exact: true }).waitFor();
    await page.getByLabel('9000001 H', { exact: true }).click();
    await page.getByLabel('9000002 S', { exact: true }).click();
    await page.getByLabel('Materi pembelajaran', { exact: true }).fill('Absensi dan jurnal guru piket dengan penugasan');
    await post(page, 'Simpan Absensi & Jurnal', '/api/absensi');
    await page.reload();
    await page.getByLabel('9000002 S', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('9000002 S', { exact: true }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(dailyRows(), dailyBefore);
    pass('ADMIN_verified_teaching_assignment_unlocks_duty_schedule_roster_attendance_and_journal');

    const csv = Buffer.from('nis,status,keterangan\n9000001,H,Uji hadir\n9000002,S,Uji sakit\n');
    const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet('Absensi');
    sheet.addRow(['nis', 'status', 'keterangan']); sheet.addRow(['9000001', 'H', 'Uji hadir']); sheet.addRow(['9000002', 'S', 'Uji sakit']);
    const xlsx = Buffer.from(await workbook.xlsx.writeBuffer());
    const current = (await json(`/api/absensi?id_jadwal=${draft.id_jadwal}&tanggal=2026-10-29`, duty)).meeting;
    const input = { action: 'preview', module: 'absensi', id_jadwal: draft.id_jadwal, tanggal: '2026-10-29', revision: current.revision, materi: 'Impor terkendali', alasan: 'Koreksi melalui impor' };
    const before = meetingRows(), auditsBefore = auditCount();
    for (const number of [-10, 0, 1.5, 1001]) for (const [filename, buffer] of [['absensi.csv', csv], ['absensi.xlsx', xlsx]]) {
      const result = await json('/api/impor-akademik', duty, { ...input, pertemuan_ke: number, filename, content: buffer.toString('base64') }, 422);
      assert.match(result.error, /bilangan bulat 1–1000/);
    }
    assert.deepEqual(meetingRows(), before); assert.equal(auditCount(), auditsBefore);
    pass('IMPORT_server_rejects_negative_zero_fraction_and_overflow_for_CSV_and_XLSX_atomically');

    await page.goto(base + '/guru/impor');
    await page.getByLabel('Jadwal impor', { exact: true }).selectOption(draft.id_jadwal);
    await page.getByLabel('Tanggal pertemuan', { exact: true }).fill('2026-10-29');
    await page.getByLabel('Materi pembelajaran', { exact: true }).fill('Impor absensi guru piket ' + nonce);
    await page.getByLabel('Alasan / dasar impor', { exact: true }).fill('Koreksi impor sintetis');
    await page.getByLabel('Berkas impor', { exact: true }).setInputFiles({ name: 'absensi.csv', mimeType: 'text/csv', buffer: csv });
    const number = page.getByLabel('Pertemuan ke', { exact: true });
    assert.equal(await number.getAttribute('min'), '1'); assert.equal(await number.getAttribute('max'), '1000'); assert.equal(await number.getAttribute('step'), '1');
    let previewPosts = 0;
    page.on('request', r => { if (new URL(r.url()).pathname === '/api/impor-akademik' && r.method() === 'POST') previewPosts++; });
    for (const value of ['-10', '0', '1.5', '1001']) {
      await number.fill(value); assert.equal(await number.evaluate(el => el.validity.valid), false);
      await page.getByRole('button', { name: 'Pratinjau berkas', exact: true }).click();
      await page.getByText('Pertemuan ke harus berupa bilangan bulat 1–1000.', { exact: true }).waitFor();
    }
    assert.equal(previewPosts, 0);
    await number.fill('2'); await post(page, 'Pratinjau berkas', '/api/impor-akademik');
    assert.deepEqual(meetingRows(), before);
    await page.getByRole('checkbox').check(); await post(page, 'Konfirmasi impor', '/api/impor-akademik');
    const afterImport = (await json(`/api/absensi?id_jadwal=${draft.id_jadwal}&tanggal=2026-10-29`, duty)).meeting;
    assert.equal(afterImport.pertemuan_ke, '2'); assert.equal(afterImport.materi, 'Impor absensi guru piket ' + nonce);
    const validXlsx = await json('/api/impor-akademik', duty, { ...input, revision: afterImport.revision, pertemuan_ke: 3, filename: 'absensi.xlsx', content: xlsx.toString('base64') });
    await json('/api/impor-akademik', duty, { action: 'commit', token: validXlsx.data.token, konfirmasi: true });
    assert.equal((await json(`/api/absensi?id_jadwal=${draft.id_jadwal}&tanggal=2026-10-29`, duty)).meeting.pertemuan_ke, '3');
    pass('IMPORT_browser_blocks_invalid_numbers_and_valid_CSV_XLSX_preview_commit_persist');

    const event = (await json('/api/kalender', admin, { id_tahun_ajaran: '1', judul: 'Agenda piket ' + nonce, mulai: '2026-11-05', selesai: '2026-11-05', jenis: 'Agenda', status: 'draft', catatan: 'Agenda sintetis' })).data;
    assert(!(await json('/api/kalender?bulan=2026-11', duty)).data.some(r => r.id === event.id));
    await json('/api/kalender', admin, { ...event, status: 'disahkan', alasan: 'Pengesahan agenda sintetis' });
    await page.goto(base + '/guru/kalender');
    await page.getByLabel('Bulan', { exact: true }).fill('2026-11');
    await page.getByRole('cell', { name: 'Agenda piket ' + nonce, exact: true }).waitFor();
    await page.reload();
    await page.getByRole('cell', { name: 'Agenda piket ' + nonce, exact: true }).waitFor();
    await page.getByLabel('Bulan', { exact: true }).fill('2026-08');
    await page.getByText('Belum ada agenda yang disahkan pada bulan ini.', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    pass('CALENDAR_admin_draft_hidden_then_approved_event_visible_and_empty_month_explained');
  } finally { await ctx.close(); }
  unchanged(); pass('INTEGRITY_original_school_database_unchanged');
})().catch(error => {
  results.push({ id: 'duty-teaching', status: 'FAIL', message: error.stack }); console.error(error.stack);
}).finally(async () => {
  if (appBrowser) await appBrowser.close(); db.close();
  const report = { passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, tests: results };
  fs.writeFileSync(path.join(state, 'reports/duty-teaching.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed} PASS, ${report.failed} FAIL`); process.exitCode = report.failed ? 1 : 0;
});
