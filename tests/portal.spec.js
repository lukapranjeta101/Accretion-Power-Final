import { test, expect } from '@playwright/test';
import { openDatabase } from '../server/database.js';
const origin = 'http://localhost:5418';
const password = 'Browser testing passphrase 2026!';

test('customer registration, verification, admin review, estimate submission and revocation', async ({ page, browser }) => {
    const db = openDatabase(process.env.PORTAL_TEST_DATABASE);
    const suffix = Date.now();
    const email = `customer-${suffix}@example.test`;
    const adminEmail = 'admin-browser@example.test';
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
        await page.goto('/request-access.html');
        await page.getByLabel('Full name').fill('Browser Test Customer');
        await page.getByLabel('Company', { exact: true }).fill('Browser Test Utility');
        await page.getByLabel('Work email').fill(email);
        await page.getByLabel('Company website').fill('https://example.test');
        await page.getByLabel('Reason for requesting access').fill('Testing switchgear project sourcing.');
        await page.getByLabel('Password', { exact: true }).fill(password);
        await page.getByLabel('Confirm password').fill(password);
        await page.getByRole('button', { name: 'Request Access', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Your application is awaiting review.' })).toBeVisible();
        const customer = db.prepare('SELECT * FROM users WHERE email=?').get(email);
        const verification = db.prepare("SELECT body FROM outbox WHERE recipient=? AND subject LIKE 'Verify%'").get(email).body.match(/token=([a-f0-9]+)/)[1];
        await page.goto(`/verify-email.html#token=${verification}`);
        await page.getByRole('button', { name: 'Verify email', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Email verified', exact: true })).toBeVisible();
        await page.goto('/quote.html'); await expect(page).toHaveURL(/account.html/);
        const context = await browser.newContext({ baseURL: origin });
        const adminPage = await context.newPage();
        const response = await context.request.post('/api/auth/register', {
            headers: { Origin: origin, 'X-Requested-With': 'AccretionPortal' },
            data: { name: 'Browser Test Admin', company: 'Accretion Test', website: 'https://example.test', reason: 'Local administrator browser test.', email: adminEmail, password, confirmPassword: password },
        });
        expect(response.status()).toBe(201);
        const adminVerification = db.prepare("SELECT body FROM outbox WHERE recipient=? AND subject LIKE 'Verify%'").get(adminEmail).body.match(/token=([a-f0-9]+)/)[1];
        await adminPage.goto(`/verify-email.html#token=${adminVerification}`);
        await adminPage.getByRole('button', { name: 'Verify email', exact: true }).click();
        await expect(adminPage.getByRole('heading', { name: 'Email verified', exact: true })).toBeVisible();
        const setupInvitation = db.prepare("SELECT body FROM outbox WHERE subject='Set up your Accretion Power administrator account'").get().body.match(/token=([a-f0-9]+)/)[1];
        await adminPage.goto(`/admin-setup.html#token=${setupInvitation}`);
        expect(db.prepare('SELECT role FROM users WHERE email=?').get(adminEmail).role).toBe('customer');
        await adminPage.getByRole('button', { name: 'Enable administrator access', exact: true }).click();
        await expect(adminPage).toHaveURL(/admin.html/);
        await adminPage.goto(`/admin.html?application=${customer.id}`);
        await expect(adminPage.getByText(email, { exact: true }).first()).toBeVisible();
        await adminPage.locator(`[data-id="${customer.id}"][data-decision="approved"]`).click();
        await expect(adminPage.locator('#portal-feedback')).toContainText('Access approved');
        await page.goto('/quote.html');
        await page.getByLabel('Product / sample part number').selectOption('SAMPLE-EP-001');
        await page.getByRole('button', { name: 'Add product' }).click();
        await page.getByLabel('Quantity').fill('3');
        await page.getByLabel('Product / sample part number').selectOption('SAMPLE-CU-001');
        await page.getByRole('button', { name: 'Add product' }).click();
        await page.getByLabel('Project name').fill('Browser test substation');
        await page.getByLabel('Project details or notes').fill('Please confirm lead time and shipping.');
        await expect(page.locator('#totals')).toContainText('$269.00');
        await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
        await page.screenshot({ path: '/tmp/accretion-quote-desktop.png', fullPage: true });
        for (const width of [320, 390, 768]) {
            await page.setViewportSize({ width, height: 844 });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
        await page.screenshot({ path: '/tmp/accretion-quote-mobile.png', fullPage: true });
        await page.getByRole('button', { name: 'Submit Estimate for Review' }).click();
        await expect(page.locator('#portal-feedback')).toContainText('Estimate submitted for review');
        await expect(page.getByRole('cell', { name: '$144.00', exact: true })).toBeVisible();
        const row = db.prepare('SELECT * FROM quotes WHERE user_id=?').get(customer.id);
        await adminPage.goto(`/admin.html?quote=${row.id}`);
        await adminPage.locator(`#status-${row.id}`).selectOption('in_review');
        await adminPage.locator(`[data-request-id="${row.id}"]`).getByRole('button', { name: 'Update status' }).click();
        await expect(adminPage.locator('#portal-feedback')).toContainText('Status updated');
        await adminPage.goto(`/admin.html?application=${customer.id}`);
        await adminPage.locator(`[data-id="${customer.id}"][data-decision="revoked"]`).click();
        await expect(adminPage.locator('#portal-feedback')).toContainText('Access revoked');
        await page.goto('/quote.html'); await expect(page).toHaveURL(/account.html/);
        await expect(page.getByRole('heading', { name: 'Your quote access has been revoked.' })).toBeVisible();
        await page.goto('/requests.html'); await expect(page.getByText('Browser test substation', { exact: true })).toBeVisible();
        expect(errors).toEqual([]);
        await context.close();
    } finally { db.close(); }
});

test('auth pages fit phones and private server files cannot be served by Vite', async ({ page, request }) => {
    for (const path of ['sign-in', 'request-access', 'forgot-password', 'reset-password', 'verify-email', 'admin-setup']) {
        for (const width of [320, 390, 768, 1440]) {
            await page.setViewportSize({ width, height: 844 });
            await page.goto(`/${path}.html`);
            await expect(page.locator('#portal-content')).toHaveAttribute('aria-busy', 'false');
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/request-access.html');
    await page.screenshot({ path: '/tmp/accretion-register-mobile.png', fullPage: true });
    for (const path of ['/server/catalog.js', `/@fs/${process.cwd()}/server/catalog.js`, `/@fs/${process.cwd()}/${process.env.PORTAL_TEST_DATABASE}`]) {
        const response = await request.get(path);
        expect(response.status()).toBeGreaterThanOrEqual(400);
        expect(await response.text()).not.toContain('unitPriceCents');
    }
});

test('both localhost address families serve the account API, and non-JSON responses show a useful error', async ({ page, request }) => {
    for (const host of ['127.0.0.1', '[::1]']) {
        const response = await request.get(`http://${host}:5418/api/me`);
        expect(response.headers()['content-type']).toContain('application/json');
        expect(await response.json()).toEqual({ user: null });
    }
    await page.route('**/api/me', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>Old preview</html>' }));
    await page.goto('/sign-in.html');
    await expect(page.locator('#portal-feedback')).toContainText('Account services are unavailable at this address');
});
