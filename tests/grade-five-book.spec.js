const {test,expect}=require('@playwright/test');

test.beforeEach(async({page})=>{
  await page.route('https://cdn.jsdelivr.net/npm/three@0.174.0/build/**',route=>route.fulfill({
    path:'node_modules/three/build/'+new URL(route.request().url()).pathname.split('/').pop(),
    contentType:'text/javascript',
  }));
});

async function openGeometry(page){
  const cards=page.locator('#atlas-cards');
  await cards.getByRole('button',{name:/الهندسة.*هضبة الهندسة/}).click();
  await cards.getByRole('button',{name:/المكعب ومتوازي المستطيلات/}).click();
}

for(const viewport of [{width:360,height:800},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
  test.describe('workshop '+viewport.width,()=>{
    const touch=viewport.width<500;
    test.use({viewport,hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
    test('spots overlapping faces, repairs the net and earns the workshop stamp',async({page},info)=>{
      test.setTimeout(110000);
      const faults=[];
      page.on('pageerror',error=>faults.push(error.message));
      await page.goto('/grade-five-book.html');
      await openGeometry(page);
      await expect(page.locator('#paper-scene')).toHaveAttribute('data-rendered','');
      const use=locator=>touch?locator.tap():locator.click();
      const action=selector=>use(page.locator(selector));
      await action('#open-workshop');
      await expect(page.locator('#workshop-speaker')).toHaveText('صانعة الصناديق');
      await expect(page.locator('#workshop-fallback')).toBeHidden();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(viewport.width);
      await page.screenshot({path:info.outputPath('workshop-opening.png')});
      const faces=page.locator('#workshop-faces button');
      const fold=async()=>{for(const button of await faces.all())await use(button);};
      await action('#workshop-listen');
      await expect(page.locator('#workshop-audio')).toContainText('التسجيل البشري');
      await fold();
      await expect(page.locator('#workshop')).toHaveAttribute('data-phase','overlap');
      await expect(page.locator('#workshop-faces [data-conflict]')).toHaveCount(2);
      await expect(page.locator('#workshop-speaker')).toHaveText('الراكون');
      await page.screenshot({path:info.outputPath('workshop-overlap.png')});
      await use(page.locator('#workshop-faces [data-conflict]').last());
      await expect(page.locator('#workshop-faces [data-conflict]')).toHaveCount(0);
      await action('#workshop-next');
      await fold();
      await expect(page.locator('#workshop-line')).toContainText('صندوقٌ مغلق');
      await action('#workshop-next');
      await use(page.getByRole('button',{name:/^الشبكة أ/}));
      await fold();
      await expect(page.locator('#workshop')).toHaveAttribute('data-phase','overlap');
      await expect(page.locator('#workshop-stamp')).toBeHidden();
      await use(page.getByRole('button',{name:/^الشبكة ب/}));
      await fold();
      await expect(page.locator('#workshop-stamp')).toBeVisible();
      await page.screenshot({path:info.outputPath('workshop-reward.png')});
      await action('#workshop-next');
      await expect(page.locator('#open-workshop')).toContainText('الختم محفوظ');
      await page.reload();
      await openGeometry(page);
      await expect(page.locator('#open-workshop')).toContainText('الختم محفوظ');
      expect(faults).toEqual([]);
    });
  });
}

test('uses workshop controls and local voice settings with WebGL unavailable',async({page})=>{
  await page.route('https://cdn.jsdelivr.net/npm/three@0.174.0/build/**',route=>route.abort());
  await page.goto('/grade-five-book.html');
  await openGeometry(page);
  await page.locator('#open-workshop').click();
  await expect(page.locator('#workshop-fallback')).toBeVisible();
  await page.locator('#workshop-voice').click();
  await expect(page.locator('#voice-script')).toHaveText(/وصلت قطعة جديدة/);
  await expect(page.locator('#voice-fallback')).toBeHidden();
  await page.locator('#voice-file').setInputFiles('assets/grade-five-audio/01.mp3');
  await expect(page.locator('#voice-panel-status')).toContainText('حُفظ التسجيل');
  await page.locator('#voice-close').click();
  await page.locator('#workshop-listen').click();
  await expect(page.locator('#workshop-audio')).toContainText('يعمل التسجيل المحفوظ');
  for(const button of await page.locator('#workshop-faces button').all()){
    await button.focus();
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('#workshop-flat [data-conflict]')).toHaveCount(2);
});

const newLessons=[
  {width:360,height:800,name:'الخطوط المتوازية والمتعامدة',map:'معابر الخطوط',title:'عارضتان في المسار',
   tool:'ضع زاوية القياس',observation:'المسافة',answers:[0,1,1],stamp:'مستكشف الخطوط'},
  {width:390,height:844,name:'المثلثات',map:'ورش المثلثات',title:'مقارنة أضلاع المثلث',
   tool:'قس الضلع الثالث',observation:'٤ وحدات',answers:[0,1,2],stamp:'خبير الأضلاع'},
  {width:768,height:1024,name:'الإحداثيات',map:'شبكة الإحداثيات',title:'خطوتان من نقطة الأصل',
   tool:'تتبّع ص',observation:'اقرأ س قبل ص',answers:[1,0,2],stamp:'مستكشف الإحداثيات'},
  {width:1440,height:900,name:'الانسحاب والانعكاس',map:'مسار الحركة والمرآة',title:'حرّك القطعة الورقية',
   tool:'تتبّع الحركة',observation:'السهم الأفقي',answers:[0,1,1],stamp:'دليل التحويلات'},
];

for(const lesson of newLessons){
  const {width,height}=lesson;
  const mobile=width<500;
  test.describe('geometry '+width,()=>{
    test.use({viewport:{width,height},hasTouch:mobile,isMobile:mobile});
    test('explores and earns a separate stamp at '+lesson.width+' in '+lesson.name,async({page},info)=>{
      test.setTimeout(115000);
      await page.emulateMedia({reducedMotion:'reduce'});
      const faults=[];
      page.on('pageerror',error=>faults.push(error.message));
      await page.goto('/grade-five-book.html');
      const cards=page.locator('#atlas-cards');
      const openLesson=async()=>{
        await cards.getByRole('button',{name:/الهندسة.*هضبة الهندسة/}).click();
        await cards.getByRole('button',{name:new RegExp(lesson.name)}).click();
      };
      await openLesson();
      await expect(page.locator('#door-map')).toHaveAttribute('data-projected','');
      await expect(page.locator('#map-title')).toHaveText(lesson.map);
      const doors=page.locator('#door-map .door');
      await expect(doors).toHaveCount(3);
      for(const door of await doors.all())await expect(door).toBeInViewport({ratio:1});
      await page.screenshot({path:info.outputPath('lesson-map.png')});
      if(mobile)await doors.first().tap();
      else await doors.first().click();
      await expect(page.locator('#sheet-title')).toHaveText(lesson.title);
      await expect(page.locator('#fallback')).toBeHidden();
      await expect(page.locator('#fold')).toBeHidden();
      await page.getByRole('button',{name:lesson.tool,exact:true}).click();
      await expect(page.locator('#concept-note')).toContainText(lesson.observation);
      await expect(page.locator('#hear')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
      await page.screenshot({path:info.outputPath('lesson-activity.png')});
      for(const [i,answer] of lesson.answers.entries()){
        if(i===1){
          await page.locator('[data-option="'+((answer+1)%3)+'"]').click();
          await page.locator('#check').click();
          await expect(page.locator('#feedback')).toContainText('أعد المحاولة');
          await page.locator('#hint').click();
          await expect(page.locator('#hear')).toBeVisible();
        }
        await page.locator('[data-option="'+answer+'"]').click();
        await page.locator('#check').click();
        await expect(page.locator('#feedback')).toContainText('صحيح');
        await page.locator('#next').click();
      }
      await expect(page.locator('#sheet-title')).toHaveText(lesson.stamp);
      await page.locator('#trail-unit').click();
      await expect(cards.getByRole('button',{name:new RegExp(lesson.name)})).toContainText('ختم محفوظ');
      await cards.getByRole('button',{name:/المكعب ومتوازي المستطيلات/}).click();
      await expect(page.locator('#map-count')).toContainText('٠ مكتملة');
      await page.reload();
      await openLesson();
      await expect(page.locator('#map-count')).toContainText('٣ مكتملة');
      await page.locator('#map-stamp').click();
      await expect(page.locator('#stamp')).toContainText(lesson.stamp);
      expect(faults).toEqual([]);
    });
  });
}

test('keeps geometry manipulatives and alternate questions usable without WebGL',async({page})=>{
  await page.route('https://cdn.jsdelivr.net/npm/three@0.174.0/build/**',route=>route.abort());
  await page.goto('/grade-five-book.html');
  await page.locator('#atlas-cards').getByRole('button',{name:/الهندسة.*هضبة الهندسة/}).click();
  await page.locator('#atlas-cards').getByRole('button',{name:/الإحداثيات/}).click();
  await page.getByRole('button',{name:'علامة المحور',exact:true}).click();
  await expect(page.locator('#fallback-figure svg')).toHaveAttribute('aria-label',/س ٠ وص ٤/);
  await page.locator('#explain').click();
  await expect(page.locator('#feedback')).toContainText('السؤال الجديد');
  await expect(page.locator('#fallback-figure svg')).toHaveAttribute('aria-label',/س ٤ وص ٠/);
  await page.getByRole('button',{name:'تتبّع س',exact:true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#concept-note')).toContainText('أفقيًا');
  await page.locator('[data-option="2"]').click();
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('طبّقت الفكرة');
  await page.locator('#show-map').click();
  await expect(page.locator('#map-count')).toContainText('١ مكتملة');
});

for(const viewport of [{width:360,height:800},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
  test.describe('grade-five '+viewport.width,()=>{
    const mobile=viewport.width<500;
    test.use({viewport,hasTouch:mobile,isMobile:mobile});
    test('folds a net, retries, solves independent exercises and keeps the stamp',async({page},info)=>{
      if(!mobile)test.setTimeout(105000);
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      const press=selector=>mobile?page.locator(selector).tap():page.locator(selector).click();
      await page.goto('/grade-five-book.html');
      await expect(page.locator('#paper-scene')).toHaveAttribute('data-rendered','');
      if(viewport.width===390)await page.screenshot({path:info.outputPath('index-atlas.png')});
      await openGeometry(page);
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
      await press('#fold-step');
      await expect(page.locator('#feedback')).toContainText('الحواف المشتركة');
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
      await press('#concept-tools button:last-child');
      await expect(page.locator('#concept-note')).toContainText('يطابق');
      await press('[data-option="2"]');
      await press('#check');
      await expect(page.locator('#feedback')).toContainText('صحيح');
      await press('#next');
      await expect(page.locator('#sheet-title')).toHaveText('مستكشف المجسّمات');
      await press('#index');
      await expect(page.locator('#stamp')).toBeVisible();
      await page.screenshot({path:info.outputPath('stamp.png')});
      await page.reload();
      await openGeometry(page);
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
  await openGeometry(page);
  await page.locator('.door:first-child').click();
  await expect(page.locator('#fallback')).toBeVisible();
  await page.locator('#read').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#audio-status')).toContainText('لا يوجد تسجيل قابل للتشغيل');
  await page.locator('[data-page="2"]').click();
  await page.locator('[data-option="0"]').click();
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('صحيح');
});

test('streams Arabic question and hint without any device voices', async ({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(window.speechSynthesis,'getVoices',{value:()=>[]});
    localStorage.setItem('warraq.book.allow-synthetic','yes');
    const AudioElement=window.Audio;
    window.Audio=function(source){
      window.activeBookAudio=new AudioElement(source);
      return window.activeBookAudio;
    };
  });
  await page.goto('/grade-five-book.html');
  await openGeometry(page);
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
  await openGeometry(page);
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
  await openGeometry(page);
  await expect(page.getByRole('button',{name:'باب التجربة، مكتمل'})).toBeVisible();
  await page.locator('#index').click();
  await page.locator('[data-shortcut="3"]').click();
  await expect(page.locator('#sheet-title')).toHaveText('أوجه الصندوق');
  await expect(map).toBeHidden();
});

test('opens the last question from the overview without walking the preceding route',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/grade-five-book.html');
  await openGeometry(page);
  await page.getByRole('button',{name:'ألواح الصندوق'}).click();
  await expect(page.locator('#sheet-title')).toHaveText('ألواح متوازي المستطيلات');
  await page.locator('#show-map').click();
  await expect(page.locator('#map-count')).toContainText('٠ مكتملة');
});

test('opens maps for the index and unit and saves a local recording for the current line',async({page},info)=>{
  test.setTimeout(105000);
  await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{Object.defineProperty(window.speechSynthesis,'getVoices',{value:()=>[]});});
  await page.goto('/grade-five-book.html');
  await expect(page.locator('#book-title')).toHaveText('أطلس الرياضيات');
  await expect(page.locator('#atlas-cards button')).toHaveCount(4);
  await expect(page.locator('#paper-scene')).toHaveAttribute('data-rendered','');
  await page.screenshot({path:info.outputPath('index-atlas.png')});
  await page.getByRole('button',{name:'معلم الهندسة',exact:true}).click();
  await expect(page.locator('#book-title')).toHaveText('خريطة الهندسة');
  await expect(page.locator('#atlas-cards button')).toHaveCount(5);
  await expect(page.getByRole('button',{name:'معلم الخطوط المتوازية والمتعامدة',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('geometry-unit.png')});
  await page.locator('#trail-index').click();
  await page.getByRole('button',{name:'معلم الأعداد والعمليات',exact:true}).click();
  await page.getByRole('button',{name:'معلم القيمة المكانية',exact:true}).click();
  await expect(page.locator('#atlas-note')).toContainText('قيد الإعداد');
  await page.locator('#trail-index').click();
  await page.getByRole('button',{name:'معلم الهندسة',exact:true}).click();
  await page.getByRole('button',{name:'معلم المكعب ومتوازي المستطيلات',exact:true}).click();
  await page.locator('.door:first-child').click();
  await page.locator('#voice-setup').click();
  await expect(page.locator('#voice-script')).toContainText('كم وجهًا');
  await page.locator('#voice-file').setInputFiles('assets/grade-five-audio/01.mp3');
  await expect(page.locator('#voice-panel-status')).toContainText('حُفظ التسجيل');
  await page.locator('#voice-close').click();
  await page.reload();
  await openGeometry(page);
  await page.locator('.door:first-child').click();
  await page.locator('#read').click();
  await expect(page.locator('#audio-status')).toContainText('يعمل التسجيل المحفوظ');
});
