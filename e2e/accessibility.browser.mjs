import {test,expect} from '@playwright/test';
async function tabTo(page,target){for(let i=0;i<100;i++){if(await target.evaluate(el=>el===document.activeElement))return;await page.keyboard.press('Tab');}throw Error('Control is not reachable with Tab');}
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
