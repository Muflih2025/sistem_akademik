'use strict';
// Run on a fresh external fixture, or after tsx_complete_workflows.cjs.
// Archived years below are synthetic history, never changes to the school DB.
const { fs, path, state, base, db, assert, request, login, browser, context, unchanged } = require('./tsx_admin_helpers.cjs');
const results = [], nonce = require('crypto').randomBytes(4).toString('hex');
let appBrowser;
function pass(id) { results.push({ id, status: 'PASS' }); console.log('PASS ' + id); }
async function json(url, session, body, expected = 200) {
  const r = await request(url, session, body);
  assert.equal(r.status, expected, JSON.stringify({ url, error: r.json?.error }));
  return r.json;
}
async function clickSave(page) {
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin' && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  const response = await pending, data = await response.json();
  assert.equal(response.status(), 200, JSON.stringify(data));
  await page.getByText('Data tersimpan. Daftar telah diperbarui.', { exact: true }).waitFor();
  return data.data;
}
const evaluationState = () => db.prepare('SELECT * FROM catatan_evaluasi ORDER BY id_evaluasi').all();
const auditCount = () => db.prepare('SELECT COUNT(*) n FROM ak_riwayat').get().n;

(async () => {
  const admin = await login('uji_admin'), head = await login('uji_kepsek');
  const archivedId = '89';
  const existing = db.prepare('SELECT * FROM tahun_ajaran WHERE id_tahun_ajaran=?').get(archivedId);
  if (!existing) db.prepare("INSERT INTO tahun_ajaran(id_tahun_ajaran,tahun_ajaran,semester,status,dikunci,rapor_diterbitkan) VALUES(?,'2025/2026','Genap','Tidak Aktif','0','0')").run(archivedId);
  const yearsBefore = db.prepare('SELECT * FROM tahun_ajaran ORDER BY id_tahun_ajaran').all();
  const years = (await json('/api/admin?table=tahun_ajaran', head)).data;
  assert(years.some(y => y.id_tahun_ajaran === archivedId && y.tahun_ajaran === '2025/2026' && y.semester === 'Genap' && y.status === 'Tidak Aktif'));
  assert(years.some(y => y.id_tahun_ajaran === '1' && y.status === 'Aktif'));
  pass('HEAD_existing_active_and_archived_periods_are_selectable');

  appBrowser = await browser();
  let desktopSaved;
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const ctx = await context(appBrowser, head);
    try {
      const page = await ctx.newPage(), errors = [];
      await page.setViewportSize(viewport);
      page.on('pageerror', error => errors.push(error.message));
      const title = `Evaluasi arsip ${viewport.width} ${nonce}`;
      await page.goto(base + '/kepsek/evaluasi');
      await page.getByRole('button', { name: 'Tambah Catatan evaluasi', exact: true }).click();
      await page.getByLabel('Judul', { exact: true }).fill(title);
      await page.getByLabel('Isi catatan', { exact: true }).fill('Catatan untuk semester genap yang sudah diarsipkan');
      await page.getByLabel('Periode', { exact: true }).selectOption(archivedId);
      const saved = await clickSave(page);
      assert.equal(saved.id_tahun_ajaran, archivedId);
      await page.reload();
      const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: title, exact: true }) });
      await row.waitFor();
      await row.getByRole('cell', { name: '2025/2026 Genap', exact: true }).waitFor();
      assert(await row.getByRole('button', { name: 'Edit', exact: true }).evaluate(button => {
        const range = document.createRange(); range.selectNodeContents(button);
        return range.getBoundingClientRect().height <= parseFloat(getComputedStyle(button).lineHeight) + 1;
      }), 'Table action text must remain readable on one line');
      await row.getByRole('button', { name: 'Edit', exact: true }).click();
      assert.equal(await page.getByLabel('Periode', { exact: true }).inputValue(), archivedId);
      const corrected = `Koreksi evaluasi arsip ${viewport.width} ${nonce}`;
      await page.getByLabel('Isi catatan', { exact: true }).fill(corrected);
      await page.getByLabel('Alasan perubahan', { exact: true }).fill('Koreksi catatan supervisi periode arsip');
      const updated = await clickSave(page);
      assert.equal(updated.id_evaluasi, saved.id_evaluasi);
      assert.notEqual(updated.etag, saved.etag);
      await page.reload();
      await row.getByRole('cell', { name: corrected, exact: true }).waitFor();
      assert.equal(db.prepare('SELECT isi FROM catatan_evaluasi WHERE id_evaluasi=?').get(saved.id_evaluasi).isi, corrected);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page must fit viewport');
      await page.screenshot({ path: path.join(state, 'screenshots', `evaluation-archived-${viewport.width}.png`), fullPage: true });
      assert.deepEqual(errors, []);
      if (viewport.width === 1440) desktopSaved = updated;
      pass(`HEAD_browser_create_edit_reload_archived_period_${viewport.width}`);
    } finally { await ctx.close(); }
  }

  const created = (await json('/api/admin', admin, { table: 'catatan_evaluasi', action: 'create', judul: 'Evaluasi admin ' + nonce, isi: 'Evaluasi semester berjalan', id_tahun_ajaran: '1' })).data;
  const edited = (await json('/api/admin', admin, { ...created, table: 'catatan_evaluasi', action: 'update', id: created.id_evaluasi, id_tahun_ajaran: archivedId, alasan: 'Pindahkan catatan ke semester yang tepat' })).data;
  assert.equal(edited.id_tahun_ajaran, archivedId);
  assert.equal(db.prepare('SELECT id_tahun_ajaran FROM catatan_evaluasi WHERE id_evaluasi=?').get(edited.id_evaluasi).id_tahun_ajaran, archivedId);
  const audit = db.prepare("SELECT * FROM ak_riwayat WHERE entity='catatan_evaluasi' AND record_id=? ORDER BY rowid DESC LIMIT 1").get(edited.id_evaluasi);
  assert.equal(audit.actor_id, admin.user.id_user);
  assert.equal(JSON.parse(audit.sebelum).id_tahun_ajaran, '1');
  assert.equal(JSON.parse(audit.sesudah).id_tahun_ajaran, archivedId);
  pass('ADMIN_create_and_correct_period_with_actor_and_audit_history');

  let before = evaluationState(), count = auditCount();
  for (const session of [admin, head]) for (const period of ['', 'nonexistent-period']) {
    const invalid = { table: 'catatan_evaluasi', judul: 'Referensi tidak valid', isi: 'Harus ditolak', id_tahun_ajaran: period };
    await json('/api/admin', session, { ...invalid, action: 'create' }, 422);
    await json('/api/admin', session, { ...edited, ...invalid, action: 'update', id: edited.id_evaluasi }, 422);
  }
  assert.deepEqual(evaluationState(), before);
  assert.equal(auditCount(), count);
  pass('VALIDATION_missing_and_unknown_period_rejected_atomically_on_create_and_edit');

  const latest = (await json('/api/admin?table=catatan_evaluasi&limit=1000', head)).data.find(r => r.id_evaluasi === desktopSaved.id_evaluasi);
  await json('/api/admin', head, { ...latest, table: 'catatan_evaluasi', action: 'update', id: latest.id_evaluasi, isi: 'Versi terbaru ' + nonce, alasan: 'Uji konflik dua pengelola' });
  before = evaluationState(); count = auditCount();
  await json('/api/admin', admin, { ...desktopSaved, table: 'catatan_evaluasi', action: 'update', id: desktopSaved.id_evaluasi, isi: 'Versi kedaluwarsa', alasan: 'Harus ditolak' }, 409);
  assert.deepEqual(evaluationState(), before);
  assert.equal(auditCount(), count);
  pass('CONCURRENCY_stale_archived_evaluation_cannot_overwrite_latest_version');

  for (const username of ['uji_guru', 'uji_guru_lain', 'uji_piket', 'uji_siswa']) {
    const session = await login(username);
    await json('/api/admin?table=catatan_evaluasi', session, undefined, 403);
    await json('/api/admin', session, { table: 'catatan_evaluasi', action: 'create', judul: 'Tanpa izin', isi: 'Harus ditolak', id_tahun_ajaran: archivedId }, 403);
    await json('/api/admin', session, { ...edited, table: 'catatan_evaluasi', action: 'update', id: edited.id_evaluasi, isi: 'Tanpa izin' }, 403);
  }
  assert.deepEqual(evaluationState(), before);
  assert.equal(auditCount(), count);
  pass('PERMISSIONS_only_admin_and_head_may_read_or_write_evaluations');

  const scheduleCount = db.prepare('SELECT COUNT(*) n FROM jadwal').get().n;
  const invalidSchedule = await json('/api/admin', admin, { table: 'jadwal', action: 'create', id_guru: '1', id_mapel: '1', id_kelas: '1', hari: 'Senin', jam_mulai: '15:30', jam_selesai: '16:30', ruang: '', id_tahun_ajaran: archivedId }, 422);
  assert.match(invalidSchedule.error, /Referensi tidak dikenal atau nonaktif/);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM jadwal').get().n, scheduleCount);
  assert.equal(auditCount(), count);
  assert.deepEqual(db.prepare('SELECT * FROM tahun_ajaran ORDER BY id_tahun_ajaran').all(), yearsBefore);
  pass('ISOLATION_archived_schedule_still_rejected_and_academic_periods_unchanged');
  unchanged();
  pass('INTEGRITY_original_school_database_unchanged');
})().catch(error => {
  results.push({ id: 'evaluation-period', status: 'FAIL', message: error.stack }); console.error(error.stack);
}).finally(async () => {
  if (appBrowser) await appBrowser.close();
  db.close();
  const report = { passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, tests: results };
  fs.writeFileSync(path.join(state, 'reports/evaluation-period.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed} PASS, ${report.failed} FAIL`); process.exitCode = report.failed ? 1 : 0;
});
