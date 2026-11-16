import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/database.js';
import { mailer } from '../../server/mail.js';
import { hash } from '../../server/security.js';
import { configuration } from '../../server/config.js';

async function setup(t) {
    const dir = mkdtempSync(join(tmpdir(), 'accretion-test-'));
    const db = openDatabase(join(dir, 'accounts.sqlite'));
    const config = { ...configuration({}), baseUrl: 'http://localhost', approvalEmail: 'lukapranjeta18@gmail.com' };
    const app = await createApp(db, config);
    const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`;
    t.after(async () => { server.closeAllConnections(); await new Promise(r => server.close(r)); db.close(); rmSync(dir, { recursive: true, force: true }); });
    async function request(path, data, cookie, overrides = {}) {
        const response = await fetch(`${origin}${path}`, { redirect: 'manual', method: data === undefined ? 'GET' : 'POST',
            headers: { Origin: config.baseUrl, 'X-Requested-With': 'AccretionPortal', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...overrides },
            ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
        const text = await response.text();
        let body; try { body = JSON.parse(text); } catch { body = text; }
        return { status: response.status, body, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
    }
    const application = address => ({ name: 'Test Customer', company: 'Test Utility', email: address, website: 'https://example.com', reason: 'Sourcing components for new switchgear.', password: 'Long sample password 123!', confirmPassword: 'Long sample password 123!' });
    async function register(address) {
        const response = await request('/api/auth/register', application(address));
        assert.equal(response.status, 201, JSON.stringify(response.body));
        const user = db.prepare('SELECT * FROM users WHERE email=?').get(address);
        const row = db.prepare("SELECT body FROM outbox WHERE recipient=? AND subject LIKE 'Verify%' ORDER BY created_at DESC").get(address);
        return { ...response, user, token: row.body.match(/token=([a-f0-9]+)/)[1] };
    }
    async function administrator() {
        const a = await register('admin@example.com');
        await request('/api/auth/verify', { token: a.token });
        db.prepare("UPDATE users SET role='admin',approval='approved' WHERE id=?").run(a.user.id);
        return a;
    }
    return { db, config, request, register, administrator, application };
}

test('registration, verification and explicit administrator approval are separate; revocation takes effect immediately', async t => {
    const { db, request, register, administrator } = await setup(t);
    const admin = await administrator();
    const applicant = await register('customer@example.com');
    assert.notEqual(applicant.user.password_hash, 'Long sample password 123!');
    assert.match(applicant.cookie, /^ap_session=[a-f0-9]{64}$/);
    assert.match(applicant.headers.get('set-cookie'), /HttpOnly/);
    assert.match(applicant.headers.get('set-cookie'), /SameSite=Lax/i);
    const session = db.prepare('SELECT hash FROM sessions WHERE user_id=?').get(applicant.user.id);
    assert.equal(session.hash, hash(applicant.cookie.split('=')[1]));
    assert.equal((await request('/api/catalog', undefined, applicant.cookie)).status, 403);
    const mail = db.prepare("SELECT * FROM outbox WHERE recipient=? AND body LIKE ?").get('lukapranjeta18@gmail.com', `%${applicant.user.id}%`);
    assert.match(mail.body, /Review Application:/); assert.match(mail.body, /Test Utility/);
    assert.equal((await request(`/admin.html?application=${applicant.user.id}`)).status, 302);
    assert.equal(db.prepare('SELECT approval FROM users WHERE id=?').get(applicant.user.id).approval, 'pending');
    assert.equal((await request(`/api/admin/applications/${applicant.user.id}`, { status: 'approved', previousStatus: 'pending' }, applicant.cookie)).status, 403);
    assert.equal((await request(`/api/admin/applications/${applicant.user.id}`, { status: 'approved', previousStatus: 'pending' }, admin.cookie)).status, 200);
    assert.equal((await request('/api/catalog', undefined, applicant.cookie)).status, 403, 'approval alone must not unlock quote access');
    assert.equal((await request('/api/auth/verify', { token: applicant.token })).status, 200);
    assert.equal((await request('/api/auth/verify', { token: applicant.token })).status, 400, 'token must be single-use');
    assert.equal((await request('/api/catalog', undefined, applicant.cookie)).status, 200);
    assert.equal((await request(`/api/admin/applications/${applicant.user.id}`, { status: 'revoked', previousStatus: 'approved' }, admin.cookie)).status, 200);
    assert.equal((await request('/api/catalog', undefined, applicant.cookie)).status, 403);
    assert.equal((await request('/quote.html', undefined, applicant.cookie)).headers.get('location'), '/account.html');
    const verifiedOnly = await register('verified@example.com');
    await request('/api/auth/verify', { token: verifiedOnly.token });
    assert.equal((await request('/api/catalog', undefined, verifiedOnly.cookie)).status, 403, 'verification alone must not unlock quote access');
    await request(`/api/admin/applications/${verifiedOnly.user.id}`, { status: 'rejected', previousStatus: 'pending' }, admin.cookie);
    assert.ok(db.prepare("SELECT id FROM outbox WHERE recipient=? AND subject='Accretion Power access rejected'").get(verifiedOnly.user.email));
    assert.ok(db.prepare("SELECT id FROM outbox WHERE recipient=? AND subject='Accretion Power access approved'").get(applicant.user.email));
});

test('server owns prices; quantities, snapshots, ownership, status and duplicate submissions are enforced', async t => {
    const { db, request, register, administrator } = await setup(t);
    const admin = await administrator(), a = await register('a@example.com'), b = await register('b@example.com');
    await request('/api/auth/verify', { token: a.token });
    await request(`/api/admin/applications/${a.user.id}`, { status: 'approved', previousStatus: 'pending' }, admin.cookie);
    assert.equal((await request('/api/catalog')).status, 401);
    const catalog = (await request('/api/catalog', undefined, a.cookie)).body;
    const product = catalog.items[0];
    assert.equal(JSON.stringify(catalog).includes('password'), false);
    const input = { catalogVersion: catalog.catalogVersion, items: [{ partNumber: product.partNumber, quantity: 3, unitPriceCents: 1 }], subtotalCents: 1, estimatedTotalCents: 1, project: 'New substation', notes: '<script>test</script>', requestKey: 'test-submission-key-001' };
    for (const quantity of [0, -1, 1.5, '2', null, 100001]) {
        const result = await request('/api/estimates/preview', { ...input, items: [{ partNumber: product.partNumber, quantity }] }, a.cookie);
        assert.equal(result.status, 400);
    }
    assert.equal((await request('/api/estimates/preview', { ...input, items: [input.items[0], input.items[0]] }, a.cookie)).status, 400);
    assert.equal((await request('/api/estimates/preview', { ...input, catalogVersion: 'old' }, a.cookie)).status, 409);
    const submitted = await request('/api/estimates', input, a.cookie);
    assert.equal(submitted.status, 201);
    assert.equal(submitted.body.snapshot.estimatedTotalCents, product.unitPriceCents * 3);
    assert.equal(submitted.body.snapshot.customer.id, a.user.id);
    assert.equal((await request('/api/estimates', input, a.cookie)).body.id, submitted.body.id);
    assert.equal(db.prepare('SELECT count(*) AS n FROM quotes').get().n, 1);
    assert.equal((await request(`/api/estimates/${submitted.body.id}`, undefined, b.cookie)).status, 404);
    assert.deepEqual((await request('/api/estimates', undefined, b.cookie)).body.requests, []);
    assert.equal((await request('/api/admin/estimates', undefined, a.cookie)).status, 403);
    assert.throws(() => db.prepare('UPDATE quotes SET snapshot=? WHERE id=?').run('{}', submitted.body.id), /immutable/);
    const oldSnapshot = db.prepare('SELECT snapshot FROM quotes').get().snapshot;
    db.prepare("UPDATE users SET company='Renamed Company' WHERE id=?").run(a.user.id);
    assert.equal((await request(`/api/admin/estimates/${submitted.body.id}`, { status: 'in_review', previousStatus: 'submitted' }, admin.cookie)).status, 200);
    assert.equal((await request(`/api/admin/estimates/${submitted.body.id}`, { status: 'closed', previousStatus: 'submitted' }, admin.cookie)).status, 409);
    assert.equal((await request(`/api/admin/estimates/${submitted.body.id}`, { status: 'final_quote_simulated', previousStatus: 'in_review' }, admin.cookie)).status, 200);
    assert.equal(db.prepare('SELECT snapshot FROM quotes').get().snapshot, oldSnapshot);
    assert.ok(db.prepare("SELECT count(*) AS n FROM outbox WHERE kind='quote' AND state='simulated'").get().n >= 3);
});

test('password recovery uses expiring single-use tokens and revokes existing sessions', async t => {
    const { db, request, register, application } = await setup(t);
    const a = await register('reset@example.com');
    const generic = await request('/api/auth/forgot-password', { email: a.user.email });
    assert.deepEqual((await request('/api/auth/forgot-password', { email: 'missing@example.com' })).body, generic.body);
    const raw = db.prepare("SELECT body FROM outbox WHERE recipient=? AND subject LIKE 'Reset%'").get(a.user.email).body.match(/token=([a-f0-9]+)/)[1];
    const input = { token: raw, password: 'Replacement password 123!', confirmPassword: 'Replacement password 123!' };
    assert.equal((await request('/api/auth/reset-password', { ...input, confirmPassword: 'different' })).status, 400);
    assert.equal((await request('/api/auth/reset-password', input)).status, 200);
    assert.equal((await request('/api/me', undefined, a.cookie)).body.user, null);
    assert.equal((await request('/api/auth/reset-password', input)).status, 400);
    assert.equal((await request('/api/auth/login', application(a.user.email))).status, 401);
    assert.equal((await request('/api/auth/login', { email: a.user.email, password: input.password })).status, 200);
    await request('/api/auth/forgot-password', { email: a.user.email });
    db.prepare("UPDATE tokens SET expires_at=0 WHERE purpose='reset'").run();
    const newRaw = db.prepare("SELECT body FROM outbox WHERE recipient=? AND subject LIKE 'Reset%' ORDER BY created_at DESC").get(a.user.email).body.match(/token=([a-f0-9]+)/)[1];
    assert.equal((await request('/api/auth/reset-password', { ...input, token: newRaw })).status, 400);
});

test('cross-origin writes, privilege injection and brute force are blocked', async t => {
    const { request, register, application } = await setup(t);
    assert.equal((await request('/api/auth/register', application('csrf@example.com'), null, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await request('/api/auth/login', {}, null, { 'X-Requested-With': '' })).status, 403);
    const injected = await request('/api/auth/register', { ...application('inject@example.com'), role: 'admin', approval: 'approved', verified_at: 1 });
    const me = (await request('/api/me', undefined, injected.cookie)).body.user;
    assert.equal(me.role, 'customer'); assert.equal(me.approval, 'pending'); assert.equal(me.verified, false);
    assert.equal((await request('/api/admin/mail', undefined, injected.cookie)).status, 403);
    let last;
    for (let i = 0; i < 13; i++) last = await request('/api/auth/login', { email: 'brute@example.com', password: 'incorrect password' });
    assert.equal(last.status, 429);
});

test('SMTP delivers verification, administrator review, reset and decision emails; simulated quote messages are not sent', async t => {
    const { db, config, request, register, administrator } = await setup(t);
    const received = [];
    const smtp = new SMTPServer({ authOptional: true, disabledCommands: ['AUTH','STARTTLS'], onData(stream, session, callback) {
        simpleParser(stream).then(mail => { received.push(mail); callback(); }).catch(callback);
    } });
    await new Promise(resolve => smtp.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(r => smtp.close(r)));
    const delivery = mailer(db, { ...config, smtpPort: smtp.server.address().port });
    t.after(() => delivery.close());
    const admin = await administrator(), a = await register('smtp@example.com');
    await request('/api/auth/forgot-password', { email: a.user.email });
    await request(`/api/admin/applications/${a.user.id}`, { status: 'approved', previousStatus: 'pending' }, admin.cookie);
    await delivery.flush();
    assert.ok(received.some(m => m.to.text === 'smtp@example.com' && m.subject.startsWith('Verify')));
    assert.ok(received.some(m => m.to.text === config.approvalEmail && m.text.includes('Review Application:')));
    assert.ok(received.some(m => m.subject.startsWith('Reset')));
    assert.ok(received.some(m => m.subject.endsWith('access approved')));
    assert.equal(db.prepare("SELECT count(*) AS n FROM outbox WHERE state='pending'").get().n, 0);
    assert.equal(db.prepare("SELECT count(*) AS n FROM outbox WHERE state='sent' AND body!=''").get().n, 0, 'erase token-containing email bodies after delivery');
});

test('persistent data survives reopening and production configuration fails closed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ap-persistence-'));
    const file = join(dir, 'accounts.sqlite');
    let db = openDatabase(file);
    db.prepare('INSERT INTO rate_limits VALUES (?, ?, ?)').run('persistent', 1, Date.now() + 60000);
    db.close(); db = openDatabase(file);
    assert.equal(db.prepare('SELECT count FROM rate_limits WHERE key=?').get('persistent').count, 1);
    db.close(); rmSync(dir, { recursive: true, force: true });
    assert.throws(() => configuration({ NODE_ENV: 'production' }), /Production requires/);
});

test('first administrator can accept an email invitation without a command; setup is restricted and single-use', async t => {
    const { ensureAdminInvitation } = await import('../../server/admin-invitation.js');
    const { db, config, request, register } = await setup(t);
    ensureAdminInvitation(db, config);
    const mail = db.prepare("SELECT * FROM outbox WHERE subject='Set up your Accretion Power administrator account'").get();
    assert.equal(mail.recipient, config.approvalEmail);
    const invitation = mail.body.match(/token=([a-f0-9]+)/)[1];
    assert.equal(db.prepare('SELECT hash FROM admin_setup').get().hash, hash(invitation));
    assert.equal(ensureAdminInvitation(db, config), false, 'startup must not send duplicate invitations');
    await request(`/admin-setup.html#token=${invitation}`);
    assert.equal(db.prepare("SELECT count(*) AS n FROM users WHERE role='admin'").get().n, 0);
    assert.equal((await request('/api/auth/claim-admin', { token: invitation })).status, 401);
    const outsider = await register('outsider@example.com');
    await request('/api/auth/verify', { token: outsider.token });
    assert.equal((await request('/api/auth/claim-admin', { token: invitation }, outsider.cookie)).status, 403);
    const owner = await register(config.approvalEmail);
    assert.equal((await request('/api/me', undefined, owner.cookie)).body.user.canSetupAdmin, true);
    assert.equal((await request('/api/auth/claim-admin', { token: invitation }, owner.cookie)).status, 403, 'email must also be verified');
    await request('/api/auth/verify', { token: owner.token });
    db.prepare('UPDATE admin_setup SET expires_at=0').run();
    assert.equal((await request('/api/auth/claim-admin', { token: invitation }, owner.cookie)).status, 400);
    await request('/api/auth/admin-invitation', {}, owner.cookie);
    const fresh = db.prepare("SELECT body FROM outbox WHERE subject='Set up your Accretion Power administrator account' ORDER BY created_at DESC").get().body.match(/token=([a-f0-9]+)/)[1];
    assert.notEqual(fresh, invitation);
    assert.equal((await request('/api/auth/claim-admin', { token: invitation }, owner.cookie)).status, 400);
    const accepted = await request('/api/auth/claim-admin', { token: fresh }, owner.cookie);
    assert.equal(accepted.status, 200);
    assert.equal((await request('/api/admin/applications', undefined, accepted.cookie)).status, 200);
    assert.equal((await request('/api/me', undefined, owner.cookie)).body.user, null, 'rotate sessions after privilege change');
    assert.equal((await request('/api/auth/claim-admin', { token: fresh }, accepted.cookie)).status, 400);
    assert.equal(db.prepare('SELECT hash FROM admin_setup').get().hash, null);
    db.prepare("UPDATE users SET role='customer',approval='revoked' WHERE id=?").run(owner.user.id);
    assert.equal(ensureAdminInvitation(db, config, true), false, 'completed bootstrap must never reopen after revocation');
});
