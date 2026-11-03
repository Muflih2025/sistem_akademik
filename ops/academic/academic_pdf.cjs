// Local PDF worker. Render only server-generated HTML; all network requests denied.
'use strict';
const fs = require('fs');
let browser;
let phase='load';
const timer = setTimeout(() => process.exit(2), 25000);
(async () => {
  if (!process.env.AK_PDF_PLAYWRIGHT || !process.env.PLAYWRIGHT_BROWSERS_PATH) throw Error('Private PDF configuration required');
  const html = fs.readFileSync(0, 'utf8');
  if (Buffer.byteLength(html) > 8 * 1024 * 1024) throw Error('Report too large');
  const {chromium} = require(process.env.AK_PDF_PLAYWRIGHT);
  phase='launch';
  browser = await chromium.launch({headless: true});
  const context = await browser.newContext({javaScriptEnabled:false});
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  phase='render';
  await page.setContent(html, {waitUntil:'domcontentloaded', timeout:10000});
  const pdf = await page.pdf({format:'A4',landscape:true,printBackground:true,preferCSSPageSize:true});
  process.stdout.write(pdf);
})().catch(error => {process.stderr.write('Local PDF rendering failed phase='+phase+' type='+error.name+'\n');if(process.env.AK_PDF_DIAGNOSTIC==='1'&&phase==='launch')process.stderr.write(error.message);process.exitCode=1;}).finally(async () => {if(browser)await browser.close();clearTimeout(timer);});
