const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.route('https://cdn.jsdelivr.net/npm/three@0.174.0/build/**',route=>route.fulfill({
    path:'node_modules/three/build/'+new URL(route.request().url()).pathname.split('/').pop(),
    contentType:'text/javascript',
  }));
});

for(const viewport of [{width:360,height:800},{width:390,height:844},{width:1440,height:900}]){
  test.describe('grade-five '+viewport.width,()=>{
    const mobile=viewport.width<500;
    test.use({viewport,hasTouch:mobile,isMobile:mobile});
    test('folds a net, retries, solves independent exercises and keeps the stamp',async({page},info)=>{
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      const press=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
      await page.goto('/grade-five-book.html');
      await expect(page.locator('#fold')).toBeEnabled();
      await expect(page.locator('#fallback')).toBeHidden();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width);
      await page.screenshot({path:info.outputPath('open-book.png')});
      await press('#fold');
      await expect(page.locator('#fold')).toHaveText('افتح الشبكة');
      await page.screenshot({path:info.outputPath('folded-book.png')});
      await press('#fold');
      await press('#next');
      await press('[data-option="0"]');
      await press('#check');
      await expect(page.locator('#feedback')).toContainText('أعد المحاولة');
      await press('#hint');
      await expect(page.locator('#feedback')).toContainText('خارج الصف');
      await expect(page.locator('#hear')).toBeVisible();
      await press('[data-option="1"]');
      await press('#check');
      await expect(page.locator('#feedback')).toContainText('صحيح');
      await press('#next');
      await expect(page.locator('[data-page="4"]')).toBeDisabled();
      await press('#explain');
      await expect(page.locator('#feedback')).toContainText('السؤال الجديد');
      await press('[data-option="1"]');
      await press('#check');
      await expect(page.locator('#feedback')).toContainText('صحيح');
      await press('#next');
      await press('[data-option="1"]');
      await press('#check');
      await expect(page.locator('#feedback')).toContainText('صحيح');
      await press('#next');
      await expect(page.locator('#sheet-title')).toHaveText('مستكشف المجسّمات');
      await press('#index');
      await expect(page.locator('#stamp')).toBeVisible();
      await page.screenshot({path:info.outputPath('stamp.png')});
      await page.reload();
      await press('#index');
      await expect(page.locator('#stamp')).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}

test('keeps the lesson playable with the renderer unavailable and voices absent',async({page})=>{
  await page.route('https://cdn.jsdelivr.net/npm/three@0.174.0/build/**',route=>route.abort());
  await page.addInitScript(()=>{Object.defineProperty(window.speechSynthesis,'getVoices',{value:()=>[]});});
  await page.goto('/grade-five-book.html');
  await expect(page.locator('#fallback')).toBeVisible();
  await page.locator('#read').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#audio-status')).toContainText('لا يتوفر صوت عربي');
  await page.locator('[data-page="2"]').click();
  await page.locator('[data-option="0"]').click();
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('صحيح');
});
