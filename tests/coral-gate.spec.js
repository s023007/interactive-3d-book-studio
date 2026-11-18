const {test,expect}=require('@playwright/test');
test.use({viewport:{width:360,height:800},hasTouch:true,isMobile:true});

test('swims to collect exactly three quarters and opens the coral gate',async({page},info)=>{
  await page.route('https://cdn.jsdelivr.net/npm/three@0.174.0/build/**',route=>route.fulfill({
    path:'node_modules/three/build/'+new URL(route.request().url()).pathname.split('/').pop(),
    contentType:'text/javascript',
  }));
  await page.goto('/adventure.html');
  await page.locator('#begin').tap();
  await page.getByRole('link',{name:/فُقّاع/}).tap();
  await expect(page.locator('#stage')).toHaveClass(/has-model/);
  await page.screenshot({path:info.outputPath('coral-start.png')});
  await page.locator('#gate').tap();
  await expect(page.locator('#status')).toContainText('البوابة تحتاج ثلاثة أرباع');
  await page.locator('#reset').tap();
  for(let i=0;i<3;i++){
    await page.locator('.shell').nth(i).tap();
    await expect(page.locator('#count')).toHaveText('١٢٣'[i]);
  }
  await page.locator('.shell').nth(3).tap();
  await expect(page.locator('#status')).toContainText('اترك الربع الرابع');
  await page.locator('#gate').tap();
  await expect(page.locator('#gate')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#status')).toContainText('فتحت البوابة');
  await page.screenshot({path:info.outputPath('coral-gate.png')});
  await page.locator('#reset').tap();
  await expect(page.locator('.shell:visible')).toHaveCount(4);
});

test('uses keyboard with reduced motion and keeps playing without WebGL',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('https://cdn.jsdelivr.net/npm/three@0.174.0/build/**',route=>route.abort());
  await page.goto('/coral-gate.html');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#count')).toHaveText('١');
  await page.locator('.shell').nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#count')).toHaveText('٢');
  await page.locator('.shell').nth(1).focus();
  await page.keyboard.press('Enter');
  await page.locator('#gate').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#gate')).toHaveAttribute('aria-pressed','true');
});
