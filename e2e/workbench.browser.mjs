import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function getDownload(page,button){
  const wait=page.waitForEvent('download');
  await button.click();
  const download=await wait;
  return {download,content:await readFile(await download.path(),'utf8')};
}

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
