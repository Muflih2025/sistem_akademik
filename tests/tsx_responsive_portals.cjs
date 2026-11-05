'use strict';
// Run on an external fixture after the workflow or shared-journal runner.
const { fs, path, state, base, db, assert, login, browser, context, unchanged } = require('./tsx_admin_helpers.cjs');
const results = [];
let appBrowser;
const pass = (id, details = {}) => { results.push({ id, status: 'PASS', details }); console.log('PASS ' + id); };
async function fits(page, label) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, main: document.querySelector('main')?.getBoundingClientRect().width }));
  assert(dimensions.document <= dimensions.width + 1, label + ': page overflow ' + JSON.stringify(dimensions));
  const outside = await page.locator('main input:visible, main select:visible, main textarea:visible, dialog[open]').evaluateAll(nodes => nodes.filter(el => {
    const r = el.getBoundingClientRect();
    if (!r.width || r.left >= -1 && r.right <= innerWidth + 1) return false;
    // Wide tables may scroll inside a container that itself fits the screen.
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (['auto', 'scroll'].includes(getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth) {
        const area = parent.getBoundingClientRect();
        if (area.left >= -1 && area.right <= innerWidth + 1) return false;
      }
    }
    return true;
  }).map(el => el.getAttribute('aria-label') || el.tagName));
  assert.deepEqual(outside, [], label + ': controls outside viewport');
  if (dimensions.width >= 1440) assert(dimensions.main >= dimensions.width * .75, label + ': desktop content too narrow');
}
(async () => {
  appBrowser = await browser();
  const matrix = [
    ['uji_admin', ['/admin', '/admin/master', '/admin/users', '/admin/penugasan', '/admin/jadwal', '/admin/tahun-ajaran', '/admin/jam-belajar', '/admin/kalender', '/admin/kenaikan', '/admin/alumni', '/admin/ekskul', '/admin/bulk-upload', '/admin/export-import', '/admin/nilai', '/admin/audit', '/admin/rekap-nilai', '/admin/jurnal']],
    ['uji_guru', ['/guru', '/guru/jadwal?tanggal=2026-10-30', '/guru/absen?id_jadwal=1&tanggal=2026-10-30', '/guru/jurnal?id_jadwal=1&id_kelas=1&id_tahun_ajaran=1&tanggal=2026-10-30', '/guru/nilai', '/guru/rapor', '/guru/ekskul', '/guru/impor', '/guru/kalender', '/jam-belajar']],
    ['uji_piket', ['/piket?tanggal=2026-10-30']],
    ['uji_kepsek', ['/kepsek', '/kepsek/jadwal', '/kepsek/evaluasi', '/kepsek/rapor', '/kepsek/kalender', '/kepsek/rekap-nilai', '/kepsek/jurnal']],
    ['uji_siswa', ['/siswa', '/siswa/absen', '/siswa/jadwal', '/siswa/rapor', '/siswa/kalender']],
  ];
  let pages = 0;
  for (const [username, routes] of matrix) {
    const session = await login(username), ctx = await context(appBrowser, session), page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      for (const route of routes) {
        const response = await page.goto(base + route);
        assert.equal(response.status(), 200, username + route);
        await page.waitForFunction(() => document.querySelector('nav[aria-label="Modul utama"]')?.getAttribute('aria-busy') === 'false');
        await page.waitForLoadState('networkidle');
        // Exercise scrolling even on pages whose current fixture has little data.
        await page.evaluate(()=>{document.querySelector('main').style.minHeight='1800px';});
        for (const width of [320, 390, 768, 1024, 1440, 1920]) {
          await page.setViewportSize({ width, height: 900 });
          await fits(page, username + route + ' @' + width);
          await page.evaluate(()=>window.scrollTo({top:600,behavior:'instant'}));
          await page.waitForFunction(()=>{const rect=document.querySelector('.sia-topbar').getBoundingClientRect(),height=parseFloat(getComputedStyle(document.querySelector('.sia-app')).getPropertyValue('--sia-topbar-height'));return Math.abs(rect.top)<1&&Math.abs(rect.height-height)<1;});
          const position=await page.evaluate(()=>{
            const header=document.querySelector('.sia-header').getBoundingClientRect(),bar=document.querySelector('.sia-topbar').getBoundingClientRect(),nav=document.querySelector('.sia-modules').getBoundingClientRect(),side=document.querySelector('.sia-sidebar').getBoundingClientRect(),inside=document.querySelector('.sia-sidebar-inner').getBoundingClientRect();
            return {headerBottom:header.bottom,navTop:nav.top,navBottom:nav.bottom,barBottom:bar.bottom,sideTop:side.top,sideHeight:side.height,innerHeight:inside.height};
          });
          assert(Math.abs(position.navTop-position.headerBottom)<=1,route+' module bar must stay below header');
          assert(Math.abs(position.navBottom-position.barBottom)<=1,route+' full navbar must remain fixed');
          if(width>=768){assert(Math.abs(position.sideTop-position.barBottom)<=1,route+' sidebar offset');assert(Math.abs(position.sideHeight-(900-position.barBottom))<=1,route+' sidebar white background fills viewport');}
          await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
        }
        pages++;
      }
      assert.deepEqual(errors, [], username);
    } finally { await ctx.close(); }
  }
  pass('RESPONSIVE_all_role_pages_mobile_tablet_desktop_no_page_or_form_overflow', { pages, widths: [320, 390, 768, 1024, 1440, 1920],sticky_header_and_module_bar:true,sidebar_full_height:true });

  const admin = await login('uji_admin'), ac = await context(appBrowser, admin), a = await ac.newPage();
  try {
    await a.goto(base + '/admin/jam-belajar');
    const examples = a.getByText('Acuan jam pembelajaran dari lampiran', { exact: true });
    if (!(await a.locator('details').first().getAttribute('open') !== null)) await examples.click();
    await a.getByRole('button', { name: 'Gunakan contoh Selasa–Kamis', exact: true }).click();
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await a.setViewportSize({ width, height: 900 }); await fits(a, 'admin bell editor @' + width);
      await a.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await a.screenshot({ path: path.join(state, 'screenshots', `bell-editor-${width}.png`), fullPage: true });
    }
    pass('RESPONSIVE_bell_editor_with_full_template_and_desktop_space');
  } finally { await ac.close(); }
  const teacher = await login('uji_guru'), tc = await context(appBrowser, teacher), t = await tc.newPage();
  try {
    await t.goto(base + '/guru/jurnal?id_jadwal=1&id_kelas=1&id_tahun_ajaran=1&tanggal=2026-10-30');
    await t.getByRole('button', { name: 'Edit jurnal kelas', exact: true }).click();
    const dialog = t.getByRole('dialog'); await dialog.waitFor();
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await t.setViewportSize({ width, height: 900 }); await fits(t, 'journal confirmation @' + width);
      const rect = await dialog.boundingBox();
      assert(rect && rect.width >= Math.min(280, width - 32) && rect.width <= 520, 'Readable dialog width @' + width);
      await t.screenshot({ path: path.join(state, 'screenshots', `journal-confirmation-${width}.png`) });
    }
    await t.setViewportSize({ width: 390, height: 900 });
    await dialog.getByRole('button', { name: 'Ya, edit jurnal ini', exact: true }).click();
    await fits(t, 'unlocked journal form on phone');
    const menu = t.getByRole('button', { name: 'Menu fitur', exact: true });
    await menu.click();
    const features = t.getByRole('navigation', { name: 'Fitur modul', exact: true });
    await features.getByRole('link', { name: 'Jadwal Mengajar', exact: true }).click();
    await t.waitForURL('**/guru/jadwal');
    assert.equal(await t.getByRole('button', { name: 'Menu fitur', exact: true }).getAttribute('aria-expanded'), 'false');
    await fits(t, 'mobile feature menu closes after navigation');
    pass('RESPONSIVE_confirmation_readable_focus_and_mobile_feature_menu');
  } finally { await tc.close(); }
  unchanged(); pass('INTEGRITY_original_school_database_unchanged');
})().catch(error => { results.push({ id: 'responsive', status: 'FAIL', message: error.stack }); console.error(error.stack); }).finally(async () => {
  if (appBrowser) await appBrowser.close(); db.close();
  const report = { passed: results.filter(r => r.status === 'PASS').length, failed: results.filter(r => r.status === 'FAIL').length, tests: results };
  fs.writeFileSync(path.join(state, 'reports/responsive-portals.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed} PASS, ${report.failed} FAIL`); process.exitCode = report.failed ? 1 : 0;
});
