const page = document.body.dataset.portalPage;
const content = document.querySelector('#portal-content');
const feedback = document.querySelector('#portal-feedback');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const date = value => new Date(value).toLocaleString();
const names = { pending: 'Pending approval', approved: 'Approved', rejected: 'Rejected', revoked: 'Access revoked', submitted: 'Submitted', in_review: 'In review', awaiting_customer: 'Awaiting customer', final_quote_simulated: 'Final quote simulated', closed: 'Closed' };
const badge = state => `<span class="portal-status">${escape(names[state] || state)}</span>`;
const link = (href, text) => `<a class="portal-link" href="${href}">${text}</a>`;
const button = (text, extra = '', type = 'button') => `<button type="${type}" class="portal-btn" ${extra}>${text}</button>`;
const field = (name, label, type = 'text', extra = '', help = '') => `<div><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" required ${extra} ${help ? `aria-describedby="${name}-help"` : ''}>${help ? `<small id="${name}-help">${help}</small>` : ''}</div>`;
const passwordFields = () => field('password', 'Password', 'password', 'minlength="12" maxlength="128" autocomplete="new-password"', 'Use 12–128 characters. A long, unique passphrase works well.') + field('confirmPassword', 'Confirm password', 'password', 'minlength="12" maxlength="128" autocomplete="new-password"');
let user;
function message(text, error = false) {
    feedback.textContent = text;
    feedback.classList.toggle('error', error);
    if (text) feedback.focus({ preventScroll: true });
}
async function api(path, data) {
    const response = await fetch(`/api${path}`, { credentials: 'same-origin', cache: 'no-store',
        ...(data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'AccretionPortal' }, body: JSON.stringify(data) }) });
    if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Account services are unavailable at this address. Please open the main Accretion Power website and try again.');
    }
    const result = await response.json().catch(() => { throw new Error('Account services returned an incomplete response. Please try again.'); });
    if (!response.ok) {
        if (response.status === 401 && !['sign-in','request-access','forgot-password','reset-password','verify-email','admin-setup'].includes(page)) location.assign('sign-in.html');
        throw new Error(result.error || 'Please try again.');
    }
    return result;
}
function formSubmit(form, action) {
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const submit = form.querySelector('[type=submit]');
        if (submit.disabled) return;
        submit.disabled = true; message('');
        try { await action(Object.fromEntries(new FormData(form))); }
        catch (error) { message(error.message, true); }
        finally { submit.disabled = false; }
    });
}
function onClick(selector, action) {
    document.querySelectorAll(selector).forEach(el => el.addEventListener('click', async () => {
        el.disabled = true;
        try { await action(el); } catch (error) { message(error.message, true); }
        finally { el.disabled = false; }
    }));
}
function accountNav() {
    if (!user) return;
    const nav = document.querySelector('#portal-nav');
    nav.hidden = false;
    const links = [['account','Account'], ['quote','Build estimate'], ['requests','My requests']];
    if (user.role === 'admin') links.push(['admin','Administration']);
    nav.innerHTML = links.map(([slug, title]) => `<a href="${slug}.html" ${page === slug ? 'aria-current="page"' : ''}>${title}</a>`).join('') + '<button id="sign-out" class="portal-btn quiet">Sign out</button>';
    onClick('#sign-out', async () => { await api('/auth/logout', {}); location.assign('sign-in.html'); });
}
function authPage() {
    let fields, label;
    if (page === 'request-access') {
        fields = `<div class="portal-fields">${field('name','Full name','text','autocomplete="name" maxlength="120" minlength="2"')}${field('company','Company','text','autocomplete="organization" maxlength="160" minlength="2"')}</div>` +
            field('email','Work email','email','autocomplete="email" maxlength="254"') + field('website','Company website','url','autocomplete="url" maxlength="300" placeholder="https://company.com"') +
            '<div><label for="reason">Reason for requesting access</label><textarea id="reason" name="reason" required minlength="10" maxlength="2000" placeholder="Tell us about the components and projects you work on."></textarea></div>' + passwordFields();
        label = 'Request Access';
    } else if (page === 'sign-in') {
        fields = field('email','Work email','email','autocomplete="username"') + field('password','Password','password','autocomplete="current-password" maxlength="128"'); label = 'Sign In';
    } else if (page === 'forgot-password') {
        fields = field('email','Work email','email','autocomplete="email"'); label = 'Send reset link';
    } else if (page === 'reset-password') { fields = passwordFields(); label = 'Reset password'; }
    else { fields = '<p>Confirm ownership of your email address to complete the verification step.</p>'; label = 'Verify email'; }
    content.innerHTML = `<section class="portal-panel"><form class="portal-form">${fields}${button(label, '', 'submit')}</form><div class="portal-actions">${page === 'sign-in' ? `${link('request-access.html','Request access')} ${link('forgot-password.html','Forgot password?')}` : link('sign-in.html','Back to sign in')}</div>${page === 'request-access' ? '<div class="portal-note">After registering, verify your email and wait for Accretion Power to review your application. Registration does not grant quote access.</div>' : ''}</section>`;
    const rawToken = new URLSearchParams(location.hash.slice(1)).get('token');
    if (rawToken) history.replaceState(null, '', location.pathname);
    if (['reset-password','verify-email'].includes(page) && !rawToken) {
        message('This link is missing a verification token. Request a new link.', true);
        content.querySelector('[type=submit]').disabled = true;
        content.insertAdjacentHTML('beforeend', `<div class="portal-actions">${link(page === 'reset-password' ? 'forgot-password.html' : 'account.html', 'Request a new link')}</div>`);
    }
    formSubmit(content.querySelector('form'), async data => {
        if (page === 'request-access') { await api('/auth/register', data); location.assign('account.html?registered=1'); }
        if (page === 'sign-in') {
            const result = await api('/auth/login', data);
            const next = new URLSearchParams(location.search).get('next');
            const allowed = ['quote.html','requests.html','account.html','admin.html','admin-setup.html'];
            const destination = new URL(next || 'account.html', location.origin);
            const safeNext = destination.origin === location.origin && allowed.includes(destination.pathname.slice(1));
            location.assign(next && safeNext ? destination.pathname + destination.search : result.user.role === 'admin' ? 'admin.html' : 'account.html');
        }
        if (page === 'forgot-password') message((await api('/auth/forgot-password', data)).message);
        if (page === 'reset-password') { const result = await api('/auth/reset-password', { ...data, token: rawToken }); content.innerHTML = `<section class="portal-panel"><p>${escape(result.message)}</p><div class="portal-actions">${link('sign-in.html','Sign in')}</div></section>`; }
        if (page === 'verify-email') {
            const result = await api('/auth/verify', { token: rawToken });
            content.innerHTML = `<section class="portal-panel"><h2>Email verified</h2><p>${escape(result.message)}</p><div class="portal-actions"><a class="portal-btn" href="account.html">View account status</a></div></section>`;
        }
    });
}
function adminSetupPage() {
    const incoming = new URLSearchParams(location.hash.slice(1)).get('token');
    if (incoming && /^[a-f0-9]{64}$/.test(incoming)) {
        sessionStorage.setItem('ap-admin-invitation', incoming);
        history.replaceState(null, '', location.pathname);
    }
    const invitation = sessionStorage.getItem('ap-admin-invitation');
    if (user?.role === 'admin') {
        sessionStorage.removeItem('ap-admin-invitation');
        content.innerHTML = '<section class="portal-panel"><h2>Your administrator account is ready.</h2><a class="portal-btn" href="admin.html">Review applications</a></section>'; return;
    }
    content.innerHTML = `<section class="portal-panel"><h2>Approve accounts from your inbox</h2><p>Register or sign in with the email address that received this invitation, verify that address, then enable administrator access. New customer applications will arrive by email with a protected review link.</p>
        ${!user ? '<div class="portal-actions"><a class="portal-btn" href="sign-in.html?next=admin-setup.html">Sign in</a><a class="portal-btn quiet" href="request-access.html">Create your account</a></div><p>After verifying your account, return to this invitation to finish setup.</p>' : !user.verified ? '<div class="portal-note">Verify your email first. Then return to this page to finish administrator setup.</div><div class="portal-actions"><a class="portal-btn" href="account.html">Verify email / account status</a></div>' : !user.canSetupAdmin ? '<div class="portal-note">This account is not eligible for initial administrator setup. Sign in using the configured administrator email address, or contact your existing administrator.</div>' : `<p class="portal-note">Opening an email link never grants access automatically. Use the button below to confirm setup.</p><div class="portal-actions">${invitation ? button('Enable administrator access','id="claim-admin"') : ''}${button('Send a new setup invitation','id="resend-admin"')}</div>`}
        </section>`;
    onClick('#claim-admin', async () => {
        await api('/auth/claim-admin', { token: invitation });
        sessionStorage.removeItem('ap-admin-invitation'); location.assign('admin.html');
    });
    onClick('#resend-admin', async () => message((await api('/auth/admin-invitation', {})).message));
}
function accountPage() {
    const titles = { pending: 'Your application is awaiting review.', approved: user.verified ? 'You’re ready to build an estimate.' : 'Access approved. Verify your email next.', rejected: 'Your application was not approved.', revoked: 'Your quote access has been revoked.' };
    content.innerHTML = `<section class="portal-panel"><h2>${titles[user.approval]}</h2><p>${user.approval === 'pending' ? 'Accretion Power must review your company and application before granting access. We’ll email you when a decision is made. Verifying your email does not skip this review.' : user.approval === 'approved' ? 'Quotes use sample pricing for testing. Availability and final terms require confirmation with our team.' : 'You can still view your submitted requests. Contact Accretion Power if you have questions about this decision.'}</p>
        <dl class="portal-facts"><div><dt>Email verification</dt><dd>${user.verified ? 'Verified' : 'Check your inbox — verification required'}</dd></div><div><dt>Administrator approval</dt><dd>${badge(user.approval)}</dd></div><div><dt>Full name / company</dt><dd>${escape(user.name)}<br>${escape(user.company)}</dd></div><div><dt>Work email</dt><dd>${escape(user.email)}</dd></div></dl>
        <div class="portal-actions">${user.canSetupAdmin ? '<a class="portal-btn" href="admin-setup.html">Set up administrator access</a>' : ''}${!user.verified ? button('Resend verification email','id="resend"') : ''}${user.verified && user.approval === 'approved' ? '<a class="portal-btn" href="quote.html">Build an estimate</a>' : ''}<a class="portal-btn quiet" href="requests.html">View my requests</a><a class="portal-link" href="contact.html">Contact our team</a></div></section>`;
    onClick('#resend', async () => message((await api('/auth/resend-verification', {})).message));
}
const notice = '<div class="portal-note"><strong>Testing version · Sample pricing</strong><p>Pricing estimate only. Availability and final order details require confirmation from Accretion Power.</p><p>Shipping and taxes require confirmation and are not included. Inventory, quote emails, and final quote delivery are simulated.</p></div>';
async function quotePage() {
    const catalog = await api('/catalog');
    let items = [], revision = 0, requestKey = crypto.randomUUID(), timer, valid = false;
    content.innerHTML = `${notice}<form id="estimate-form"><div class="portal-quote-layout"><section class="portal-panel"><h2>Products & quantities</h2><div id="line-items"><p class="portal-empty">Add a product to start your estimate.</p></div><div class="portal-actions portal-product-picker"><div style="flex:1;min-width:0"><label for="part">Product / sample part number</label><select id="part"><option value="">Select a product</option>${catalog.items.map(p => `<option value="${escape(p.partNumber)}">${escape(p.name)} · ${escape(p.partNumber)}</option>`).join('')}</select></div>${button('Add product','id="add-product"')}</div><div class="portal-form" style="margin-top:32px">${field('project','Project name','text','minlength="2" maxlength="200"')}<div><label for="notes">Project details or notes (optional)</label><textarea id="notes" name="notes" maxlength="5000" placeholder="Application, drawings, timing, or other requirements"></textarea></div></div></section><aside class="portal-panel portal-summary"><h2>Estimate summary</h2><div id="totals"><p>Add products to calculate your estimate.</p></div><p id="calculation-status" role="status" aria-live="polite"></p><div class="portal-actions">${button('Submit Estimate for Review','id="submit-estimate" disabled','submit')}</div><small>Ben or a designated representative will confirm stock and discuss the final quote privately. This is not an order.</small></aside></div></form>`;
    const rows = document.querySelector('#line-items'), totals = document.querySelector('#totals'), submit = document.querySelector('#submit-estimate'), status = document.querySelector('#calculation-status');
    function renderRows() {
        rows.innerHTML = items.length ? items.map(item => {
            const product = catalog.items.find(p => p.partNumber === item.partNumber);
            return `<div class="portal-line"><div><h3>${escape(product.name)}</h3><small>${escape(product.partNumber)}</small><small>Simulated inventory — confirm availability</small><button type="button" data-remove="${product.partNumber}" aria-label="Remove ${escape(product.name)}">Remove</button></div><div><label for="qty-${product.partNumber}">Quantity</label><input type="number" id="qty-${product.partNumber}" data-quantity="${product.partNumber}" value="${item.quantity}" min="1" max="100000" step="1" required inputmode="numeric"></div><div class="portal-prices"><span>Sample unit price: ${money(product.unitPriceCents)}</span><strong data-total="${product.partNumber}">—</strong></div></div>`;
        }).join('') : '<p class="portal-empty">Add a product to start your estimate.</p>';
        rows.querySelectorAll('[data-quantity]').forEach(input => input.addEventListener('input', () => {
            items.find(item => item.partNumber === input.dataset.quantity).quantity = input.value === '' ? null : Number(input.value);
            changed();
        }));
        rows.querySelectorAll('[data-remove]').forEach(el => el.addEventListener('click', () => { items = items.filter(item => item.partNumber !== el.dataset.remove); renderRows(); changed(); }));
    }
    function changed() {
        requestKey = crypto.randomUUID(); valid = false; submit.disabled = true;
        const sequence = ++revision; clearTimeout(timer);
        totals.innerHTML = '<p>Recalculating…</p>'; status.textContent = '';
        rows.querySelectorAll('[data-total]').forEach(el => { el.textContent = '—'; });
        if (!items.length || items.some(item => !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100000)) {
            totals.innerHTML = '<p>Add products with whole-number quantities from 1 to 100,000.</p>'; return;
        }
        timer = setTimeout(async () => {
            try {
                const result = await api('/estimates/preview', { items, catalogVersion: catalog.catalogVersion });
                if (sequence !== revision) return;
                result.items.forEach(item => { rows.querySelector(`[data-total="${item.partNumber}"]`).textContent = money(item.lineTotalCents); });
                totals.innerHTML = `<dl><div><dt>Subtotal</dt><dd>${money(result.subtotalCents)}</dd></div><div><dt>Shipping</dt><dd>To confirm</dd></div><div><dt>Taxes</dt><dd>To confirm</dd></div><div class="total"><dt>Estimated total</dt><dd>${money(result.estimatedTotalCents)}</dd></div></dl><small>USD · Sample pricing</small>`;
                valid = true; submit.disabled = false; status.textContent = 'Estimate updated.';
            } catch (error) { if (sequence === revision) { totals.textContent = 'Unable to calculate.'; message(error.message, true); } }
        }, 200);
    }
    document.querySelector('#add-product').addEventListener('click', () => {
        const select = document.querySelector('#part');
        if (!select.value) return message('Select a product first.', true);
        if (items.some(item => item.partNumber === select.value)) return message('This part is already selected. Update its quantity below.', true);
        items.push({ partNumber: select.value, quantity: 1 }); select.value = ''; message(''); renderRows(); changed();
    });
    document.querySelectorAll('#project,#notes').forEach(el => el.addEventListener('input', () => { requestKey = crypto.randomUUID(); }));
    formSubmit(document.querySelector('#estimate-form'), async data => {
        if (!valid) throw new Error('Wait for your estimate to finish calculating.');
        const result = await api('/estimates', { project: data.project, notes: data.notes, items, catalogVersion: catalog.catalogVersion, requestKey });
        location.assign(`requests.html?request=${encodeURIComponent(result.id)}&submitted=1`);
    });
}
function requestMarkup(request, admin = false) {
    const s = request.snapshot;
    const selected = new URLSearchParams(location.search).get(admin ? 'quote' : 'request') === request.id;
    const transitions = { submitted: ['in_review','closed'], in_review: ['awaiting_customer','final_quote_simulated','closed'], awaiting_customer: ['in_review','final_quote_simulated','closed'], final_quote_simulated: ['in_review','closed'], closed: ['in_review'] };
    return `<details class="portal-request" id="request-${request.id}" ${selected ? 'open' : ''}><summary><strong>${escape(s.project)}</strong> · ${money(s.estimatedTotalCents)} ${badge(request.status)}<small>${escape(date(request.createdAt))} · Reference ${escape(request.id)}</small></summary>${admin ? `<dl class="portal-facts"><div><dt>Customer</dt><dd>${escape(s.customer.name)} · ${escape(s.customer.company)}</dd></div><div><dt>Email</dt><dd>${escape(s.customer.email)}</dd></div></dl>` : ''}
        <div class="portal-table-scroll"><table><caption class="sr-only">Submitted products and sample prices</caption><thead><tr><th>Product / part</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${s.items.map(i => `<tr><td>${escape(i.name)}<small>${escape(i.partNumber)}</small></td><td>${i.quantity}</td><td>${money(i.unitPriceCents)}</td><td>${money(i.lineTotalCents)}</td></tr>`).join('')}</tbody></table></div><div class="portal-facts"><p>Subtotal: <strong>${money(s.subtotalCents)}</strong></p><p>Estimated total: <strong>${money(s.estimatedTotalCents)}</strong></p></div><p class="notes">${escape(s.notes || 'No additional project notes.')}</p>${notice}<p>Submitted details and sample prices are saved as a fixed snapshot. ${escape(s.quoteDelivery)}</p>${admin ? `<form class="portal-actions" data-request-id="${request.id}" data-previous="${request.status}"><div><label for="status-${request.id}">Next status</label><select id="status-${request.id}" name="status">${transitions[request.status].map(state => `<option value="${state}">${names[state]}</option>`).join('')}</select></div>${button('Update status','','submit')}</form>` : ''}</details>`;
}
async function requestsPage() {
    const { requests } = await api('/estimates');
    content.innerHTML = `<section class="portal-panel"><h2>Submitted estimates</h2>${requests.length ? requests.map(r => requestMarkup(r)).join('') : '<div class="portal-empty"><p>No estimates submitted yet.</p><div class="portal-actions" style="justify-content:center"><a class="portal-btn" href="quote.html">Build your first estimate</a></div></div>'}</section>`;
    if (new URLSearchParams(location.search).has('submitted')) message('Estimate submitted for review. Your prices and project details have been saved. Quote email delivery is simulated for testing.');
}
async function adminPage() {
    const [{ applications }, { requests }, { messages }] = await Promise.all([api('/admin/applications'), api('/admin/estimates'), api('/admin/mail')]);
    const selected = new URLSearchParams(location.search).get('application');
    content.innerHTML = `<section class="portal-panel"><h2>Access applications</h2><div class="portal-form"><div><label for="application-filter">Filter applications</label><select id="application-filter"><option value="all">All applications (${applications.length})</option><option value="pending">Pending review (${applications.filter(a => a.approval === 'pending').length})</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="revoked">Revoked</option></select></div></div><div id="applications">${applications.length ? applications.map(a => `<details class="portal-request" data-application-status="${a.approval}" ${selected === a.id ? 'open' : ''}><summary><strong>${escape(a.company)}</strong> · ${escape(a.name)} ${badge(a.approval)}</summary><dl class="portal-facts"><div><dt>Work email</dt><dd>${escape(a.email)}</dd></div><div><dt>Verification</dt><dd>${a.verified ? 'Verified' : 'Not yet verified'}</dd></div><div><dt>Company website</dt><dd>${escape(a.website)}</dd></div><div><dt>Applied</dt><dd>${escape(date(a.createdAt))}</dd></div></dl><p class="notes">${escape(a.reason)}</p><small>Approval does not verify the email. Both requirements are enforced independently.</small><div class="portal-actions">${a.approval !== 'approved' ? `<button class="portal-btn" data-decision="approved" data-id="${a.id}" data-previous="${a.approval}">Approve access</button>` : `<button class="portal-btn danger" data-decision="revoked" data-id="${a.id}" data-previous="${a.approval}">Revoke access</button>`}${a.approval === 'pending' ? `<button class="portal-btn quiet" data-decision="rejected" data-id="${a.id}" data-previous="${a.approval}">Reject application</button>` : ''}</div></details>`).join('') : '<p class="portal-empty">No access applications yet.</p>'}</div></section>
        <section class="portal-panel"><h2>Estimate requests</h2><p>Stock confirmation and final quote discussions happen privately with Ben or the designated representative. Final quote delivery is simulated in this testing version.</p>${requests.length ? requests.map(r => requestMarkup(r, true)).join('') : '<p class="portal-empty">No submitted estimates yet.</p>'}</section>
        <section class="portal-panel"><h2>Email delivery</h2><p>Account messages use SMTP. Quote messages are simulated and never sent.</p>${messages.length ? messages.map(m => `<div class="portal-mail"><strong>${escape(m.subject)}</strong><span>${escape(m.recipient)}</span><small>${escape(m.state)} · ${m.attempts} delivery attempts · ${escape(date(m.created_at))}</small>${m.state === 'failed' ? button('Retry account email', `data-retry="${m.id}"`) : ''}</div>`).join('') : '<p>No messages queued.</p>'}</section>`;
    document.querySelector('#application-filter').addEventListener('change', event => {
        document.querySelectorAll('[data-application-status]').forEach(el => { el.hidden = event.target.value !== 'all' && el.dataset.applicationStatus !== event.target.value; });
    });
    onClick('[data-decision]', async el => {
        const result = await api(`/admin/applications/${el.dataset.id}`, { status: el.dataset.decision, previousStatus: el.dataset.previous });
        await adminPage(); message(result.message);
    });
    document.querySelectorAll('[data-request-id]').forEach(form => formSubmit(form, async data => {
        const result = await api(`/admin/estimates/${form.dataset.requestId}`, { status: data.status, previousStatus: form.dataset.previous });
        await adminPage(); message(result.message);
    }));
    onClick('[data-retry]', async el => { message((await api(`/admin/mail/${el.dataset.retry}/retry`, {})).message); await adminPage(); });
}
try {
    ({ user } = await api('/me'));
    accountNav();
    if (page === 'admin-setup') adminSetupPage();
    else if (['sign-in','request-access','forgot-password','reset-password','verify-email'].includes(page)) authPage();
    else if (!user) location.replace('sign-in.html');
    else if (page === 'account') accountPage();
    else if (page === 'quote') await quotePage();
    else if (page === 'requests') await requestsPage();
    else if (page === 'admin') await adminPage();
} catch (error) { content.innerHTML = `<section class="portal-panel"><p>Unable to load this page.</p><div class="portal-actions">${link('account.html','Back to account')}</div></section>`; message(error.message, true); }
finally { content.setAttribute('aria-busy', 'false'); }
