'use strict';
// Run after tsx_complete_workflows.cjs and tsx_crud_sidebar.cjs on an external fixture.
const { fs, path, state, base, db, assert, request, login, browser, context, unchanged } = require('./tsx_admin_helpers.cjs');
const results = [];
let appBrowser;
function pass(id) { results.push({ id, status: 'PASS' }); console.log('PASS ' + id); }
async function post(page, name, endpoint, scope = page, expected = 200) {
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === endpoint && r.request().method() === 'POST');
  await scope.getByRole('button', { name, exact: true }).click();
  const response = await pending, data = await response.json();
  assert.equal(response.status(), expected, JSON.stringify(data));
  return data;
}
async function field(page, label, value) {
  const locator = page.getByLabel(label, { exact: true });
  if (await locator.evaluate(el => el.tagName === 'SELECT')) await locator.selectOption(String(value));
  else await locator.fill(String(value));
}

(async () => {
  const admin = await login('uji_admin'), guru = await login('uji_guru'), head = await login('uji_kepsek');
  appBrowser = await browser();
  const ctx = await context(appBrowser, admin), page = await ctx.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const clock = hour => String(hour).padStart(2, '0') + ':00';
  const hour = [10, 11, 12, 13, 14, 15, 16, 17].find(h => !db.prepare("SELECT 1 FROM jadwal WHERE id_tahun_ajaran='1' AND hari='Kamis' AND status='aktif' AND (id_guru='2' OR id_kelas='2') AND substr(jam_mulai,1,5)<? AND substr(jam_selesai,1,5)>?").get(String(h + 2).padStart(2, '0') + ':10', clock(h)));
  assert.notEqual(hour, undefined, 'Two free synthetic schedule slots required');
  try {
    await page.goto(base + '/admin/jadwal');
    await page.getByRole('button', { name: 'Tambah Jadwal mengajar', exact: true }).click();
    for (const [label, value] of Object.entries({ Guru: '2', 'Mata pelajaran': '2', Kelas: '2', Hari: 'Kamis', 'Jam mulai': clock(hour), 'Jam selesai': clock(hour + 1) })) await field(page, label, value);
    assert.equal(await page.getByLabel('Penugasan mulai', { exact: true }).inputValue(), '2026-07-01');
    const created = await post(page, 'Simpan', '/api/admin'), id = created.data.id_jadwal;
    assert.equal(db.prepare('SELECT terverifikasi FROM ak_penugasan WHERE id_jadwal=?').get(id).terverifikasi, '1');
    await page.reload();
    let row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: clock(hour), exact: true }) }).filter({ has: page.getByRole('cell', { name: clock(hour + 1), exact: true }) }).filter({ has: page.getByRole('cell', { name: 'Kamis', exact: true }) });
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await field(page, 'Jam mulai', clock(hour).replace(':00', ':10'));
    await field(page, 'Alasan perubahan', 'Koreksi jadwal terverifikasi yang belum dipakai');
    await post(page, 'Simpan', '/api/admin');
    assert.equal(db.prepare('SELECT jam_mulai FROM jadwal WHERE id_jadwal=?').get(id).jam_mulai, clock(hour).replace(':00', ':10'));
    await page.reload();
    row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: clock(hour).replace(':00', ':10'), exact: true }) }).filter({ has: page.getByRole('cell', { name: clock(hour + 1), exact: true }) }).filter({ has: page.getByRole('cell', { name: 'Kamis', exact: true }) });
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await post(page, 'Nonaktifkan', '/api/admin', row);
    assert.equal(db.prepare('SELECT status FROM jadwal WHERE id_jadwal=?').get(id).status, 'nonaktif');
    await post(page, 'Aktifkan', '/api/admin', row);
    assert.equal(db.prepare('SELECT status FROM jadwal WHERE id_jadwal=?').get(id).status, 'aktif');
    pass('SCHEDULE_browser_create_verified_assignment_edit_before_use_status_and_cancel');

    const draft = await request('/api/admin', admin, { table: 'jadwal', action: 'create', id_guru: '2', id_mapel: '2', id_kelas: '2', id_tahun_ajaran: '1', hari: 'Kamis', jam_mulai: clock(hour + 1), jam_selesai: clock(hour + 2), ruang: '', status: 'aktif' });
    assert.equal(draft.status, 200, JSON.stringify(draft.json));
    const draftId = draft.json.data.id_jadwal;
    await page.reload();
    const draftRow = page.getByRole('row').filter({ has: page.getByRole('cell', { name: clock(hour + 1), exact: true }) }).filter({ has: page.getByRole('cell', { name: clock(hour + 2), exact: true }) }).filter({ has: page.getByRole('cell', { name: 'Kamis', exact: true }) });
    await draftRow.getByRole('button', { name: 'Edit', exact: true }).click();
    await field(page, 'Jam mulai', clock(hour + 1).replace(':00', ':10'));
    await field(page, 'Jam selesai', clock(hour + 2).replace(':00', ':10'));
    await field(page, 'Alasan perubahan', 'Ubah jadwal sebelum penugasan diverifikasi');
    await post(page, 'Simpan', '/api/admin');
    assert.equal(db.prepare('SELECT jam_mulai FROM jadwal WHERE id_jadwal=?').get(draftId).jam_mulai, clock(hour + 1).replace(':00', ':10'));
    await page.goto(base + '/admin/penugasan');
    await page.getByRole('button', { name: 'Penugasan mengajar', exact: true }).click();
    await page.getByRole('button', { name: 'Tambah Penugasan mengajar', exact: true }).click();
    await field(page, 'Jadwal', draftId);
    await field(page, 'Terverifikasi', '1');
    await field(page, 'Dasar penetapan / alasan koreksi', 'Verifikasi setelah koreksi jadwal');
    await post(page, 'Simpan penetapan', '/api/foundation');
    assert.equal(db.prepare('SELECT terverifikasi FROM ak_penugasan WHERE id_jadwal=?').get(draftId).terverifikasi, '1');
    pass('SCHEDULE_draft_edit_then_foundation_verification_persists');

    await page.goto(base + '/admin/audit');
    const pagination = page.getByRole('navigation', { name: 'Halaman tabel', exact: true });
    await pagination.waitFor();
    assert.equal(await page.locator('tbody tr').count(), 20);
    const firstPage = await page.locator('tbody').innerText();
    await pagination.getByRole('button', { name: 'Berikutnya', exact: true }).click();
    assert.notEqual(await page.locator('tbody').innerText(), firstPage);
    await pagination.getByRole('button', { name: 'Sebelumnya', exact: true }).click();
    assert.equal(await page.locator('tbody').innerText(), firstPage);
    await page.getByLabel('Cari riwayat', { exact: true }).fill('jadwal');
    await page.getByRole('button', { name: 'Lihat perubahan', exact: true }).first().click();
    await page.getByRole('heading', { name: 'Sesudah', exact: true }).waitFor();
    assert(!(await page.locator('main').innerText()).includes('$2b$'));
    await page.getByRole('button', { name: 'Tutup rincian', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Sesudah', exact: true }).count(), 0);
    const loaded = page.waitForResponse(r => new URL(r.url()).pathname === '/api/audit');
    await page.getByRole('button', { name: 'Muat ulang riwayat', exact: true }).click();
    assert.equal((await loaded).status(), 200);
    pass('AUDIT_pagination_search_details_close_refresh_and_redaction');

    await page.goto(base + '/admin/tahun-ajaran');
    const yearRow = page.getByRole('row').filter({ has: page.getByRole('cell', { name: '2026/2027', exact: true }) });
    await yearRow.getByRole('button', { name: 'Edit', exact: true }).click();
    assert(await page.getByLabel('Tahun ajaran (2026/2027)', { exact: true }).isDisabled());
    await field(page, 'Kunci transaksi', '1');
    await field(page, 'Alasan perubahan', 'Uji penguncian periode');
    await post(page, 'Simpan', '/api/admin');
    const grade = await request('/api/nilai?id_jadwal=1', guru);
    assert.equal(grade.status, 200);
    const blocked = await request('/api/nilai', guru, { id_jadwal: '1', id_aturan: grade.json.rule.id, items: grade.json.data, alasan: 'Nilai valid tetap ditolak pada periode terkunci' });
    assert.equal(blocked.status, 409);
    assert.match(blocked.json.error, /Periode terkunci/);
    await page.reload();
    await yearRow.getByRole('button', { name: 'Edit', exact: true }).click();
    await field(page, 'Kunci transaksi', '0');
    await field(page, 'Alasan perubahan', 'Buka kembali periode setelah uji');
    await post(page, 'Simpan', '/api/admin');
    assert.equal(db.prepare("SELECT dikunci FROM tahun_ajaran WHERE id_tahun_ajaran='1'").get().dikunci, '0');
    pass('YEAR_lock_rejects_teacher_write_and_unlock_persists');
    assert.deepEqual(errors, []);
  } finally { await ctx.close(); }

  const hc = await context(appBrowser, head), h = await hc.newPage();
  try {
    await h.goto(base + '/kepsek/evaluasi');
    await h.getByRole('row').filter({ hasText: 'Evaluasi Uji' }).getByRole('button', { name: 'Edit', exact: true }).click();
    await field(h, 'Isi catatan', 'Catatan supervisi hasil koreksi browser');
    await field(h, 'Alasan perubahan', 'Koreksi evaluasi sintetis');
    await post(h, 'Simpan', '/api/admin');
    await h.reload();
    await h.getByRole('cell', { name: 'Catatan supervisi hasil koreksi browser', exact: true }).waitFor();
    pass('HEAD_evaluation_edit_persists_after_reload');
  } finally { await hc.close(); }

  unchanged();
  pass('INTEGRITY_original_database_unchanged');
})().catch(error => {
  results.push({ id: 'followup', status: 'FAIL', message: error.stack }); console.error(error.stack);
}).finally(async () => {
  if (appBrowser) await appBrowser.close();
  db.close();
  const report = { passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, tests: results };
  fs.writeFileSync(path.join(state, 'reports/admin-button-followup.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed} PASS, ${report.failed} FAIL`);
  process.exitCode = report.failed ? 1 : 0;
});
