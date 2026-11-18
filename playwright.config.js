const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: {
      executablePath: process.env.WARRAQ_CHROMIUM || undefined,
      args: ['--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: 'npm run serve',
    url: 'http://127.0.0.1:4173/adventure.html',
  },
});
