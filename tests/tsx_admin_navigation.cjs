'use strict';
// Read-only UI regression; use any external teacher fixture.
const {fs,path,state,base,db,assert,login,browser,context,unchanged}=require('./tsx_admin_helpers.cjs');
let appBrowser;const tests=[];const pass=id=>{tests.push({id,status:'PASS'});console.log('PASS '+id)};
(async()=>{
 const admin=await login('uji_admin');appBrowser=await browser();const ctx=await context(appBrowser,admin),page=await ctx.newPage();
 try{
  let unavailable=true;
  await page.route('**/api/admin?*',async route=>{
    const q=new URL(route.request().url()).searchParams;
    if(q.get('table')==='kelas'&&unavailable){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'Referensi kelas sementara tidak tersedia.'})});return;}
    if(['guru','jurusan','kelas'].includes(q.get('table')))await new Promise(resolve=>setTimeout(resolve,150));
    await route.continue();
  });
  await page.goto(base+'/admin/jadwal');await page.getByText('Referensi kelas sementara tidak tersedia.',{exact:true}).waitFor();
  const add=page.getByRole('button',{name:'Tambah Jadwal mengajar',exact:true});assert(await add.isDisabled());
  unavailable=false;
  await page.getByRole('button',{name:'Muat ulang',exact:true}).click();await add.click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Guru',{exact:true}).selectOption('2');await dialog.getByLabel('Kelas',{exact:true}).selectOption('2');
  assert.equal(await dialog.getByLabel('Periode',{exact:true}).inputValue(),'1');await page.keyboard.press('Escape');
  pass('LOOKUPS_failed_reference_blocks_empty_popup_and_reload_recovers_all_options');
  await page.goto(base+'/admin/master');
  for(const name of ['Guru','Kelas','Siswa','Kelas']){
    await page.getByRole('button',{name,exact:true}).click();
    await page.getByRole('button',{name:'Tambah '+name,exact:true}).click();
    const popup=page.getByRole('dialog');await popup.waitFor();
    if(name==='Kelas')assert(await popup.getByLabel('Jurusan',{exact:true}).locator('option').count()>1);
    if(name==='Siswa')assert(await popup.getByLabel('Kelas',{exact:true}).locator('option').count()>1);
    await page.keyboard.press('Escape');
  }
  pass('LOOKUPS_switching_master_tabs_never_opens_a_form_with_stale_references');
  await page.unroute('**/api/admin?*');await page.setViewportSize({width:1440,height:480});await page.goto(base+'/admin/jadwal');
  await page.waitForFunction(()=>document.querySelector('nav[aria-label="Modul utama"]')?.getAttribute('aria-busy')==='false');
  await page.evaluate(()=>{document.querySelector('main').style.minHeight='1600px';window.scrollTo({top:400,behavior:'instant'});});
  const geometry=await page.evaluate(()=>{const side=document.querySelector('.sia-sidebar'),bar=document.querySelector('.sia-topbar').getBoundingClientRect();side.scrollTop=side.scrollHeight;const rect=side.getBoundingClientRect(),last=side.querySelector('nav a:last-child').getBoundingClientRect();return{sideTop:rect.top,barBottom:bar.bottom,sideBottom:rect.bottom,lastBottom:last.bottom,overflow:getComputedStyle(side).overflowY};});
  assert(Math.abs(geometry.sideTop-geometry.barBottom)<=1);assert(geometry.sideBottom<=481);assert(geometry.lastBottom<=geometry.sideBottom+1);assert.equal(geometry.overflow,'auto');
  await page.screenshot({path:path.join(state,'screenshots/navbar-sidebar-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo({top:400,behavior:'instant'}));
  assert(Math.abs(await page.locator('.sia-topbar').evaluate(el=>el.getBoundingClientRect().top))<1);await page.screenshot({path:path.join(state,'screenshots/navbar-mobile.png')});
  pass('NAVIGATION_full_top_bar_stays_visible_and_compact_sidebar_scrolls_without_extra_space');
 }finally{await ctx.close();}
 unchanged();pass('INTEGRITY_original_school_database_unchanged');
})().catch(e=>{tests.push({id:'admin-navigation',status:'FAIL',message:e.stack});console.error(e.stack)}).finally(async()=>{if(appBrowser)await appBrowser.close();db.close();const report={passed:tests.filter(t=>t.status==='PASS').length,failed:tests.filter(t=>t.status==='FAIL').length,tests};fs.writeFileSync(path.join(state,'reports/admin-navigation.json'),JSON.stringify(report,null,2)+'\n');console.log(`${report.passed} PASS, ${report.failed} FAIL`);process.exitCode=report.failed?1:0;});
