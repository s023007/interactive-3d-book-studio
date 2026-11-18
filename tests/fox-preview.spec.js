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
  await expect(page.locator("#speak")).toBeDisabled();
  await page.screenshot({path:info.outputPath("fox-mobile.png")});
  await page.locator("#walk").tap();
  await expect(page.locator("#walk")).toHaveAttribute("aria-pressed","true");
  await page.locator("#walk").tap();
  await expect(page.locator("#walk")).toHaveAttribute("aria-pressed","false");
  await page.reload();
  await expect(page.locator("#status")).toContainText("الثعلب جاهز");
  const still = await page.locator("#character").screenshot();
  await page.locator("#recording").setInputFiles({name:"test-tone.wav", mimeType:"audio/wav", buffer:testTone()});
  await page.locator("#speak").tap();
  await expect(page.locator("#status")).toContainText("يتحرك الفك");
  await expect.poll(async () => !still.equals(await page.locator("#character").screenshot())).toBe(true);
  await expect(page.locator("#speak")).toBeEnabled();
  await expect(page.locator("#status")).toContainText("انتهى التسجيل");
});
