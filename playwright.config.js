import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    { name: 'app', testMatch: 'app.spec.js' },
    { name: 'android', testMatch: 'android.spec.js', dependencies: ['app'] },
  ],
  use: {
    baseURL: 'http://localhost:3101',
    viewport: { width: 1440, height: 1000 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: existsSync(chrome) ? { executablePath: chrome } : {},
  },
  webServer: {
    command: 'node --disable-warning=ExperimentalWarning server/index.js --dev',
    url: 'http://localhost:3101/api/health',
    env: { PORT: '3101', BUKU_SERVIS_DB: ':memory:' },
    reuseExistingServer: false,
    timeout: 30000,
  },
});
