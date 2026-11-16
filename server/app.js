import express from 'express';
import { randomUUID } from 'node:crypto';
import { transaction } from './database.js';
import { token, hash, passwordHash, passwordMatches, fail, string, email, password, publicUser } from './security.js';
import { catalog, catalogVersion, disclaimer } from './catalog.js';
import { queueMail } from './mail.js';
import { ensureAdminInvitation } from './admin-invitation.js';

const hour = 3600000;
export async function createApp(db, config) {
    const app = express();
    app.disable('x-powered-by');
    const dummyPassword = await passwordHash(token());
    const cookieName = config.production ? '__Host-ap_session' : 'ap_session';
    const cookieOptions = { httpOnly: true, secure: config.production, sameSite: 'lax', path: '/' };
    app.use((req, res, next) => {
        res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' });
        if (config.production) res.set('Strict-Transport-Security', 'max-age=31536000');
        next();
    });
    function limit(key, max, duration) {
        const now = Date.now();
        db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').run(now);
        db.prepare(`INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?)
            ON CONFLICT(key) DO UPDATE SET count=count+1`).run(hash(key), now + duration);
        if (db.prepare('SELECT count FROM rate_limits WHERE key=?').get(hash(key)).count > max) fail(429, 'Too many attempts. Please try again later.');
    }
    app.use('/api', (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        try {
            limit(`api:${req.ip}`, 300, 60000);
            if (!['GET', 'HEAD'].includes(req.method)) {
                if (req.headers.origin !== config.baseUrl || req.headers['x-requested-with'] !== 'AccretionPortal') fail(403, 'Request origin could not be verified. Refresh the page and try again.');
                if (!req.is('application/json')) fail(415, 'Use a JSON request.');
            }
            next();
        } catch (error) { next(error); }
    });
    app.use(express.json({ limit: '32kb' }));
    app.use((req, res, next) => {
        const value = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
        if (value && /^[a-f0-9]{64}$/.test(value)) {
            req.sessionHash = hash(value);
            req.user = db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.hash=? AND sessions.expires_at>?').get(req.sessionHash, Date.now());
        }
        next();
    });
    const authenticated = (req, res, next) => { if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' }); next(); };
    const approved = (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' });
        if (!req.user.verified_at || req.user.approval !== 'approved') return res.status(403).json({ error: 'Email verification and approved access are both required.' });
        next();
    };
    const admin = (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' });
        if (!req.user.verified_at || req.user.approval !== 'approved' || req.user.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' });
        next();
    };
    function createSession(res, userId, oldHash) {
        if (oldHash) db.prepare('DELETE FROM sessions WHERE hash=?').run(oldHash);
        const raw = token();
        db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(raw), userId, Date.now() + 12 * hour);
        res.cookie(cookieName, raw, { ...cookieOptions, maxAge: 12 * hour });
    }
    function issueToken(user, purpose) {
        const raw = token();
        db.prepare('DELETE FROM tokens WHERE user_id=? AND purpose=?').run(user.id, purpose);
        db.prepare('INSERT INTO tokens VALUES (?,?,?,?)').run(hash(raw), user.id, purpose, Date.now() + (purpose === 'reset' ? hour : 24 * hour));
        const page = purpose === 'reset' ? 'reset-password' : 'verify-email';
        queueMail(db, user.email, purpose === 'reset' ? 'Reset your Accretion Power password' : 'Verify your Accretion Power email',
            `Hello ${user.name},\n\n${purpose === 'reset' ? 'Set a new password' : 'Verify your email address'}: ${config.baseUrl}/${page}.html#token=${raw}\n\nThis link expires in ${purpose === 'reset' ? '1 hour' : '24 hours'}. Email verification does not approve account access. If you did not request this, you can ignore this email.`);
    }
    function readToken(raw, purpose) {
        if (typeof raw !== 'string' || !/^[a-f0-9]{64}$/.test(raw)) fail(400, 'This link is invalid or expired. Request a new one.');
        const found = db.prepare('SELECT * FROM tokens WHERE hash=? AND purpose=? AND expires_at>?').get(hash(raw), purpose, Date.now());
        if (!found) fail(400, 'This link is invalid or expired. Request a new one.');
        return found;
    }
    function authLimit(req, identity = '') {
        limit(`auth-ip:${req.ip}`, 40, 15 * 60000);
        if (identity) limit(`auth-email:${identity}`, 12, 15 * 60000);
    }
    app.get('/api/me', (req, res) => res.json({ user: req.user ? {
        ...publicUser(req.user),
        canSetupAdmin: req.user.email === config.approvalEmail.trim().toLowerCase()
            && !db.prepare('SELECT completed_at FROM admin_setup WHERE id=1').get()?.completed_at
            && !db.prepare("SELECT id FROM users WHERE role='admin'").get(),
    } : null }));
    app.post('/api/auth/admin-invitation', authenticated, (req, res) => {
        authLimit(req, req.user.email);
        if (req.user.email === config.approvalEmail.trim().toLowerCase()) ensureAdminInvitation(db, config, true);
        res.json({ message: 'If this account is eligible for administrator setup, a new invitation has been sent to the configured administrator mailbox.' });
    });
    app.post('/api/auth/claim-admin', authenticated, (req, res) => {
        authLimit(req, req.user.email);
        transaction(db, () => {
            const invitation = db.prepare('SELECT * FROM admin_setup WHERE id=1').get();
            if (!invitation || invitation.completed_at || invitation.expires_at <= Date.now()
                || typeof req.body?.token !== 'string' || !/^[a-f0-9]{64}$/.test(req.body.token)
                || hash(req.body.token) !== invitation.hash) fail(400, 'This administrator invitation is invalid, expired, or already used.');
            if (!req.user.verified_at || req.user.email !== invitation.recipient
                || req.user.email !== config.approvalEmail.trim().toLowerCase()) fail(403, 'Sign in with the verified email address that received this administrator invitation.');
            if (db.prepare("SELECT id FROM users WHERE role='admin'").get()) fail(409, 'An administrator has already been configured.');
            db.prepare("UPDATE users SET role='admin',approval='approved' WHERE id=?").run(req.user.id);
            db.prepare('UPDATE admin_setup SET hash=NULL,completed_at=? WHERE id=1').run(Date.now());
            db.prepare('DELETE FROM sessions WHERE user_id=?').run(req.user.id);
            db.prepare('INSERT INTO audit(actor_id,action,target_id,created_at) VALUES (?,?,?,?)').run(req.user.id, 'owner.admin.setup', req.user.id, Date.now());
            queueMail(db, req.user.email, 'Your Accretion Power administrator account is ready',
                `Administrator setup is complete. Review account requests at ${config.baseUrl}/admin.html. Each application requires an explicit approval or rejection.`);
        });
        createSession(res, req.user.id);
        res.json({ message: 'Administrator access enabled. You can now approve or reject account applications.' });
    });
    app.post('/api/auth/register', async (req, res) => {
        authLimit(req);
        const data = req.body || {};
        const address = email(data.email);
        const name = string(data.name, 'Full name', 2, 120);
        const company = string(data.company, 'Company', 2, 160);
        const reason = string(data.reason, 'Reason for access', 10, 2000);
        const website = string(data.website, 'Company website', 5, 300);
        let url; try { url = new URL(website); } catch { fail(400, 'Enter a complete company website, including https://.'); }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail(400, 'Enter a valid company website.');
        const encoded = await passwordHash(password(data.password, data.confirmPassword));
        if (db.prepare('SELECT id FROM users WHERE email=?').get(address)) return res.status(409).json({ error: 'Unable to register this email. Try signing in or resetting your password.' });
        const user = { id: randomUUID(), name, company, email: address, website, reason };
        transaction(db, () => {
            db.prepare('INSERT INTO users (id,name,company,email,website,reason,password_hash,created_at) VALUES (?,?,?,?,?,?,?,?)')
                .run(user.id, name, company, address, website, reason, encoded, Date.now());
            issueToken(user, 'verify');
            queueMail(db, config.approvalEmail, 'Accretion Power — access application for review',
                `A new application requires your review.\n\nName: ${name}\nCompany: ${company}\nWork email: ${address}\nWebsite: ${website}\nReason: ${reason}\n\nReview Application: ${config.baseUrl}/admin.html?application=${user.id}\n\nSign in as an administrator, then explicitly approve or reject the application. Opening this link never approves access.`);
        });
        createSession(res, user.id, req.sessionHash);
        res.status(201).json({ message: 'Application received. Check your email to verify your address. Accretion Power must also review and approve your application.' });
    });
    app.post('/api/auth/login', async (req, res) => {
        const address = email(req.body?.email); authLimit(req, address);
        const supplied = req.body?.password;
        if (typeof supplied !== 'string' || !supplied.length || supplied.length > 128) fail(400, 'Enter your password.');
        const user = db.prepare('SELECT * FROM users WHERE email=?').get(address);
        const valid = await passwordMatches(supplied, user?.password_hash || dummyPassword);
        if (!user || !valid) fail(401, 'Email or password is incorrect.');
        createSession(res, user.id, req.sessionHash);
        res.json({ user: publicUser(user) });
    });
    app.post('/api/auth/logout', (req, res) => {
        if (req.sessionHash) db.prepare('DELETE FROM sessions WHERE hash=?').run(req.sessionHash);
        res.clearCookie(cookieName, cookieOptions).json({ message: 'Signed out.' });
    });
    app.post('/api/auth/verify', (req, res) => {
        authLimit(req);
        transaction(db, () => {
            const found = readToken(req.body?.token, 'verify');
            db.prepare('UPDATE users SET verified_at=? WHERE id=?').run(Date.now(), found.user_id);
            db.prepare('DELETE FROM tokens WHERE user_id=? AND purpose=?').run(found.user_id, 'verify');
        });
        res.json({ message: 'Email verified. Administrator approval is still required before you can configure an estimate.' });
    });
    app.post('/api/auth/resend-verification', authenticated, (req, res) => {
        authLimit(req, req.user.email);
        if (!req.user.verified_at) transaction(db, () => issueToken(req.user, 'verify'));
        res.json({ message: 'If your email needs verification, a new link has been queued for delivery.' });
    });
    app.post('/api/auth/forgot-password', (req, res) => {
        const address = email(req.body?.email); authLimit(req, address);
        const user = db.prepare('SELECT * FROM users WHERE email=?').get(address);
        if (user) transaction(db, () => issueToken(user, 'reset'));
        res.json({ message: 'If an account exists for this email, a reset link has been queued for delivery.' });
    });
    app.post('/api/auth/reset-password', async (req, res) => {
        authLimit(req);
        readToken(req.body?.token, 'reset');
        const encoded = await passwordHash(password(req.body?.password, req.body?.confirmPassword));
        transaction(db, () => {
            const found = readToken(req.body?.token, 'reset');
            db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(encoded, found.user_id);
            db.prepare('DELETE FROM tokens WHERE user_id=? AND purpose=?').run(found.user_id, 'reset');
            db.prepare('DELETE FROM sessions WHERE user_id=?').run(found.user_id);
        });
        res.clearCookie(cookieName, cookieOptions).json({ message: 'Password updated. Sign in with your new password.' });
    });
    function calculate(body) {
        if (body.catalogVersion !== catalogVersion) fail(409, 'Sample prices have changed. Refresh the configurator before submitting.');
        if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) fail(400, 'Select between 1 and 50 items.');
        const seen = new Set();
        const items = body.items.map(item => {
            const product = catalog.find(p => p.partNumber === item?.partNumber);
            if (!product || seen.has(item.partNumber)) fail(400, 'Select valid, distinct part numbers.');
            seen.add(item.partNumber);
            if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100000) fail(400, 'Quantities must be whole numbers from 1 to 100,000.');
            return { ...product, quantity: item.quantity, lineTotalCents: product.unitPriceCents * item.quantity };
        });
        const subtotalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
        return { catalogVersion, items, subtotalCents, estimatedTotalCents: subtotalCents, currency: 'USD',
            samplePricing: true, disclaimer, shipping: 'Requires confirmation', taxes: 'Require confirmation',
            inventory: 'Simulated — stock must be confirmed by Accretion Power',
            quoteDelivery: 'Simulated for testing. No final quote or order has been issued.' };
    }
    app.get('/api/catalog', approved, (req, res) => res.json({ catalogVersion, items: catalog, disclaimer }));
    app.post('/api/estimates/preview', approved, (req, res) => res.json(calculate(req.body || {})));
    const quoteView = row => ({ id: row.id, status: row.status, snapshot: JSON.parse(row.snapshot), createdAt: row.created_at, updatedAt: row.updated_at });
    app.post('/api/estimates', approved, (req, res) => {
        const requestKey = string(req.body?.requestKey, 'Submission reference', 16, 80);
        const existing = db.prepare('SELECT * FROM quotes WHERE user_id=? AND request_key=?').get(req.user.id, requestKey);
        if (existing) return res.json(quoteView(existing));
        const estimate = calculate(req.body || {});
        const notes = string(req.body?.notes ?? '', 'Notes', 0, 5000);
        const project = string(req.body?.project, 'Project name', 2, 200);
        const id = randomUUID(), now = Date.now();
        const snapshot = { ...estimate, project, notes, submittedAt: now,
            customer: { id: req.user.id, name: req.user.name, company: req.user.company, email: req.user.email, website: req.user.website } };
        transaction(db, () => {
            db.prepare('INSERT INTO quotes (id,user_id,request_key,snapshot,created_at,updated_at) VALUES (?,?,?,?,?,?)')
                .run(id, req.user.id, requestKey, JSON.stringify(snapshot), now, now);
            queueMail(db, config.approvalEmail, '[SIMULATED] Estimate submitted', `Estimate ${id} for ${req.user.company}. Review: ${config.baseUrl}/admin.html?quote=${id}`, 'quote');
            queueMail(db, req.user.email, '[SIMULATED] Estimate received', `Estimate ${id} received. This is a testing simulation; no quote email was sent.`, 'quote');
        });
        res.status(201).json(quoteView(db.prepare('SELECT * FROM quotes WHERE id=?').get(id)));
    });
    app.get('/api/estimates', authenticated, (req, res) => res.json({ requests: db.prepare('SELECT * FROM quotes WHERE user_id=? ORDER BY created_at DESC LIMIT 200').all(req.user.id).map(quoteView) }));
    app.get('/api/estimates/:id', authenticated, (req, res) => {
        const row = db.prepare('SELECT * FROM quotes WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
        if (!row) fail(404, 'Request not found.');
        res.json(quoteView(row));
    });
    app.get('/api/admin/applications', admin, (req, res) => res.json({ applications: db.prepare("SELECT * FROM users WHERE role='customer' ORDER BY created_at DESC LIMIT 500").all().map(publicUser) }));
    app.post('/api/admin/applications/:id', admin, (req, res) => {
        const state = req.body?.status;
        if (!['approved', 'rejected', 'revoked'].includes(state)) fail(400, 'Choose approve, reject, or revoke.');
        const user = db.prepare("SELECT * FROM users WHERE id=? AND role='customer'").get(req.params.id);
        if (!user) fail(404, 'Application not found.');
        if (req.body.previousStatus !== user.approval) fail(409, 'This application changed. Refresh before reviewing.');
        if (state === user.approval || (state === 'revoked' && user.approval !== 'approved') || (state === 'rejected' && user.approval !== 'pending')) fail(400, 'This change is not available for the current account status.');
        transaction(db, () => {
            db.prepare('UPDATE users SET approval=? WHERE id=?').run(state, user.id);
            db.prepare('INSERT INTO audit(actor_id,action,target_id,created_at) VALUES (?,?,?,?)').run(req.user.id, `access.${state}`, user.id, Date.now());
            queueMail(db, user.email, `Accretion Power access ${state}`,
                `Hello ${user.name},\n\nYour access request has been ${state}.${state === 'approved' ? ' You must also verify your email before accessing the quote configurator.' : ' Contact Accretion Power if you have questions.'}\n\nView your account: ${config.baseUrl}/account.html`);
        });
        res.json({ message: `Access ${state}. Notification queued.` });
    });
    app.get('/api/admin/estimates', admin, (req, res) => res.json({ requests: db.prepare('SELECT * FROM quotes ORDER BY created_at DESC LIMIT 500').all().map(quoteView) }));
    app.post('/api/admin/estimates/:id', admin, (req, res) => {
        const transitions = { submitted: ['in_review', 'closed'], in_review: ['awaiting_customer', 'final_quote_simulated', 'closed'], awaiting_customer: ['in_review', 'final_quote_simulated', 'closed'], final_quote_simulated: ['in_review', 'closed'], closed: ['in_review'] };
        const row = db.prepare('SELECT * FROM quotes WHERE id=?').get(req.params.id);
        if (!row) fail(404, 'Request not found.');
        if (row.status !== req.body?.previousStatus) fail(409, 'This request changed. Refresh before updating.');
        if (!transitions[row.status]?.includes(req.body?.status)) fail(400, 'Choose a valid next status.');
        transaction(db, () => {
            db.prepare('UPDATE quotes SET status=?,updated_at=? WHERE id=?').run(req.body.status, Date.now(), row.id);
            db.prepare('INSERT INTO audit(actor_id,action,target_id,created_at) VALUES (?,?,?,?)').run(req.user.id, `estimate.${req.body.status}`, row.id, Date.now());
            queueMail(db, JSON.parse(row.snapshot).customer.email, '[SIMULATED] Estimate status update',
                `Estimate ${row.id}: ${req.body.status}. Final quote delivery is simulated. Ben or a designated representative must confirm stock and discuss a final quote privately.`, 'quote');
        });
        res.json({ message: 'Status updated. Quote notification simulated; no email sent.' });
    });
    app.get('/api/admin/mail', admin, (req, res) => res.json({ messages: db.prepare('SELECT id,recipient,subject,kind,state,attempts,created_at,sent_at FROM outbox ORDER BY created_at DESC LIMIT 100').all() }));
    app.post('/api/admin/mail/:id/retry', admin, (req, res) => {
        const result = db.prepare("UPDATE outbox SET state='pending',attempts=0,next_attempt=? WHERE id=? AND state='failed' AND kind='account'").run(Date.now(), req.params.id);
        if (!result.changes) fail(400, 'Only failed account emails can be retried.');
        res.json({ message: 'Email queued for retry.' });
    });
    app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
    // Protect HTML at the server too; every data API independently enforces authorization.
    app.use((req, res, next) => {
        const path = req.path.toLowerCase();
        if (/^\/(sign-in|request-access|forgot-password|reset-password|verify-email|admin-setup|account|quote|requests|admin)\.html$/.test(path)) {
            res.set('Cache-Control', 'no-store');
            if (config.production) res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
        }
        if (['/account.html', '/quote.html', '/requests.html', '/admin.html'].includes(path)) {
            res.set('Cache-Control', 'no-store');
            if (!req.user) return res.redirect(`/sign-in.html?next=${encodeURIComponent(req.originalUrl.slice(1))}`);
            if (path === '/admin.html' && (req.user.role !== 'admin' || !req.user.verified_at || req.user.approval !== 'approved')) return res.status(403).send('Administrator access required.');
            if (path === '/quote.html' && (!req.user.verified_at || req.user.approval !== 'approved')) return res.redirect('/account.html');
        }
        next();
    });
    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);
        const status = error.status || 500;
        if (status >= 500) console.error('Request failed:', error.code || error.name);
        res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : error.type === 'entity.parse.failed' ? 'Invalid JSON request.' : error.message });
    });
    return app;
}
