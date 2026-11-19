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
      await expect(page.locator('#door-map')).toHaveAttribute('data-projected','');
      await expect(page.locator('.door')).toHaveCount(6);
      await expect(page.locator('#map-count')).toContainText('٦ أسئلة');
      for(const door of await page.locator('.door').all())await expect(door).toBeInViewport({ratio:1});
      await page.screenshot({path:info.outputPath('paper-map.png')});
      await press('.door:first-child');
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
      await expect(page.locator('[data-page="6"]')).toBeDisabled();
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
      await expect(page.locator('#sheet-title')).toHaveText('مكعب أم صندوق؟');
      await press('[data-option="1"]');
      await press('#check');
      await expect(page.locator('#feedback')).toContainText('صحيح');
      await press('#next');
      await expect(page.locator('#sheet-title')).toHaveText('ألواح متوازي المستطيلات');
      await press('[data-option="2"]');
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
  await page.route(/\/assets\/grade-five-audio\/.*\.mp3(?:\?.*)?$/,route=>route.abort());
  await page.addInitScript(()=>{Object.defineProperty(window.speechSynthesis,'getVoices',{value:()=>[]});});
  await page.goto('/grade-five-book.html');
  await page.locator('.door:first-child').click();
  await expect(page.locator('#fallback')).toBeVisible();
  await page.locator('#read').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#audio-status')).toContainText('تعذّر تشغيل الصوت');
  await page.locator('[data-page="2"]').click();
  await page.locator('[data-option="0"]').click();
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('صحيح');
});

test('streams Arabic question and hint without any device voices', async ({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(window.speechSynthesis,'getVoices',{value:()=>[]});
    const AudioElement=window.Audio;
    window.Audio=function(source){
      window.activeBookAudio=new AudioElement(source);
      return window.activeBookAudio;
    };
  });
  await page.goto('/grade-five-book.html');
  await page.locator('.door:first-child').click();
  await page.locator('#read').click();
  await expect(page.locator('#audio-status')).toContainText('تعمل القراءة');
  await expect.poll(()=>page.evaluate(()=>window.activeBookAudio.currentTime)).toBeGreaterThan(0);
  await page.evaluate(()=>{window.priorBookAudio=window.activeBookAudio;});
  await page.locator('#hint').click();
  await expect.poll(()=>page.evaluate(()=>window.priorBookAudio.paused)).toBe(true);
  await page.locator('#hear').click();
  await expect(page.locator('#audio-status')).toContainText('تعمل القراءة');
  await expect.poll(()=>page.evaluate(()=>window.activeBookAudio.currentTime)).toBeGreaterThan(0);
  await expect(page.locator('#feedback')).toContainText('المربعات تتصل');
});

test('walks through a door, marks progress and allows direct review from the index',async({page})=>{
  await page.goto('/grade-five-book.html');
  const map=page.locator('#door-map');
  await expect(map).toHaveAttribute('data-projected','');
  await page.getByRole('button',{name:'باب التجربة'}).focus();
  await page.keyboard.press('Enter');
  await expect(map.locator('[data-opening]')).toHaveCount(1);
  await expect(page.locator('#map-status')).toContainText('يتجه الراكون');
  await expect(page.locator('#sheet-title')).toHaveText('أين تذهب الأوجه؟');
  await expect(map).toBeHidden();
  await page.locator('[data-option="1"]').click();
  await page.locator('#check').click();
  await page.locator('#show-map').click();
  await expect(page.getByRole('button',{name:'باب التجربة، مكتمل'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button',{name:'باب التجربة، مكتمل'})).toBeVisible();
  await page.locator('#index').click();
  await page.locator('[data-shortcut="3"]').click();
  await expect(page.locator('#sheet-title')).toHaveText('أوجه الصندوق');
  await expect(map).toBeHidden();
});

test('opens the last question from the overview without walking the preceding route',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/grade-five-book.html');
  await page.getByRole('button',{name:'ألواح الصندوق'}).click();
  await expect(page.locator('#sheet-title')).toHaveText('ألواح متوازي المستطيلات');
  await page.locator('#show-map').click();
  await expect(page.locator('#map-count')).toContainText('٠ مكتملة');
});
