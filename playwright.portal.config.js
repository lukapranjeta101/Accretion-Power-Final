import { defineConfig } from '@playwright/test';
const databasePath = process.env.PORTAL_TEST_DATABASE ||= `var/portal-e2e-${Date.now()}.sqlite`;
export default defineConfig({
    testDir: './tests', testMatch: 'portal.spec.js', workers: 1, timeout: 60000,
    use: {
        baseURL: 'http://localhost:5418', viewport: { width: 1440, height: 1000 },
        launchOptions: process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {},
        screenshot: 'only-on-failure', trace: 'retain-on-failure',
    },
    webServer: {
        command: process.env.PORTAL_STATIC ? 'node server/index.js' : 'node server/index.js --dev', url: 'http://localhost:5418/api/me', reuseExistingServer: false,
        env: { APP_BASE_URL: 'http://localhost:5418', PORT: '5418', DATABASE_PATH: databasePath, ACCOUNT_APPROVAL_EMAIL: 'admin-browser@example.test', SMTP_PORT: '1026' },
    },
});
