'use strict';
// Run against the external, schema-only fixture created by tsx_review_setup.py.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const STATE = path.resolve(process.env.SIA_REVIEW_STATE || path.join(require('os').homedir(), '.local/state/sia-tsx-audit-20261104-latest'));
const BASE = process.env.SIA_REVIEW_BASE || 'http://127.0.0.1:18130';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(BASE)) throw Error('Explicit loopback URL required');
const fixture = path.join(STATE, 'app/data/sia.db');
if (fixture.startsWith(ROOT + path.sep)) throw Error('External synthetic fixture required');
const db = new (require('better-sqlite3'))(fixture, { fileMustExist: true });
if (db.prepare('SELECT COUNT(*) n FROM siswa').get().n !== 3 || !db.prepare("SELECT 1 FROM guru WHERE nama_guru='Guru Review Satu'").get()) throw Error('Synthetic fixture required');
const secrets = JSON.parse(fs.readFileSync(path.join(STATE, 'private.json')));
const results = [];
function record(id, ok, observed) {
  results.push({ id, status: ok ? 'PASS' : 'FAIL', observed });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}`);
}
async function request(url, session, body) {
  const r = await fetch(BASE + url, {
    redirect: 'manual', signal: AbortSignal.timeout(90000), method: body ? 'POST' : 'GET',
    headers: { ...(session ? { Cookie: session.cookie } : {}), ...(body ? { 'Content-Type': 'application/json', Origin: BASE } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text(); let json;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, headers: r.headers, text, json };
}
async function login(username) {
  const r = await request('/api/auth', null, { username, password: secrets.password });
  if (r.status !== 200 || !r.json?.success) throw Error('Fixture login failed');
  return { cookie: r.headers.get('set-cookie').split(';')[0], user: r.json.user };
}
const count = table => db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n;
(async () => {
  const admin = await login('uji_admin'), guru = await login('uji_guru'), student = await login('uji_siswa'), head = await login('uji_kepsek');
  let r = await request('/api/users', admin);
  record('ADMIN_users_query', r.status === 200, { http: r.status, error: r.json?.error });
  r = await request('/api/piket?tanggal=2026-10-30');
  record('AUTH_guest_piket_denied', r.status === 401, { http: r.status });
  r = await request('/piket', guru);
  record('ROUTING_no_piket_self_redirect', !r.headers.get('location')?.endsWith('/piket'), { http: r.status, location: r.headers.get('location') });
  r = await request('/api/master?table=siswa', student);
  record('RBAC_student_master_denied', r.status === 403, { http: r.status, rows: r.json?.data?.length });
  r = await request('/api/jadwal', guru);
  record('RBAC_teacher_schedule_scoped', r.status === 200 && r.json.data.length === 2 && r.json.data.every(x => x.id_guru === '1'), { http: r.status, rows: r.json?.data?.length });
  r = await request('/api/absensi?id_jadwal=1&tanggal=2026-10-30', guru);
  record('ABSENSI_new_session_roster_pending', r.status === 200 && r.json.data.length === 2 && r.json.data.every(x => x.status === 'B'), { http: r.status, rows: r.json?.data?.length });
  r = await request('/api/absensi?id_jadwal=2&tanggal=2026-10-30', guru);
  record('RBAC_other_schedule_denied', r.status === 403, { http: r.status });
  const meeting = { id_jadwal: '1', tanggal: '2026-10-30', pertemuan_ke: 1, materi: 'Audit sintetis', items: [{ nis: '9000001', status: 'H' }, { nis: '9000002', status: 'S' }] };
  const dailyBefore = count('ak_absensi_harian');
  r = await request('/api/absensi', guru, meeting);
  record('ABSENSI_and_journal_persist', r.status === 200 && count('ak_pertemuan') === 1 && count('ak_absensi_sesi') === 2 && count('ak_absensi_harian') === dailyBefore, { http: r.status, meetings: count('ak_pertemuan'), sessions: count('ak_absensi_sesi'), daily_rows: count('ak_absensi_harian') });
  r = await request('/api/absensi?id_jadwal=1&tanggal=2026-10-30', guru);
  record('ABSENSI_reload_saved_statuses', r.status === 200 && r.json.data.map(x => x.status).join(',') === 'H,S', { http: r.status, statuses: r.json?.data?.map(x => x.status) });
  r = await request('/api/absensi', guru, { ...meeting, revision: 0, alasan: 'Uji versi lama' });
  record('ABSENSI_stale_revision_denied', r.status === 409, { http: r.status });
  const historyBefore = count('ak_riwayat');
  db.exec("CREATE TRIGGER review_rollback BEFORE INSERT ON ak_absensi_sesi WHEN NEW.nis='9000002' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
  try {
    r = await request('/api/absensi', guru, { ...meeting, id_jadwal: '3' });
    record('ABSENSI_atomic_rollback', r.status === 500 && count('ak_pertemuan') === 1 && count('ak_absensi_sesi') === 2 && count('ak_riwayat') === historyBefore, { http: r.status, meetings: count('ak_pertemuan'), sessions: count('ak_absensi_sesi'), history_unchanged: count('ak_riwayat') === historyBefore });
  } finally { db.exec('DROP TRIGGER review_rollback'); }
  db.prepare("INSERT INTO ak_aturan_nilai(id,id_tahun_ajaran,id_kelas,id_mapel,id_guru,versi,formula,bobot_json,kkm) VALUES ('901','1','1','1','1','1','weighted_kkm_v1',?, '75')").run(JSON.stringify({ tugas: 30, uts: 30, uas: 40, praktik: 0, proyek: 0 }));
  db.prepare("INSERT INTO ak_nilai(id,nis,id_anggota,id_tahun_ajaran,id_kelas,id_mapel,id_guru,komponen_json,nilai_akhir) VALUES ('902','9000001','1','2','1','1','1','{}','60'),('903','9000003','3','1','2','2','2','{}','70')").run();
  const grades = { id_jadwal: '1', id_aturan: '901', items: [{ nis: '9000001', nilai_tugas: 80, nilai_uts: 80, nilai_uas: 80, revision: 0 }] };
  r = await request('/api/nilai', guru, grades);
  const own = db.prepare("SELECT * FROM ak_nilai WHERE nis='9000001' AND id_tahun_ajaran='1'").get();
  record('NILAI_create_persists', r.status === 200 && Number(own?.nilai_akhir) === 80, { http: r.status, saved_grade: own?.nilai_akhir });
  record('NILAI_other_period_preserved', db.prepare("SELECT nilai_akhir FROM ak_nilai WHERE id='902'").get().nilai_akhir === '60', { other_period_grade: db.prepare("SELECT nilai_akhir FROM ak_nilai WHERE id='902'").get().nilai_akhir });
  r = await request('/api/nilai', guru, { ...grades, id_jadwal: '2', items: [{ nis: '9000003', nilai_tugas: 91, nilai_uts: 91, nilai_uas: 91 }] });
  record('RBAC_other_teacher_grade_write_denied', r.status === 403 && db.prepare("SELECT nilai_akhir FROM ak_nilai WHERE id='903'").get().nilai_akhir === '70', { http: r.status });
  r = await request('/api/nilai', guru, { ...grades, alasan: 'Uji input invalid', items: [{ ...grades.items[0], revision: own?.revision, nilai_tugas: 'abc' }] });
  record('NILAI_non_numeric_denied', r.status === 422, { http: r.status });
  r = await request('/api/export?kind=nilai', student);
  record('RBAC_student_export_scoped', r.status === 403 || (r.status === 200 && !r.text.includes('9000003')), { http: r.status, other_student_exposed: r.text.includes('9000003') });
  r = await request('/api/rapor?id=1', student);
  record('RAPOR_draft_denied', [403, 404].includes(r.status), { http: r.status });
  const cfg = JSON.parse(fs.readFileSync(process.env.SIA_BROWSER_CONFIG || path.join(require('os').homedir(), '.local/state/sia-academic-dev/20261031/private/runtime.json')));
  process.env.PLAYWRIGHT_BROWSERS_PATH = cfg.PDF_BROWSERS_PATH;
  process.env.LD_LIBRARY_PATH = cfg.PDF_LIBRARY_PATH;
  const browser = await require(cfg.PDF_PLAYWRIGHT_PATH).chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    async function identity(session) {
      await ctx.clearCookies();
      await ctx.addCookies([{ name: 'sia_session_token', value: session.cookie.slice(session.cookie.indexOf('=') + 1), url: BASE }]);
      const setup = await ctx.newPage();
      await setup.goto(BASE + '/auth/login');
      await setup.evaluate(user => localStorage.setItem('sia_user', JSON.stringify(user)), session.user);
      await setup.close();
    }
    await identity(admin);
    const p = await ctx.newPage();
    await p.goto(BASE + '/guru/absen?id_jadwal=1&tanggal=2026-10-30'); await p.waitForLoadState('networkidle');
    await p.getByLabel('9000001 H', { exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
    const absenBody = await p.locator('main').innerText();
    record('ABSENSI_GUI_uses_session_contract', absenBody.includes('Siswa Review 1') && absenBody.includes('Siswa Review 2'), { fixture_students_visible: absenBody.includes('Siswa Review 1') });
    await p.goto(BASE + '/guru/nilai?id_jadwal=1'); await p.waitForLoadState('networkidle');
    await p.getByLabel('9000001 tugas', { exact: true }).waitFor({ timeout: 15000 }).catch(() => {});
    const inputs = await p.locator('main input[type=number]').evaluateAll(xs => xs.map(x => x.value));
    record('NILAI_GUI_displays_saved_components', inputs.includes('80'), { input_values: inputs });
    await p.goto(BASE + '/admin/penugasan'); await p.waitForLoadState('networkidle');
    await p.locator('form input[type=text]').fill('Audit sintetis');
    await p.getByRole('button', { name: 'Simpan Penugasan Guru Piket' }).click();
    await p.getByText('Penugasan Guru Piket berhasil diperbarui & disimpan.').waitFor();
    await p.reload(); await p.waitForLoadState('networkidle');
    const value = await p.locator('form input[type=text]').inputValue();
    record('ADMIN_piket_save_persists', value === 'Audit sintetis', { value_after_reload: value, duty_rows: count('ak_tugas_piket') });
    await p.goto(BASE + '/admin/nilai'); await p.waitForLoadState('networkidle');
    p.once('dialog', d => d.accept());
    await p.getByRole('button', { name: 'Sahkan Penerbitan Rapor' }).click();
    const status = db.prepare("SELECT status FROM ak_rapor_status WHERE id_snapshot='1'").get().status;
    record('ADMIN_publication_persists', status !== 'draft', { snapshot_status: status });
    await identity(student); await p.goto(BASE + '/siswa/rapor'); await p.waitForLoadState('networkidle');
    const report = await p.locator('main').innerText();
    record('SISWA_report_identity', report.includes('9000001') && !report.includes('10293'), { fixture_identity_visible: report.includes('9000001'), hardcoded_identity_visible: report.includes('10293') });
    record('SISWA_report_draft_not_published', !report.includes('Rapor Terbit & Terverifikasi'), { published_label_visible: report.includes('Rapor Terbit & Terverifikasi') });
    await identity(head); await p.goto(BASE + '/kepsek'); await p.waitForLoadState('networkidle');
    record('KEPSEK_navigation_role', (await p.locator('.sia-modules').innerText()).includes('Monitoring'), { menu: (await p.locator('.sia-modules').innerText()).replace(/\n/g, ' | ') });
    await p.getByRole('link', { name: 'Keluar', exact: true }).click();
    const after = await p.request.get(BASE + '/api/jadwal');
    record('AUTH_logout_ends_session', after.status() === 401, { http_after_logout: after.status() });
    await ctx.close();
  } finally { await browser.close(); }
})().catch(e => {
  results.push({ id: 'current_review_runner', status: 'ERROR', message: e.message }); console.error(e.stack);
}).finally(() => {
  db.close();
  const before = JSON.parse(fs.readFileSync(path.join(STATE, 'reports/original-db-before.json')));
  const unchanged = Object.entries(before).every(([name, hash]) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'data', name))).digest('hex') === hash);
  record('INTEGRITY_original_database_unchanged', unchanged, { unchanged });
  const report = {
    commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    snapshot: 'working-tree copy created after concurrent application edits were observed',
    method: 'Actual HTTP/Chromium on isolated schema-only synthetic database',
    passed: results.filter(x => x.status === 'PASS').length,
    failed: results.filter(x => x.status === 'FAIL').length,
    errors: results.filter(x => x.status === 'ERROR').length, tests: results,
  };
  fs.writeFileSync(path.join(STATE, 'reports/tsx-current-findings.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(`${report.passed} PASS, ${report.failed} FAIL, ${report.errors} ERROR`);
  process.exitCode = report.errors ? 2 : report.failed ? 1 : 0;
});
