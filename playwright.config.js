import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests', testIgnore: ['**/server/**', '**/portal.spec.js'], timeout: 45_000, expect: { timeout: 15_000 }, workers: 1,
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5191',
        browserName: 'chromium', viewport: { width: 1440, height: 1000 },
        launchOptions: process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {},
        screenshot: 'only-on-failure', trace: 'retain-on-failure',
    },
});
