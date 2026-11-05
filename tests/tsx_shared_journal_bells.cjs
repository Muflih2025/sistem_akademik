'use strict';
// A fresh external --paperless fixture from tsx_teacher_setup.py is required.
const { fs, path, state, base, db, assert, request, login, browser, context, unchanged } = require('./tsx_admin_helpers.cjs');
const { bellTemplates, lessonPeriod } = require('../src/lib/bell-times.ts');
const results = [];
let appBrowser;
function pass(id, details = {}) { results.push({ id, status: 'PASS', details }); console.log('PASS ' + id); }
function put(table, row) { db.prepare(`INSERT INTO ${table}(${Object.keys(row).join(',')}) VALUES(${Object.keys(row).map(() => '?').join(',')})`).run(...Object.values(row).map(String)); }
function digest(table) { return require('crypto').createHash('sha256').update(JSON.stringify(db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())).digest('hex'); }
async function json(url, session, body, expected = 200) {
  const result = await request(url, session, body);
  assert.equal(result.status, expected, JSON.stringify({ url, ...result.json })); return result.json;
}
async function post(page, label, endpoint, expected = 200) {
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === endpoint && r.request().method() === 'POST');
  await page.getByRole('button', { name: label, exact: true }).click();
  const response = await pending, data = await response.json();
  assert.equal(response.status(), expected, JSON.stringify(data)); return data;
}
async function choose(page, cls, session, date = '2026-10-30') {
  await page.getByLabel('Kelas jurnal', { exact: true }).selectOption(cls);
  await page.getByLabel('Tanggal KBM', { exact: true }).fill(date);
  await page.getByLabel('Pilih / edit jurnal kelas', { exact: true }).selectOption(session);
  await page.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).waitFor();
}
async function confirm(page, cls = 'XII PPLG 2', date = '30-10-2026') {
  await page.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Periksa jurnal yang akan diedit', exact: true });
  await dialog.waitFor();
  const text = await dialog.innerText();
  assert(text.includes(cls) && text.includes('Jumat') && text.includes(date), text);
  await dialog.getByRole('button', { name: 'Ya, edit jurnal ini', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  assert(await page.getByLabel('Materi pembelajaran', { exact: true }).isEnabled());
}

(async () => {
  assert.equal(db.prepare('SELECT COUNT(*) n FROM ak_pertemuan').get().n, 0, 'Use a fresh fixture');
  assert.equal(db.prepare("SELECT COUNT(*) n FROM ak_anggota_kelas WHERE id_kelas='1'").get().n, 20, 'Use --paperless');
  const password = db.prepare("SELECT password FROM users WHERE username='uji_guru'").get().password;
  put('guru', { id_guru: 4, nip: 'REVIEW-4', nama_guru: 'Guru Keempat dengan Nama Panjang untuk Uji Tampilan Responsif', status: 'aktif' });
  put('users', { id_user: 7, username: 'uji_guru_empat', password, role: 'guru', id_referensi: 4, status: 'aktif' });
  for (const [id, name] of [[3, 'Pengembangan Perangkat Lunak dan Gim Praktik Integrasi Sistem'], [4, 'Praktik Proyek Kolaborasi']]) put('mata_pelajaran', { id_mapel: id, kode_mapel: 'SHARED-' + id, nama_mapel: name, kkm: 75, status: 'aktif' });
  db.prepare("UPDATE jadwal SET status='nonaktif' WHERE id_jadwal='3'").run();
  for (const [id, teacher, subject, from, until] of [[100, 2, 2, '08:45', '09:45'], [101, 3, 3, '10:20', '11:40'], [102, 4, 4, '13:00', '14:00']]) {
    put('jadwal', { id_jadwal: id, id_guru: teacher, id_mapel: subject, id_kelas: 1, id_tahun_ajaran: 1, hari: 'Jumat', jam_mulai: from, jam_selesai: until, ruang: 'A1', status: 'aktif' });
    put('ak_penugasan', { id_jadwal: id, mulai: '2026-07-01', selesai: '2026-12-31', terverifikasi: 1 });
  }
  const admin = await login('uji_admin'), first = await login('uji_guru'), second = await login('uji_guru_lain'), duty = await login('uji_piket'), fourth = await login('uji_guru_empat'), head = await login('uji_kepsek'), student = await login('uji_siswa');
  const roster = await json('/api/absensi?id_jadwal=1&tanggal=2026-10-30', first);
  await json('/api/absensi', first, { id_jadwal: '1', tanggal: '2026-10-30', pertemuan_ke: 1, materi: 'Jurnal asli guru pertama', items: roster.data.map((m, i) => ({ nis: m.nis, status: i === 1 ? 'S' : 'H', keterangan: i === 1 ? 'Sakit' : '' })) });
  for (const [id, session, cls] of [['100', second, '1'], ['101', duty, '1'], ['102', fourth, '1'], ['2', second, '2']]) {
    await json('/api/jurnal', session, { id_jadwal: id, id_kelas: cls, id_tahun_ajaran: '1', scope: 'kelas', konfirmasi: true, tanggal: '2026-10-30', pertemuan_ke: 1, materi: 'Jurnal asli sesi ' + id });
  }
  await json('/api/jurnal', second, { id_jadwal: '100', id_kelas: '1', id_tahun_ajaran: '1', scope: 'kelas', konfirmasi: true, tanggal: '2026-10-23', pertemuan_ke: 1, materi: 'Riwayat minggu sebelumnya' });
  const attendanceBefore = digest('ak_absensi_sesi'), dailyBefore = digest('ak_absensi_harian');

  appBrowser = await browser();
  const ac = await context(appBrowser, admin), a = await ac.newPage();
  try {
    await a.goto(base + '/admin');
    await a.getByRole('navigation', { name: 'Modul utama', exact: true }).getByRole('link', { name: 'Akademik', exact: true }).click();
    await a.getByRole('navigation', { name: 'Fitur modul', exact: true }).getByRole('link', { name: 'Ubah Jam Pembelajaran', exact: true }).click();
    await a.getByRole('heading', { name: 'Jam Pembelajaran', exact: true }).waitFor();
    for (const template of bellTemplates) {
      await a.getByRole('button', { name: 'Gunakan contoh ' + template.nama, exact: true }).click();
      await a.getByLabel('Status profil', { exact: true }).selectOption('referensi');
      await a.getByLabel('Alasan versi baru', { exact: true }).fill('Pemeriksaan acuan lampiran sekolah');
      await a.getByLabel('Konfirmasi pemeriksaan jam', { exact: true }).check();
      await post(a, 'Simpan versi jam', '/api/jam-belajar');
      await a.reload();
      const saved = (await json('/api/jam-belajar', admin)).data.find(r => r.nama === template.nama);
      assert.deepEqual(saved.payload.slots, template.slots);
      assert.deepEqual(saved.payload.hari, template.hari);
      if (template !== bellTemplates.at(-1)) await a.getByText('Acuan jam pembelajaran dari lampiran', { exact: true }).click();
    }
    pass('BELLS_sidebar_and_all_three_image_templates_save_and_reload');
    const monday = a.locator('section').filter({ has: a.getByRole('heading', { name: 'Senin · Versi 1 · referensi', exact: true }) });
    await monday.getByRole('button', { name: 'Buat revisi profil', exact: true }).click();
    const mondayRows = bellTemplates[0].slots.length;
    await a.getByLabel(`Selesai baris ${mondayRows}`, { exact: true }).fill('15:25');
    await a.getByRole('button', { name: 'Tambah baris jam', exact: true }).click();
    assert.equal(await a.getByLabel(`Jam ke baris ${mondayRows + 1}`, { exact: true }).inputValue(), '11');
    assert.equal(await a.getByLabel(`Mulai baris ${mondayRows + 1}`, { exact: true }).inputValue(), '15:25');
    await a.getByRole('button', { name: 'Tambah istirahat / kegiatan', exact: true }).click();
    assert.equal(await a.getByLabel(`Jam ke baris ${mondayRows + 2}`, { exact: true }).inputValue(), '');
    await a.getByRole('button', { name: 'Hapus baris', exact: true }).last().click();
    await a.getByLabel('Alasan versi baru', { exact: true }).fill('Tambah jam pembelajaran ke-11');
    await a.getByLabel('Konfirmasi pemeriksaan jam', { exact: true }).check();
    await post(a, 'Simpan versi jam', '/api/jam-belajar');
    await a.reload();
    await a.getByRole('heading', { name: 'Senin · Versi 2 · referensi', exact: true }).waitFor();
    let saved = (await json('/api/jam-belajar', admin)).data.find(r => r.nama === 'Senin');
    assert.equal(saved.payload.slots.at(-1)[0], 11);
    assert.equal(saved.payload.slots[mondayRows - 1][2], '15:25');
    assert.equal(db.prepare("SELECT COUNT(*) n FROM ak_jam_belajar WHERE nama='Senin'").get().n, 2);
    const before = digest('ak_jam_belajar');
    await json('/api/jam-belajar', admin, { ...saved.payload, id: saved.id, versi: 1, alasan: 'Versi lama', terverifikasi: true }, 409);
    await json('/api/jam-belajar', admin, { ...saved.payload, id: saved.id, hari: [], alasan: 'Tanpa hari', terverifikasi: true }, 422);
    await json('/api/jam-belajar', admin, { nama: 'Bentrok Senin', hari: ['Senin'], status: 'referensi', slots: [[1, '07:00', '07:40', 'Pelajaran']], alasan: 'Bentrok', terverifikasi: true }, 422);
    assert.equal(digest('ak_jam_belajar'), before);
    pass('BELLS_edit_add_remove_rows_versions_and_invalid_changes_preserve_data');
  } finally { await ac.close(); }
  const four = await json('/api/jadwal?scope=jurnal&id_kelas=1&tanggal=2026-10-30', first);
  assert.deepEqual(four.data.map(j => j.jam_ke), ['1–2', '3–4', '5–6', '7–8']);
  assert.equal(new Set(four.data.map(j => j.id_guru)).size, 4);
  assert.equal(lessonPeriod('Senin', '07:40', '09:00'), '1–2');
  pass('SCHEDULE_four_teachers_and_lesson_numbers_1_to_8');

  const gc = await context(appBrowser, first), g = await gc.newPage(), errors = [];
  g.on('pageerror', e => errors.push(e.message));
  try {
    await g.goto(base + '/guru/jurnal');
    await g.getByLabel('Kelas jurnal', { exact: true }).waitFor();
    assert.equal(await g.getByLabel('Kelas jurnal', { exact: true }).inputValue(), '');
    assert(await g.getByRole('button', { name: 'Simpan Jurnal', exact: true }).isDisabled());
    await choose(g, '1/1', '100');
    assert.equal(await g.getByLabel('Pilih / edit jurnal kelas', { exact: true }).locator('option').count(), 5);
    assert(await g.getByLabel('Materi pembelajaran', { exact: true }).isDisabled());
    await g.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).click();
    await g.getByRole('button', { name: 'Batal, pilih ulang', exact: true }).click();
    assert(await g.getByLabel('Materi pembelajaran', { exact: true }).isDisabled());
    await confirm(g);
    await g.getByLabel('Materi pembelajaran', { exact: true }).fill('Guru pertama mengoreksi jurnal guru kedua');
    await g.getByLabel('Alasan koreksi', { exact: true }).fill('Koreksi kolaboratif setelah kelas diperiksa');
    const update = await post(g, 'Simpan Jurnal', '/api/jurnal');
    assert.equal(update.data.id_guru, '2');
    assert.equal(update.data.updated_by, first.user.id_user);
    assert(await g.getByRole('button', { name: 'Simpan Jurnal', exact: true }).isDisabled());
    await g.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).waitFor();
    await confirm(g);
    await g.getByLabel('Kelas jurnal', { exact: true }).selectOption('1/2');
    assert.equal(await g.getByLabel('Pilih / edit jurnal kelas', { exact: true }).inputValue(), '');
    assert(await g.getByRole('button', { name: 'Simpan Jurnal', exact: true }).isDisabled());
    await choose(g, '1/2', '2');
    await g.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).click();
    assert((await g.getByRole('dialog').innerText()).includes('XII PPLG 1'));
    await g.keyboard.press('Escape');
    assert(await g.getByLabel('Materi pembelajaran', { exact: true }).isDisabled());
    await g.reload();
    await choose(g, '1/1', '100');
    assert.equal(await g.getByLabel('Materi pembelajaran', { exact: true }).inputValue(), 'Guru pertama mengoreksi jurnal guru kedua');
    pass('JOURNAL_select_class_cancel_confirm_edit_other_teacher_reload_and_reset');

    await g.goto(base + '/guru/jurnal?id_jadwal=100&id_kelas=1&id_tahun_ajaran=1&tanggal=2026-10-30');
    await g.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).waitFor();
    const old = g.locator('section').filter({ has: g.getByRole('heading', { name: 'Riwayat Jurnal KBM', exact: true }) }).locator('a').filter({ hasText: 'Buka / koreksi jurnal' });
    await old.nth(1).click();
    await g.waitForURL('**tanggal=2026-10-23');
    await g.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).waitFor();
    assert.equal(await g.getByLabel('Tanggal KBM', { exact: true }).inputValue(), '2026-10-23');
    assert.equal(await g.getByLabel('Materi pembelajaran', { exact: true }).inputValue(), 'Riwayat minggu sebelumnya');
    assert(await g.getByLabel('Materi pembelajaran', { exact: true }).isDisabled());
    await g.goto(base + '/guru/jadwal?tanggal=2026-10-30');
    await g.getByLabel('Pilih kelas jadwal', { exact: true }).selectOption('1/1');
    await g.getByLabel('Pilih jurnal dari jadwal', { exact: true }).selectOption('102');
    assert((await g.getByLabel('Pilih jurnal dari jadwal', { exact: true }).locator('option:checked').innerText()).includes('7–8'));
    await g.getByRole('link', { name: 'Buka jurnal kelas', exact: true }).click();
    await g.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).waitFor();
    assert.equal(await g.getByLabel('Pilih / edit jurnal kelas', { exact: true }).inputValue(), '102');
    await confirm(g);
    assert.equal(await g.getByLabel('Jam pelajaran (opsional)', { exact: true }).inputValue(), '7–8');
    assert.deepEqual(errors, []);
    pass('JOURNAL_history_client_navigation_and_schedule_dropdown_open_correct_session');
  } finally { await gc.close(); }

  for (const [session, teacherName] of [[second, 'guru pembanding'], [duty, 'guru piket'], [fourth, 'guru keempat']]) {
    const c = await context(appBrowser, session), p = await c.newPage();
    try {
      await p.goto(base + '/guru/jurnal?id_jadwal=1&id_kelas=1&id_tahun_ajaran=1&tanggal=2026-10-30');
      await p.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).waitFor();
      await confirm(p);
      await p.getByLabel('Refleksi KBM', { exact: true }).fill('Koreksi jurnal oleh ' + teacherName);
      await p.getByLabel('Alasan koreksi', { exact: true }).fill('Konteks kelas dan sesi sudah diperiksa');
      const updated = await post(p, 'Simpan Jurnal', '/api/jurnal');
      assert.equal(updated.data.id_guru, '1');
      assert.equal(updated.data.updated_by, session.user.id_user);
    } finally { await c.close(); }
  }
  assert.equal(digest('ak_absensi_sesi'), attendanceBefore);
  assert.equal(digest('ak_absensi_harian'), dailyBefore);
  pass('JOURNAL_all_four_teachers_can_edit_without_changing_attendance_or_original_teacher');

  const loaded = await json('/api/jurnal?scope=kelas&id_kelas=1&id_tahun_ajaran=1&id_jadwal=1&view=editor&tanggal=2026-10-30', second);
  assert(!('data' in loaded));
  const valid = { ...loaded.meeting, id_jadwal: '1', id_kelas: '1', id_tahun_ajaran: '1', scope: 'kelas', konfirmasi: true, alasan: 'Pemeriksaan konteks server' };
  const before = digest('ak_pertemuan');
  for (const invalid of [{ konfirmasi: false }, { id_kelas: '2' }, { id_tahun_ajaran: '90' }]) await json('/api/jurnal', second, { ...valid, ...invalid }, 422);
  await json('/api/jurnal', second, { ...valid, items: [] }, 403);
  await json('/api/jurnal', second, { ...valid, revision: 0 }, 409);
  await json('/api/jurnal', head, valid, 403);
  await json('/api/jurnal', student, valid, 403);
  await json('/api/absensi?id_jadwal=1&tanggal=2026-10-30', second, undefined, 403);
  await json('/api/absensi', second, { ...valid, items: [] }, 403);
  await json('/api/nilai?id_jadwal=1', second, undefined, 403);
  assert.equal(digest('ak_pertemuan'), before);
  for (const session of [first, duty, head, student]) await json('/api/jam-belajar', session, { nama: 'Tidak diizinkan', slots: [] }, 403);
  const csv = await request('/api/export?' + new URLSearchParams({ kind: 'jurnal', format: 'csv', scope: 'kelas', id_kelas: '1', id_tahun_ajaran: '1', id_jadwal: '1', tanggal: '2026-10-30' }), second);
  assert.equal(csv.status, 200);
  assert(csv.bytes.toString().includes('Jurnal asli guru pertama'));
  const year = (await json('/api/admin?table=tahun_ajaran', admin)).data.find(p => p.id_tahun_ajaran === '1');
  const locked = await json('/api/admin', admin, { ...year, id: '1', table: 'tahun_ajaran', action: 'update', dikunci: '1', alasan: 'Uji jurnal terkunci' });
  await json('/api/jurnal', second, valid, 409);
  await json('/api/admin', admin, { ...locked.data, id: '1', table: 'tahun_ajaran', action: 'update', dikunci: '0', alasan: 'Selesai uji jurnal terkunci' });
  assert.equal(digest('ak_pertemuan'), before);
  pass('SERVER_confirmation_class_period_stale_lock_and_separate_permissions_enforced');
  unchanged();
  pass('INTEGRITY_original_school_database_unchanged');
})().catch(error => {
  results.push({ id: 'shared-journal-bells', status: 'FAIL', message: error.stack }); console.error(error.stack);
}).finally(async () => {
  if (appBrowser) await appBrowser.close();
  db.close();
  const report = { passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, tests: results };
  fs.writeFileSync(path.join(state, 'reports/shared-journal-bells.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed} PASS, ${report.failed} FAIL`); process.exitCode = report.failed ? 1 : 0;
});
