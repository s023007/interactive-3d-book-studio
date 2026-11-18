const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.route('https://cdn.jsdelivr.net/npm/three@0.174.0/build/**',route=>route.fulfill({
    path:'node_modules/three/build/'+new URL(route.request().url()).pathname.split('/').pop(),
    contentType:'text/javascript',
  }));
});

for(const viewport of [{width:360,height:800},{width:390,height:844},{width:1440,height:900}]){
  test.describe('river '+viewport.width,()=>{
    const mobile=viewport.width<500;
    test.use({viewport,hasTouch:mobile,isMobile:mobile});
    test('follows tracks, corrects the bridge and photographs the animal',async({page},info)=>{
      if(!mobile)test.setTimeout(105000);
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      const pick=selector=>mobile?page.locator(selector).tap({timeout:10000}):page.locator(selector).click({timeout:10000});
      const text=page.locator('#objective');
      await page.goto('/river-trail.html');
      await expect(page.locator('#action')).toBeEnabled();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width);
      await expect(text).toContainText('آثار الأقدام');
      await page.screenshot({path:info.outputPath('forest.png')});
      await pick('[data-target=track]');
      await expect(text).toContainText('أثر جديد');
      await pick('[data-target=track]');
      await expect(text).toContainText('وصلت إلى الجسر');
      await expect(page.locator('#slots')).toHaveAccessibleName('أربع خانات مركبة من أصل ثمان');
      await pick('[data-target=plank-1]');
      await expect(text).toContainText('تغطي ١');
      await pick('#action');
      await expect(text).toContainText('تبقى خانة فارغة');
      await pick('[data-target=plank-3]');
      await expect(text).toContainText('تغطي ٣');
      await pick('[data-target=lock]');
      await expect(text).toContainText('أطول من الفراغ');
      await pick('[data-target=plank-2]');
      await expect(text).toContainText('تغطي ٢');
      await pick('#action');
      await expect(text).toContainText('انفتح الجسر');
      await expect(page.locator('#slots')).toHaveAccessibleName('ست خانات مركبة من أصل ثمان');
      await page.screenshot({path:info.outputPath('bridge.png')});
      await page.reload();
      await expect(text).toContainText('عدت إلى الجسر المفتوح');
      await pick('#action');
      await expect(text).toContainText('التقطت صورة الظبي',{timeout:12000});
      await pick('#action');
      await expect(page.locator('#photo-image')).toHaveAttribute('src',/^data:image\/jpeg;base64,/);
      await expect.poll(()=>page.locator('#photo-image').evaluate(img=>img.complete&&img.naturalWidth)).toBe(480);
      await page.screenshot({path:info.outputPath('journal.png')});
      await page.reload();
      await expect(text).toContainText('صورتك محفوظة');
      await pick('#journal');
      await pick('#restart');
      await expect(text).toContainText('آثار الأقدام');
      expect(errors).toEqual([]);
    });
  });
}

test('moves with the keyboard and toggles environmental audio',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/river-trail.html');
  await expect(page.locator('#action')).toBeEnabled();
  const track=page.locator('[data-target=track]');
  await expect(track).toBeVisible();
  const before=await track.evaluate(node=>node.style.left);
  await page.keyboard.down('ArrowRight');
  await expect.poll(()=>track.evaluate(node=>node.style.left)).not.toBe(before);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await expect(page.locator('#objective')).toContainText('أثر جديد');
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','true');
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false');
});

test('provides a return route when the renderer fails',async({page})=>{
  await page.route('https://cdn.jsdelivr.net/npm/three@0.174.0/build/**',route=>route.abort());
  await page.goto('/river-trail.html');
  await expect(page.locator('#objective')).toContainText('تعذّر تحميل الوادي');
  await expect(page.getByRole('link',{name:/ورّاق/})).toHaveAttribute('href','./adventure.html');
});
