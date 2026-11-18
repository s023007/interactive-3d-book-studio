const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/npm/three@0.174.0/build/**', route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    return route.fulfill({ path: 'node_modules/three/build/' + name, contentType: 'text/javascript' });
  });
});

async function capture(page, testInfo, name) {
  await page.locator('.answer-label').evaluateAll(labels => Promise.all(labels.flatMap(label => label.getAnimations().map(animation => animation.finished.catch(() => {})))));
  const path = testInfo.outputPath(name + '.png');
  await page.screenshot({ path, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

for (const viewport of [{width:360,height:800},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]) {
  test.describe(viewport.width + 'x' + viewport.height, () => {
    test.use({ viewport, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 });
    test('captures the student journey', async ({ page }, info) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && message.location().url.includes('/adventure.js')) errors.push(message.text());
      });
      await page.goto('/adventure.html');
      await expect(page.locator('#stage3d')).toHaveJSProperty('width', viewport.width);
      await expect(page.locator('#sceneError')).toBeHidden();
      await page.locator('#mute').click();
      await capture(page, info, 'welcome');
      await page.locator('#begin').click();
      await capture(page, info, 'grades');
      await page.locator('[data-pack=fractions]').click();
      await capture(page, info, 'coral-quiz');
      await expect(page.locator('#equation .math-frac')).toHaveCount(2);
      await expect(page.locator('#answers .math-frac')).toHaveCount(4);
      for (const button of await page.locator('.answer').all()) await expect(button).toBeInViewport({ ratio: 1 });
      await expect(page.locator('#equation .math-piece')).toHaveCount(5);
      await expect(page.locator('.question-dock')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
      await page.locator('#hint').click();
      await expect(page.locator('#response')).toContainText('النصف');
      await answerAll(page, [1, 1, 1], () => capture(page, info, 'celebration'));
      await capture(page, info, 'map');
      await page.locator('#customize').click();
      await capture(page, info, 'customization');
      await page.locator('[data-color=violet]').click();
      await page.locator('#avatarDone').click();
      await expect(page.locator('#qProgress')).toContainText('١ من ٣');
      expect(errors).toEqual([]);
    });
  });
}

async function answerAll(page, answers, celebrate = async () => {}, select = option => option.click()) {
  for (const [index, correct] of answers.entries()) {
    const options = page.locator('.answer');
    if (index === 2 && answers[0] === 1) await expect(page.locator('#equation .math-frac')).toHaveCount(2);
    await select(options.nth(correct === 0 ? 1 : 0));
    await expect(page.locator('#response')).toContainText('اقتربت');
    await select(options.nth(correct));
    await page.locator('#next').click();
    await expect(page.locator('#reward')).toBeVisible();
    if (!index) await celebrate();
    await page.locator('#continue').click();
  }
  await expect(page.locator('#scoreFinal')).toHaveText('٣');
}

for (const viewport of [{width:360,height:800},{width:390,height:844},{width:1440,height:900}]) {
  test.describe('observatory '+viewport.width+'x'+viewport.height, () => {
    const mobile=viewport.width<700;
    test.use({viewport,isMobile:mobile,hasTouch:mobile});
    test('advanced limits journey', async ({ page }, info) => {
      await page.goto('/adventure.html');
      await page.locator('#mute').click();
      await page.locator('#begin').click();
      await page.locator('[data-pack=limits]').click();
      await capture(page, info, 'observatory-quiz');
      await expect(page.locator('#equation .math-lim')).toBeVisible();
      for (const button of await page.locator('.answer').all()) await expect(button).toBeInViewport({ ratio: 1 });
      await answerAll(page, [2, 1, 2], undefined, option => mobile?option.tap():option.click());
      await page.locator('#customize').click();
      await page.locator('[data-color=blue]').click();
      await page.locator('#avatarDone').click();
      await expect(page.locator('#qProgress')).toContainText('١ من ٣');
    });

  });
}

test('text mode and unavailable microphone', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return kind.startsWith('webgl') ? null : original.call(this, kind, ...args);
    };
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined });
  });
  await page.goto('/adventure.html');
  await expect(page.locator('#sceneError')).toBeVisible();
  await page.locator('#audioSettings').click();
  await page.locator('#record').click();
  await expect(page.locator('#voiceNote')).toContainText('تعذّر');
  await page.locator('#closeVoice').click();
  await page.locator('#begin').click();
  await page.locator('[data-pack=fractions]').click();
  await answerAll(page, [1, 1, 1]);
});

test('preserves feedback and marks the right challenges on the map', async ({ page }) => {
  await page.goto('/adventure.html');
  await page.locator('#mute').click();
  await page.locator('#begin').click();
  await page.locator('[data-pack=fractions]').click();
  await page.locator('.answer').nth(0).click();
  await page.locator('.answer').nth(2).click();
  await expect(page.locator('#response .math-frac')).toBeVisible();
  await page.locator('#next').click();
  await page.locator('.answer').nth(1).click();
  await expect(page.locator('#response')).toContainText('إجابة صحيحة');
  await page.waitForTimeout(1200);
  await expect(page.locator('#quest')).toBeVisible();
  await page.locator('#next').click();
  await page.locator('#continue').click();
  await page.locator('.answer').nth(1).click();
  await page.locator('#next').click();
  await page.locator('#continue').click();
  await expect(page.locator('#scoreFinal')).toHaveText('٢');
  await expect(page.locator('#trail > span')).toHaveText(['١', '🌟', '🌟']);
});

test('keeps the game usable when the 3D module cannot load', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/npm/three@0.174.0/build/**', route => route.abort());
  await page.goto('/adventure.html');
  await expect(page.locator('#sceneError')).toBeVisible();
  await page.locator('#begin').click();
  await page.locator('[data-pack=limits]').click();
  await expect(page.locator('#equation .math-expression')).toHaveText('(س² − ٤) ÷ (س − ٢)');
  await expect(page.locator('#equation .math-lim small')).toHaveText('س → ٢');
  await page.locator('.answer').nth(2).click();
  await expect(page.locator('#next')).toBeVisible();
});

test('uses a recording only for its attached line and keeps captions without Arabic TTS', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.speechSynthesis, 'getVoices', { value: () => [] });
    HTMLMediaElement.prototype.play = async function () {
      this.dispatchEvent(new Event('playing'));
    };
  });
  await page.goto('/adventure.html');
  await page.locator('#audioSettings').click();
  await expect(page.locator('#voiceScript')).toContainText('مرحبًا');
  await page.locator('#voiceFile').setInputFiles({
    name: 'sample.wav', mimeType: 'audio/wav', buffer: Buffer.from('524946462800000057415645666d74201000000001000100401f0000803e000002001000646174610400000000000000','hex'),
  });
  await page.locator('[name=voiceMode][value=recorded]').check();
  await page.locator('#testVoice').click();
  await expect(page.locator('#audioSource')).toContainText('التسجيل الذي أرفقته');
  await page.locator('#saveVoice').click();
  await page.locator('#begin').click();
  await page.locator('[data-pack=limits]').click();
  await expect(page.locator('#bubble')).toContainText('نهاية الدالة');
  await page.locator('#audioSettings').click();
  await page.locator('#testVoice').click();
  await expect(page.locator('#audioSource')).toContainText('لا يوجد تسجيل بشري');
  await page.locator('[name=voiceMode][value=device]').check();
  await page.locator('#testVoice').click();
  await expect(page.locator('#audioSource')).toContainText('لا يتوفّر صوت عربي');
});

test.describe('numerator on touch screen',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  test('drags the missing numerator and cancels drops outside the equation', async ({ page }, info) => {
    await page.goto('/adventure.html');
    await page.locator('#mute').click();
    await page.locator('#begin').click();
    await page.locator('[data-pack=fractions]').click();
    for(let i=0;i<2;i++){
      await page.locator('.answer').nth(1).click();
      await page.locator('#next').click();
      await page.locator('#continue').click();
    }
    const option=page.locator('.answer').nth(1);
    const slot=page.locator('.drop-slot');
    const cdp=await page.context().newCDPSession(page);
    async function drag(x,y) {
      const source=await option.boundingBox();
      const origin={x:source.x+source.width/2,y:source.y+source.height*2/3};
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[origin]});
      for(let step=1;step<=8;step++){
        const point={x:origin.x+(x-origin.x)*step/8,y:origin.y+(y-origin.y)*step/8};
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }
    await drag(10,250);
    await expect(slot).toHaveText('؟');
    await expect(option).toBeEnabled();
    const target=await slot.boundingBox();
    await drag(target.x+target.width/2,target.y+target.height/2);
    await expect(slot).toHaveText('٦');
    await expect(page.locator('#response')).toContainText('إجابة صحيحة');
    await capture(page,info,'fraction-drop');
    await page.locator('#next').click();
    await page.locator('#continue').click();
    await expect(page.locator('#scoreFinal')).toHaveText('٣');
  });
});

test('Luma presents, guides and celebrates even without audio', async ({ page }) => {
  await page.goto('/adventure.html');
  await page.locator('#begin').click();
  await page.locator('[data-pack=fractions]').click();
  const game=page.locator('#game');
  await expect(game).toHaveAttribute('data-guide-cue','present');
  await page.locator('#hint').click();
  await expect(game).toHaveAttribute('data-guide-cue','nudge');
  await page.locator('#guideReplay').click();
  await expect(game).toHaveAttribute('data-guide-cue','present');
  await expect(page.locator('#bubble')).toContainText('اجمع الكسرين');
  await page.locator('.answer').nth(1).click();
  await expect(game).toHaveAttribute('data-guide-cue','celebrate');
  await expect(page.locator('#response')).toContainText('إجابة صحيحة');
});
