import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function delayFileReads(page){
  await page.addInitScript(()=>{
    const read=File.prototype.text;window.releaseFileReads={};
    File.prototype.text=function(){
      if(!this.name.startsWith('delayed-'))return read.call(this);
      return new Promise(resolve=>{window.releaseFileReads[this.name]=async()=>resolve(await read.call(this));});
    };
  });
}

async function getDownload(page,button){
  const wait=page.waitForEvent('download');
  await button.click();
  const download=await wait;
  return {download,content:await readFile(await download.path(),'utf8')};
}

test('written quantities are flagged while reordered equivalent sentences stay clean',async({page})=>{
  await page.goto('/');
  await page.locator('#locked').fill('');
  await page.locator('#source').fill('Reply within thirty days. The guide is ready tomorrow.');
  await page.locator('#rewrite').fill('The guide is ready tomorrow. Reply within sixty days.');
  await page.locator('#compare').click();
  await expect(page.locator('.finding')).toContainText(['Quantity changed']);
  await expect(page.locator('.finding').first()).toContainText('thirty days');
  await expect(page.locator('.finding').first()).toContainText('sixty days');
  await page.locator('#rewrite').fill('The guide is ready tomorrow. Reply within 30 days.');
  await page.locator('#compare').click();
  await expect(page.locator('#open-count')).toHaveText('0');
});

test('local workbench: analysis, evidence, export and responsive layout',async({page},testInfo)=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const done=[];
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
      await expect(page.locator('.finding').first()).toBeVisible();expect(Number(await page.locator('#open-count').textContent())).toBeGreaterThan(0);
      const before=Number(await page.locator('#open-count').textContent());await page.locator('.review-button').first().click();expect(Number(await page.locator('#open-count').textContent())).toBe(before-1);
      const exported=await getDownload(page,page.locator('#export'));expect(JSON.parse(exported.content).findings.length).toBeGreaterThan(0);
      await page.locator('#sample').selectOption('clean');expect(Number(await page.locator('#open-count').textContent())).toBe(0);
      await page.locator('#source').fill('<img src=x onerror="window.__injected=true"> 500');await page.locator('#rewrite').fill('600');await page.locator('#compare').click();expect(await page.evaluate(()=>window.__injected)).toBeUndefined();await expect(page.locator('#export')).toBeEnabled();
      await page.locator('#sample').selectOption('proposal');done.push('Real compare findings','Review and JSON export','Equivalent number formats','Untrusted source remains text');
  await page.screenshot({path:testInfo.outputPath('desktop.png'),fullPage:false});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:testInfo.outputPath('mobile.png'),fullPage:false});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1)).toBe(false);
  expect(errors).toEqual([]);
});

test('unfinished imports cannot overwrite newer edits, imports or samples',async({page})=>{
  await delayFileReads(page);await page.goto('/');
  await page.locator('#source-file').setInputFiles({name:'delayed-edit.txt',mimeType:'text/plain',buffer:Buffer.from('Old imported source.')});
  await page.locator('#source').fill('The latest typed source.');
  await page.evaluate(()=>window.releaseFileReads['delayed-edit.txt']());
  await expect(page.locator('#source')).toHaveValue('The latest typed source.');
  await expect(page.locator('#export')).toBeDisabled();

  await page.locator('#source-file').setInputFiles({name:'delayed-import.txt',mimeType:'text/plain',buffer:Buffer.from('Old imported source.')});
  await page.locator('#source-file').setInputFiles({name:'new.txt',mimeType:'text/plain',buffer:Buffer.from('Newer imported source.')});
  await expect(page.locator('#source')).toHaveValue('Newer imported source.');
  await page.evaluate(()=>window.releaseFileReads['delayed-import.txt']());
  await expect(page.locator('#source')).toHaveValue('Newer imported source.');

  await page.locator('#rewrite-file').setInputFiles({name:'delayed-sample.txt',mimeType:'text/plain',buffer:Buffer.from('Old imported rewrite.')});
  await page.locator('#sample').selectOption('clean');const sample=await page.locator('#rewrite').inputValue();
  await page.evaluate(()=>window.releaseFileReads['delayed-sample.txt']());
  await expect(page.locator('#rewrite')).toHaveValue(sample);await expect(page.locator('#open-count')).toHaveText('0');
});
