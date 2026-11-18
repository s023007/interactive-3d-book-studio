const { test, expect } = require("@playwright/test");

test.use({viewport:{width:390,height:844}, hasTouch:true, isMobile:true});

function testTone() {
  const sampleRate = 8000;
  const count = sampleRate*3;
  const buffer = Buffer.alloc(44+count*2);
  buffer.write("RIFF",0); buffer.writeUInt32LE(buffer.length-8,4);
  buffer.write("WAVEfmt ",8); buffer.writeUInt32LE(16,16);
  buffer.writeUInt16LE(1,20); buffer.writeUInt16LE(1,22);
  buffer.writeUInt32LE(sampleRate,24); buffer.writeUInt32LE(sampleRate*2,28);
  buffer.writeUInt16LE(2,32); buffer.writeUInt16LE(16,34);
  buffer.write("data",36); buffer.writeUInt32LE(count*2,40);
  for(let index=0; index<count; index++){
    buffer.writeInt16LE(Math.round(6500*Math.sin(2*Math.PI*185*index/sampleRate)),44+index*2);
  }
  return buffer;
}

test("loads the real fox, toggles walking and plays an uploaded waveform", async ({page}, info)=>{
  await page.route("https://cdn.jsdelivr.net/npm/three@0.174.0/**",route=>{
    const file = new URL(route.request().url()).pathname.split("three@0.174.0/")[1];
    return route.fulfill({path:"node_modules/three/"+file,contentType:"text/javascript"});
  });
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/fox-preview.html");
  await expect(page.locator("#status")).toContainText("الثعلب جاهز");
  await page.locator("#voice-tools summary").tap();
  await expect(page.locator("#speak")).toBeDisabled();
  await page.screenshot({path:info.outputPath("fox-mobile.png")});
  await page.locator("#walk").tap();
  await expect(page.locator("#walk")).toHaveAttribute("aria-pressed","true");
  await page.locator("#walk").tap();
  await expect(page.locator("#walk")).toHaveAttribute("aria-pressed","false");
  await page.reload();
  await expect(page.locator("#status")).toContainText("الثعلب جاهز");
  await page.locator("#voice-tools summary").tap();
  const still = await page.locator("#character").screenshot();
  await page.locator("#recording").setInputFiles({name:"test-tone.wav", mimeType:"audio/wav", buffer:testTone()});
  await page.locator("#speak").tap();
  await expect(page.locator("#status")).toContainText("يتحرك الفك");
  await expect.poll(async () => !still.equals(await page.locator("#character").screenshot())).toBe(true);
  await expect(page.locator("#speak")).toBeEnabled();
  await expect(page.locator("#status")).toContainText("انتهى التسجيل");
  await page.locator("#voice-tools summary").tap();
  await page.getByRole("button",{name:"ربع",exact:true}).tap();
  await expect(page.locator("#reef-gate")).toHaveClass(/open/);
  await page.screenshot({path:info.outputPath("fox-fraction-complete.png")});
});

test("completes the missing quarter and resets the gate with WebGL unavailable",async({page})=>{
  await page.route("https://cdn.jsdelivr.net/npm/three@0.174.0/**",route=>route.abort());
  await page.goto("/fox-preview.html");
  await page.getByRole("button",{name:"نصف",exact:true}).tap();
  await expect(page.locator("#feedback")).toContainText("نحتاج ربعًا واحدًا");
  await expect(page.locator("#reef-gate")).not.toHaveClass(/open/);
  await page.getByRole("button",{name:"ربع",exact:true}).tap();
  await expect(page.locator("#shell-board")).toHaveAccessibleName("ثلاثة أرباع من الصدفة");
  await expect(page.locator("#reef-gate")).toHaveClass(/open/);
  await expect(page.locator("#feedback")).toContainText("فُتحت البوابة");
  await expect(page.locator("#next-gate")).toBeFocused();
  await page.locator("#replay").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#shell-board")).toHaveAccessibleName("ربعان من أربعة");
  await expect(page.getByRole("button",{name:"ربع",exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});

test("advances through three gates and remembers the current gate",async({page})=>{
  await page.route("https://cdn.jsdelivr.net/npm/three@0.174.0/**",route=>route.abort());
  await page.goto("/fox-preview.html");
  await page.getByRole("button",{name:"ربع",exact:true}).tap();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mission-title")).toHaveText("بوابة السداسيات");
  await page.reload();
  await expect(page.locator("#mission-title")).toHaveText("بوابة السداسيات");
  await page.getByRole("button",{name:"سدس واحد",exact:true}).tap();
  await expect(page.locator("#feedback")).toContainText("نحتاج ٢");
  await page.getByRole("button",{name:"ثلث",exact:true}).tap();
  await expect(page.locator("#shell-board")).toHaveAccessibleName("٥ من ٦");
  await page.locator("#next-gate").tap();
  await expect(page.locator("#mission-title")).toHaveText("بوابة الأثمان");
  await page.getByRole("button",{name:"ثلاثة أثمان",exact:true}).tap();
  await expect(page.locator("#feedback")).toContainText("أكملت رحلة المرجان");
  await expect(page.locator("#shell-board")).toHaveAccessibleName("٥ من ٨");
  await expect(page.locator("#next-gate")).toBeHidden();
  await page.locator("#restart").tap();
  await expect(page.locator("#mission-title")).toHaveText("بوابة الأرباع");
});
