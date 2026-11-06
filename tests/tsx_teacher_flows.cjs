'use strict';
// Real HTTP + Chromium. This runner refuses the repository DB and non-synthetic data.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const STATE = path.resolve(process.env.SIA_TEACHER_STATE || path.join(require('os').homedir(), '.local/state/sia-teacher-fixes-20261104/review'));
const BASE = process.env.SIA_TEACHER_URL || 'http://127.0.0.1:18128';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(BASE)) throw Error('Explicit loopback URL required');
const fixture = fs.realpathSync(path.join(STATE, 'app/data/sia.db'));
if (fixture.startsWith(ROOT + path.sep)) throw Error('Refuse repository database');
const db = new (require('better-sqlite3'))(fixture, { fileMustExist: true });
if (db.prepare('SELECT COUNT(*) n FROM siswa').get().n !== 3 || !db.prepare("SELECT 1 FROM guru WHERE nama_guru='Guru Piket Review'").get()) throw Error('Synthetic fixture required');
if (db.prepare('SELECT COUNT(*) n FROM ak_pertemuan').get().n) throw Error('Use a new create-only sandbox for each full regression run');
const privateData = JSON.parse(fs.readFileSync(path.join(STATE, 'private.json')));
const results = [];
function record(id, ok, observed = {}) { results.push({ id, status: ok ? 'PASS' : 'FAIL', observed }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id}`); }
const digest = table => crypto.createHash('sha256').update(JSON.stringify(db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())).digest('hex');
const baseline = { daily: digest('ak_absensi_harian'), snapshots: digest('ak_rapor_snapshot'), status: digest('ak_rapor_status'), assignments: digest('ak_penugasan') };
async function request(url, session, body, origin) {
 const r = await fetch(BASE + url, { redirect: 'manual', signal: AbortSignal.timeout(90000), method: body ? 'POST' : 'GET', headers: { ...(session ? { Cookie: session.cookie } : {}), ...(body ? { 'Content-Type': 'application/json', Origin: origin || BASE } : {}) }, body: body ? JSON.stringify(body) : undefined });
 const text = await r.text(); let json; try { json = JSON.parse(text); } catch {}
 return { status: r.status, json, headers: r.headers };
}
async function login(username) {
 const r = await request('/api/auth', null, { username, password: privateData.password });
 if (r.status !== 200 || !r.json?.success) throw Error('Fixture login failed');
 return { cookie: r.headers.get('set-cookie').split(';')[0], user: r.json.user };
}
const dates = ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30'];
(async () => {
 // Compile each relevant Next dev route before starting concurrent browser/API work.
 // No request retries: application failures still fail their individual checks.
 for (const route of ['/auth/login','/guru','/guru/jadwal','/guru/jurnal','/guru/absen','/guru/nilai','/guru/rapor','/piket','/api/jadwal','/api/jurnal','/api/absensi','/api/nilai','/api/piket']) {
   const warm = await request(route);
   const loginRedirect = warm.status === 307 && warm.headers.get('location')?.endsWith('/auth/login');
   if (![200,401].includes(warm.status) && !loginRedirect) throw Error(`Route preparation failed: ${route} HTTP ${warm.status}`);
 }
 const guru = await login('uji_guru'), other = await login('uji_guru_lain'), piket = await login('uji_piket'), head = await login('uji_kepsek');
 record('AUTH_teacher_other_duty_head_login', !guru.user.is_piket && piket.user.is_piket, { accounts: 4 });
 let r = await request('/api/absensi?id_jadwal=1&tanggal=2026-10-30', guru);
 record('ABSENSI_new_session_uses_roster_not_daily_status', r.status === 200 && r.json.data.length === 2 && r.json.data.every(s => s.status === 'B'));
 r = await request('/api/absensi?id_jadwal=2&tanggal=2026-10-30', guru);
 record('RBAC_foreign_teacher_session_denied', r.status === 403);
 r = await request('/api/jurnal', guru, { id_jadwal: '1', tanggal: '2026-10-29', pertemuan_ke: 1, materi: 'Wrong weekday' });
 record('JURNAL_wrong_weekday_denied', r.status === 422);
 r = await request('/api/jurnal', guru, { id_jadwal: '1', tanggal: '2026-99-99', pertemuan_ke: 1, materi: 'Bad date' });
 record('JURNAL_invalid_date_denied', r.status === 422);
 r = await request('/api/jurnal', guru, { id_jadwal: '1', tanggal: dates[4], pertemuan_ke: 1, materi: 'Cross site' }, 'http://example.invalid');
 record('CSRF_cross_origin_write_denied', r.status === 403);
 const cfg = JSON.parse(fs.readFileSync(process.env.SIA_BROWSER_CONFIG || path.join(require('os').homedir(), '.local/state/sia-academic-dev/20261031/private/runtime.json')));
 process.env.PLAYWRIGHT_BROWSERS_PATH = cfg.PDF_BROWSERS_PATH; process.env.LD_LIBRARY_PATH = cfg.PDF_LIBRARY_PATH;
 const browser = await require(cfg.PDF_PLAYWRIGHT_PATH).chromium.launch();
 try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } }); const p = await context.newPage();
  await p.goto(BASE + '/auth/login'); await p.locator('[name=username]').fill('uji_guru'); await p.locator('[name=password]').fill(privateData.password);
  await Promise.all([p.waitForURL('**/guru'), p.getByRole('button', { name: 'Masuk', exact: true }).click()]);
  for (let i=0; i<dates.length; i++) {
   await p.goto(BASE + '/guru/jadwal?tanggal=' + dates[i]); await p.waitForLoadState('networkidle');
   const link = p.getByRole('link', { name: 'Riwayat / Isi Jurnal', exact: true }).first();
   const href = await link.getAttribute('href'); await link.click(); await p.waitForLoadState('networkidle');
   await p.getByLabel('Materi pembelajaran', { exact: true }).fill('Materi sintetis ' + dates[i]);
   await p.getByLabel('Refleksi KBM', { exact: true }).fill('Refleksi pengujian');
   await p.getByRole('button', { name: 'Simpan Jurnal', exact: true }).click();
   await p.locator('[data-status=success]').waitFor(); await p.reload(); await p.waitForLoadState('networkidle');
   const stored = db.prepare('SELECT * FROM ak_pertemuan WHERE tanggal=?').get(dates[i]);
   await p.waitForFunction(value => {
     const input = document.querySelector('[aria-label="Materi pembelajaran"]');
     return input && !input.disabled && input.value === value;
   }, 'Materi sintetis ' + dates[i]);
   const displayed = await p.getByLabel('Materi pembelajaran', { exact: true }).inputValue();
   record('BROWSER_schedule_journal_save_reload_' + dates[i], href.includes('tanggal=' + dates[i]) && href.includes('id_jadwal=') && stored?.materi === 'Materi sintetis ' + dates[i] && displayed === stored.materi, { date: dates[i], stored: stored?.materi, displayed });
  }
  // Backend validation must show an error cross, never a success tick.
  await p.getByLabel('Tanggal KBM', { exact: true }).fill('2026-10-29'); await p.locator('[data-status=error]').waitFor();
  record('BROWSER_wrong_day_error_uses_cross_icon', await p.locator('[data-status=error] svg.lucide-circle-x, [data-status=error] svg.lucide-x-circle').count() === 1 && await p.locator('[data-status=error] svg.lucide-circle-check').count() === 0);
  await p.getByLabel('Tanggal KBM', { exact: true }).fill(dates[4]); await p.waitForLoadState('networkidle');
  const beforeRejectedSave = digest('ak_pertemuan');
  await p.getByLabel('Materi pembelajaran', { exact: true }).fill('x'.repeat(5001));
  await p.getByLabel('Alasan koreksi', { exact: true }).fill('Uji validasi server');
  await p.getByRole('button', { name: 'Simpan Jurnal', exact: true }).click();
  await p.locator('[data-status=error]').waitFor();
  record('BROWSER_failed_save_shows_cross_and_preserves_database', await p.locator('[data-status=error] svg.lucide-circle-x, [data-status=error] svg.lucide-x-circle').count() === 1 && digest('ak_pertemuan') === beforeRejectedSave && await p.locator('[data-status=success]').count() === 0);
  const meeting = db.prepare("SELECT * FROM ak_pertemuan WHERE id_jadwal='1' AND tanggal='2026-10-30'").get();
  const body = { id_jadwal: '1', tanggal: dates[4], pertemuan_ke: 1, materi: 'Materi dengan absensi', revision: meeting.revision, alasan: 'Melengkapi absensi sintetis', items: [{ nis: '9000001', status: 'H' }, { nis: '9000002', status: 'S' }] };
  r = await request('/api/absensi', guru, body);
  const loaded = await request('/api/absensi?id_jadwal=1&tanggal=' + dates[4], guru);
  const separate = await request('/api/absensi?id_jadwal=3&tanggal=' + dates[4], guru);
  record('ABSENSI_atomic_save_and_reload', r.status === 200 && loaded.json.data.map(s => s.status).join(',') === 'H,S' && Number(loaded.json.meeting.revision) === 2);
  record('ABSENSI_other_subject_same_class_stays_pending', separate.status === 200 && separate.json.data.every(s => s.status === 'B'));
  const different = await request('/api/absensi?id_jadwal=2&tanggal=' + dates[4], other);
  record('ABSENSI_other_class_roster_isolated', different.status === 200 && different.json.data.length === 1 && different.json.data[0].nis === '9000003' && different.json.data[0].status === 'B');
  const beforeBad = digest('ak_pertemuan');
  r = await request('/api/absensi', guru, { ...body, revision: 2, items: [{ nis: '9000001', status: 'H' }, { nis: '9000003', status: 'H' }] });
  record('ABSENSI_foreign_roster_rejected_without_write', r.status === 422 && digest('ak_pertemuan') === beforeBad);
  r = await request('/api/absensi', guru, body);
  record('CONCURRENCY_stale_meeting_revision_denied', r.status === 409 && digest('ak_pertemuan') === beforeBad);
  const countBefore = db.prepare('SELECT COUNT(*) n FROM ak_pertemuan').get().n, auditBefore = digest('ak_riwayat');
  db.exec("CREATE TRIGGER teacher_test_failure BEFORE INSERT ON ak_absensi_sesi WHEN NEW.nis='9000002' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END");
  try { r = await request('/api/absensi', guru, { ...body, id_jadwal: '3', revision: 0 }); }
  finally { db.exec('DROP TRIGGER teacher_test_failure'); }
  record('TRANSACTION_failure_rolls_back_meeting_and_attendance_audit', r.status === 500 && db.prepare('SELECT COUNT(*) n FROM ak_pertemuan').get().n === countBefore && digest('ak_riwayat') === auditBefore);
  await p.goto(BASE + '/guru/nilai?id_jadwal=1'); await p.waitForLoadState('networkidle');
  for (const nis of ['9000001','9000002']) for (const c of ['tugas','uts','uas']) await p.getByLabel(nis + ' ' + c, { exact: true }).fill('80');
  await p.getByRole('button', { name: 'Simpan Nilai', exact: true }).click(); await p.locator('[data-status=success]').waitFor();
  await p.reload(); await p.waitForLoadState('networkidle');
  const saved = db.prepare("SELECT * FROM ak_nilai WHERE nis='9000001' AND id_tahun_ajaran='1' AND id_mapel='1'").get();
  record('BROWSER_grades_create_database_and_reload', Number(saved?.nilai_akhir) === 80 && await p.getByLabel('9000001 tugas', { exact: true }).inputValue() === '80');
  await p.getByLabel('9000001 tugas', { exact: true }).fill('90'); await p.getByLabel('Alasan koreksi', { exact: true }).fill('Koreksi nilai sintetis');
  await p.getByRole('button', { name: 'Simpan Nilai', exact: true }).click(); await p.locator('[data-status=success]').waitFor();
  await p.goto(BASE + '/guru/rapor?id_jadwal=1'); await p.waitForLoadState('networkidle');
  const text = await p.locator('main').innerText();
  record('BROWSER_report_book_syncs_subject_components_and_final', text.includes('Mapel Review A') && text.includes('83.00') && text.includes('90') && text.includes('Nilai Berjalan'));
  record('GRADES_historical_period_unchanged', db.prepare("SELECT nilai_akhir FROM ak_nilai WHERE id='old-period'").get().nilai_akhir === '60');
  r = await request('/api/nilai?id_jadwal=3', guru);
  record('GRADES_other_subject_stays_empty', r.status === 200 && r.json.data.every(s => s.nilai_tugas === '' && !s.nilai_akhir));
  r = await request('/api/nilai', guru, { id_jadwal: '2', id_aturan: 'rule-2-2', items: [{ nis: '9000003', nilai_tugas: 90, nilai_uts: 90, nilai_uas: 90 }] });
  record('RBAC_foreign_grade_write_denied', r.status === 403);
  const currentGrade = db.prepare("SELECT * FROM ak_nilai WHERE id=?").get(saved.id);
  r = await request('/api/nilai', guru, { id_jadwal: '1', id_aturan: 'rule-1-1', alasan: 'Input invalid', items: [{ nis: '9000001', revision: currentGrade.revision, nilai_tugas: 'abc', nilai_uts: 80, nilai_uas: 80 }] });
  record('GRADES_non_numeric_rejected', r.status === 422);
  const currentMeeting = loaded.json.meeting;
  const beforeLocked = digest('ak_pertemuan');
  db.prepare("UPDATE tahun_ajaran SET dikunci='1' WHERE id_tahun_ajaran='1'").run();
  r = await request('/api/jurnal', guru, { ...body, revision: currentMeeting.revision });
  record('PERIOD_locked_write_denied', r.status === 409 && digest('ak_pertemuan') === beforeLocked);
  db.prepare("UPDATE tahun_ajaran SET dikunci='0' WHERE id_tahun_ajaran='1'").run();
  record('AUDIT_actor_and_creator_match_authenticated_teacher', db.prepare("SELECT COUNT(*) n FROM ak_pertemuan WHERE created_by<>'2' OR updated_by<>'2'").get().n === 0 && db.prepare("SELECT COUNT(*) n FROM ak_riwayat WHERE actor_id<>'2'").get().n === 0 && db.prepare("SELECT COUNT(*) n FROM ak_nilai WHERE id_tahun_ajaran='1' AND created_by='2' AND updated_by='2'").get().n === 2);
  await p.goto(BASE + '/guru/absen?id_jadwal=1&tanggal=' + dates[4]); await p.waitForLoadState('networkidle');
  for (const width of [320,375,430,768,1440]) {
   await p.setViewportSize({ width, height: 950 }); await p.waitForTimeout(100);
   const geometry = await p.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
   record('BROWSER_no_horizontal_overflow_' + width, geometry.scrollWidth <= width + 1, geometry);
   await p.screenshot({ path: path.join(STATE, 'screenshots', 'teacher-' + width + '.png'), fullPage: true });
  }
  // A real second roster page: changes made on page one survive pagination and save.
  for (let n=4; n<=14; n++) {
   db.prepare('INSERT INTO siswa(nis,nama_siswa,id_kelas,status) VALUES(?,?,?,?)').run('PAGE-'+n,'Siswa Pagination '+n,'1','aktif');
   db.prepare('INSERT INTO ak_anggota_kelas(id,nis,id_kelas,id_tahun_ajaran,nomor_absen,mulai,selesai) VALUES(?,?,?,?,?,?,?)').run('PAGE-'+n,'PAGE-'+n,'1','1',String(n),'2026-07-01','2026-12-31');
  }
  await p.goto(BASE + '/guru/absen?id_jadwal=3&tanggal=' + dates[4]); await p.waitForLoadState('networkidle');
  await p.getByRole('checkbox').check(); await p.getByRole('button', { name: 'Tandai Semua Hadir', exact: true }).click();
  await p.getByLabel('9000002 I', { exact: true }).click();
  await p.getByRole('button', { name: 'Berikutnya', exact: true }).click();
  await p.getByLabel('PAGE-14 S', { exact: true }).click();
  await p.getByLabel('Materi pembelajaran', { exact: true }).fill('Pengujian absensi lintas halaman');
  await p.getByRole('button', { name: 'Simpan Absensi & Jurnal', exact: true }).click(); await p.locator('[data-status=success]').waitFor();
  await p.reload(); await p.waitForLoadState('networkidle');
  const paged = await request('/api/absensi?id_jadwal=3&tanggal=' + dates[4], guru);
  record('BROWSER_pagination_preserves_and_persists_all_student_statuses', paged.json.data.length === 13 && paged.json.data.find(s => s.nis === '9000002').status === 'I' && paged.json.data.find(s => s.nis === 'PAGE-14').status === 'S' && paged.json.data.filter(s => s.status === 'H').length === 11);
  await p.setViewportSize({ width: 1440, height: 950 });
  r = await request('/api/piket?tanggal=' + dates[4], guru); record('PIKET_unassigned_teacher_denied', r.status === 403);
  r = await request('/api/piket?tanggal=' + dates[4]); record('PIKET_guest_denied', r.status === 401);
  r = await request('/api/piket?tanggal=2027-01-01', piket); record('PIKET_expired_duty_denied', r.status === 403);
  r = await request('/piket', piket); record('PIKET_no_redirect_loop', r.status === 200 && !r.headers.get('location'));
  await p.goto(BASE + '/auth/login'); await p.locator('[name=username]').fill('uji_piket'); await p.locator('[name=password]').fill(privateData.password);
  await Promise.all([p.waitForURL('**/piket'), p.getByRole('button', { name: 'Masuk', exact: true }).click()]);
  await p.getByLabel('Tanggal piket', { exact: true }).fill(dates[4]); await p.waitForLoadState('networkidle');
  const dutyText = await p.locator('main').innerText();
  record('BROWSER_duty_dashboard_loads_school_daily_and_session_journals', dutyText.includes('XII PPLG 2') && dutyText.includes('XII PPLG 1') && dutyText.includes('Jurnal sudah diisi') && dutyText.includes('Jurnal belum diisi') && dutyText.includes('Siswa Review 2'));
  await p.getByRole('button', { name: 'Tampilkan Matriks Mingguan', exact: true }).click();
  await p.getByRole('heading', { name: 'Matriks Absensi Harian Sekolah', exact: true }).waitFor();
  const matrixRow = await p.getByRole('row').filter({ hasText: 'Siswa Review 1' }).innerText();
  record('BROWSER_duty_matrix_uses_daily_data_and_pending_not_session_status', matrixRow.includes('B') && matrixRow.includes('H') && matrixRow.includes('1/0/0/0/4'));
  // Verify revocation uses database metadata, not the is_piket bit in the old cookie.
  db.prepare("UPDATE ak_tugas_piket SET aktif='0' WHERE id='task-review'").run();
  r = await request('/api/piket?tanggal=' + dates[4], piket);
  record('PIKET_duty_revoked_old_session_denied', r.status === 403);
  db.prepare("UPDATE ak_tugas_piket SET aktif='1' WHERE id='task-review'").run();
  r = await request('/api/piket?tanggal=' + dates[4], head); record('KEPSEK_read_only_school_monitor_available', r.status === 200 && r.json.data.length === 2);
  await context.close();
 } finally { await browser.close(); }
 record('INTEGRITY_daily_snapshots_publication_and_assignments_preserved', baseline.daily === digest('ak_absensi_harian') && baseline.snapshots === digest('ak_rapor_snapshot') && baseline.status === digest('ak_rapor_status') && baseline.assignments === digest('ak_penugasan'));
 record('INTEGRITY_sqlite_check', db.pragma('integrity_check')[0].integrity_check === 'ok' && db.pragma('foreign_key_check').length === 0);
})().catch(e => { results.push({ id: 'runner', status: 'ERROR', message: e.message }); console.error(e.stack); }).finally(() => {
 db.close();
 const before = JSON.parse(fs.readFileSync(path.join(STATE, 'reports/original-db-before.json')));
 record('INTEGRITY_repository_database_files_unchanged', Object.entries(before).every(([name, hash]) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'data',name))).digest('hex') === hash));
 const report = { method: 'Actual HTTP and Chromium with isolated synthetic SQLite, no school data copied', date: '2026-11-04', url: BASE, passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, errors: results.filter(r => r.status === 'ERROR').length, tests: results };
 fs.writeFileSync(path.join(STATE, 'reports/teacher-flows.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
 console.log(`${report.passed} PASS, ${report.failed} FAIL, ${report.errors} ERROR`);
 process.exitCode = report.errors || report.failed ? 1 : 0;
});
