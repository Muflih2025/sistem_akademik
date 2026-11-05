'use strict';
const { fs, path, state, base, db, assert, request, login, browser, context, unchanged } = require('./tsx_admin_helpers.cjs');
const results = [];
let appBrowser;
function pass(id) { results.push({ id, status: 'PASS' }); console.log('PASS ' + id); }
async function save(page, label, endpoint) {
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === endpoint && r.request().method() === 'POST');
  await page.getByRole('button', { name: label, exact: true }).click();
  const response = await pending;
  assert.equal(response.status(), 200, await response.text());
}

(async () => {
  const teacher = await login('uji_guru_lain'), first = await login('uji_guru');
  appBrowser = await browser();
  const ctx = await context(appBrowser, teacher), page = await ctx.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(base + '/guru/absen?id_jadwal=2&tanggal=2026-10-30');
    await page.getByLabel('9000003 I', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('9000001 H', { exact: true }).count(), 0);
    await page.getByLabel('9000003 I', { exact: true }).click();
    await page.getByLabel('Materi pembelajaran', { exact: true }).fill('Materi guru pembanding pada kelas sendiri');
    await save(page, 'Simpan Absensi & Jurnal', '/api/absensi');
    await page.reload();
    await page.getByLabel('9000003 I', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('9000003 I', { exact: true }).getAttribute('aria-pressed'), 'true');
    pass('TEACHER_COMPARISON_attendance_and_journal_own_roster_persist');

    await page.goto(base + '/guru/nilai?id_jadwal=2');
    for (const component of ['tugas', 'uts', 'uas']) await page.getByLabel('9000003 ' + component, { exact: true }).fill('79');
    await page.getByLabel('Deskripsi capaian 9000003', { exact: true }).fill('Mampu mengerjakan praktik secara mandiri.');
    await save(page, 'Simpan Nilai', '/api/nilai');
    await page.reload();
    await page.getByLabel('9000003 tugas', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('9000003 tugas', { exact: true }).inputValue(), '79');
    assert.equal(await page.getByLabel('Deskripsi capaian 9000003', { exact: true }).inputValue(), 'Mampu mengerjakan praktik secara mandiri.');
    const own = await request('/api/export?kind=nilai&id_jadwal=2&format=csv', teacher);
    assert.equal(own.status, 200);
    assert(own.bytes.toString().includes('9000003'));
    assert(!own.bytes.toString().includes('9000001'));
    const other = await request('/api/export?kind=nilai&id_jadwal=1&format=csv', first);
    assert.equal(other.status, 200);
    assert(!other.bytes.toString().includes('9000003'));
    for (const [session, id] of [[teacher, '1'], [first, '2']]) {
      assert.equal((await request('/api/nilai?id_jadwal=' + id, session)).status, 403);
      assert.equal((await request('/api/absensi?id_jadwal=' + id + '&tanggal=2026-10-30', session)).status, 403);
    }
    pass('TEACHER_COMPARISON_grades_description_exports_and_cross_teacher_boundaries');

    const activities = await request('/api/ekskul', teacher);
    assert.equal(activities.status, 200);
    const unassigned = activities.json.activities.find(activity => !activity.boleh_menilai);
    assert(unassigned);
    await page.goto(base + '/guru/ekskul');
    await page.getByLabel('Kelas kegiatan', { exact: true }).selectOption('1/1');
    await page.getByLabel('Kegiatan', { exact: true }).selectOption(unassigned.id_ekskul);
    await page.getByRole('alert').filter({ hasText: 'belum ditugaskan sebagai pembina' }).waitFor();
    assert(await page.getByRole('button', { name: 'Simpan nilai kegiatan', exact: true }).isDisabled());
    assert.deepEqual(errors, []);
    pass('TEACHER_COMPARISON_unassigned_coach_has_clear_message_and_disabled_save');
  } finally { await ctx.close(); }
  unchanged();
  pass('INTEGRITY_original_school_database_unchanged');
})().catch(error => {
  results.push({ id: 'comparison', status: 'FAIL', message: error.stack }); console.error(error.stack);
}).finally(async () => {
  if (appBrowser) await appBrowser.close();
  db.close();
  const report = { passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, tests: results };
  fs.writeFileSync(path.join(state, 'reports/teacher-comparison.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed} PASS, ${report.failed} FAIL`);
  process.exitCode = report.failed ? 1 : 0;
});
