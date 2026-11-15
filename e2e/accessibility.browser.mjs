import {test,expect} from '@playwright/test';
async function tabTo(page,target){for(let i=0;i<100;i++){if(await target.evaluate(el=>el===document.activeElement))return;await page.keyboard.press('Tab');}throw Error('Control is not reachable with Tab');}
test('reviewing the last open finding returns visible focus to the filter in short viewports',async({page})=>{
  for(const viewport of [{width:640,height:512},{width:320,height:256}]){
    await test.step(`last-finding fallback at ${viewport.width}x${viewport.height}`,async()=>{
      await page.setViewportSize(viewport);await page.goto('/');
      await page.locator('#filter').selectOption('open');
      expect(await page.locator('.review-button').count()).toBeGreaterThan(0);
      while(await page.locator('.review-button').count()){
        await page.locator('.review-button').first().focus();
        await page.keyboard.press('Enter');
      }
      await expect(page.locator('#filter')).toBeFocused();
      await expect.soft(page.locator('#filter')).toBeInViewport({ratio:1});
    });
  }
});
test('keyboard review retains its position when a finding updates or leaves the open view',async({page})=>{
  await page.goto('/');
  await tabTo(page,page.locator('.review-button').first());
  const id=await page.locator('.review-button').first().getAttribute('data-finding');
  await page.keyboard.press('Enter');
  await expect(page.locator(`.review-button[data-finding="${id}"]`)).toBeFocused();
  await expect(page.locator(`.review-button[data-finding="${id}"]`)).toHaveAttribute('aria-pressed','true');
  await tabTo(page,page.locator('#filter'));
  await page.keyboard.press('ArrowDown');
  await tabTo(page,page.locator('.review-button').first());
  await page.keyboard.press('Enter');
  await expect(page.locator('.review-button').first()).toBeFocused();
  await page.setViewportSize({width:320,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
