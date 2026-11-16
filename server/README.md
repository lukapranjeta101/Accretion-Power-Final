# Account and estimate portal

This is the existing Accretion Power site plus a Node HTTP server. The server handles authentication, authorization, SMTP and SQLite; Vite handles assets. Static-only hosting (`vite preview`, or uploading only `dist`) cannot run the portal.

## Local testing

Use Node 24+ and `pnpm install`. In two terminals:

```sh
npm run mail:local
npm run dev
```

Open **http://localhost:5173**. Read received verification, reset and approval messages at **http://127.0.0.1:8025**. The inbox is a real local SMTP receiver on port 1025, persists messages under `var/local-mail/`, and never forwards to external inboxes. It is bound to loopback and refuses to run with `NODE_ENV=production`.

If another site already occupies 5173:

```sh
APP_BASE_URL=http://localhost:5180 PORT=5180 npm run dev
```

Use exactly the configured origin in the browser. The API deliberately rejects writes from other origins (including substituting `127.0.0.1` for `localhost`). The app and API share one origin, locally and on a domain.

Copy `.env.example` to `.env` to persist configuration. The testing approval recipient defaults to `lukapranjeta18@gmail.com` through server-side `ACCOUNT_APPROVAL_EMAIL`. In local-inbox mode, messages addressed to that recipient appear in the testing inbox; they are **not delivered to Gmail**. To deliver actual account emails, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and a provider-verified `MAIL_FROM`. Do not put credentials in `src`, a `VITE_` variable, or Git.

Alternatively, `docker compose -f compose.mail.yaml up -d` starts Mailpit instead of the Node local inbox. Do not run both on the same ports.

## Administrator setup and account approvals (no command required)

On first startup, the server emails a one-time administrator setup invitation to `ACCOUNT_APPROVAL_EMAIL` (testing: `lukapranjeta18@gmail.com`). In local SMTP mode, read it at **http://127.0.0.1:8025**.

1. Open **Set up administrator access** in that email.
2. Create or sign in to an account using the exact recipient email address.
3. Verify your email, then return to the setup invitation (or choose **Set up administrator access** on your Account page).
4. Click **Enable administrator access**. You can now review applications at `/admin.html`.

The invitation expires in 24 hours. Eligible signed-in users can request another from the setup page. Only the configured mailbox, a verified account, and a valid single-use invitation can complete setup. Simply opening the link never grants access. Setup cannot be repeated after completion, even if the administrator is later revoked. The trusted `npm run admin -- grant|revoke email` CLI remains available for operator recovery, but is not required for normal setup or approvals.

Every new account request sends an email to the administrator with the applicant's details and a **Review Application** link. Sign in as the administrator and explicitly choose **Approve access** or **Reject application**. The applicant receives a decision email. Email verification remains a separate requirement for quote access. Administrators can revoke previously approved access from the same page.

To test as both customer and administrator, use separate browser profiles/private windows. Revocation applies to the next request, including an already-open configurator. Customers can still read their own historical submissions after revocation.

## What is real and what is simulated

- Real: registration, scrypt password hashing, login/logout, expiring hashed server sessions, email verification, password reset, approval/rejection/revocation, administrator authorization, SMTP account notifications, persistent customer/estimate storage, and customer record ownership enforcement.
- Sample: six explicitly labeled sample part numbers and USD customer prices in `server/catalog.js`. No internal prices, margins, or credentials are stored in public assets. Stock indications are simulated and do not reserve inventory.
- Simulated: estimate acknowledgment emails, estimate status emails, and final quote delivery. These are stored with `state=simulated` in the outbox and are never sent over SMTP. The administrator status “Final quote simulated” is explicitly not a final offer or order. Ben or a representative must confirm stock and discuss the final quote privately.

Every submitted snapshot includes the customer/company/contact details at submission, project and notes, selected parts, quantities, unit prices, line totals, subtotal, estimated total, currency, pricing version, and the shipping/tax/availability caveats. Amounts use integer cents, quantities are positive safe integers capped at 100,000, duplicate parts are rejected, and the server ignores browser-supplied prices. A database trigger prevents changes to snapshots; only request status and update time change. Submission keys prevent accidental duplicate requests on retry. Changing the catalog version requires customers to reload before submitting.

## Persistence and mail delivery

`DATABASE_PATH` defaults to `var/accretion.sqlite` (gitignored). SQLite runs in WAL mode with foreign keys and a busy timeout. Run one application process with a persistent local disk for this testing deployment. Back up the database with a SQLite-aware backup procedure, or stop the process before copying the database and WAL files; do not use ephemeral hosting storage. No customer database or mailbox is shipped in `dist`.

Account messages are queued transactionally with account changes. The worker checks every 10 seconds and retries failed delivery with exponential backoff, up to 10 attempts. Failed messages can be retried from the administrator page after fixing SMTP. Account email bodies containing tokens are erased after successful delivery. Verification links expire after 24 hours; reset links expire after one hour. Resending a link invalidates the previous token, so use the latest message. Sessions expire after 12 hours. Password resets revoke every active session for the account. SMTP acceptance does not guarantee arrival in a recipient inbox; consult the email provider for bounces. Delivery uses stable message IDs but may repeat if a process stops after SMTP accepts a message and before the database is updated.

The local mailbox contains sensitive test links. It is a developer tool, not a public application route. Remove test records/mail when no longer needed. No email body or authentication token is returned by the administrator mail API.

## Run like a hosted site

```sh
npm run build
npm start
```

This serves the built site and the same APIs through Node. For an actual domain, set `NODE_ENV=production`, an HTTPS `APP_BASE_URL`, SMTP configuration and `ACCOUNT_APPROVAL_EMAIL`. Terminate TLS at a reverse proxy forwarding to the Node port; persist the SQLite directory. Production refuses incomplete essential configuration, uses Secure/HttpOnly/SameSite cookies, and sets a restrictive CSP on portal pages. Local HTTP uses the same authorization with a non-Secure cookie solely because localhost is HTTP. There is no client-side mock-auth mode.

The server intentionally does not trust forwarded IP headers. If later deployed behind a proxy, configure a narrowly trusted proxy and review rate limits for that deployment; otherwise limits are shared by traffic from the proxy. This single-process testing backend is not a multi-region deployment architecture.

## Validation

```sh
npm run test:server
npx playwright test --config playwright.portal.config.js
npm run build
PORTAL_STATIC=1 npx playwright test --config playwright.portal.config.js
```

The browser suite starts an isolated app on port 5418 with `var/portal-e2e-<timestamp>.sqlite`, never the main account database. It uses test-only fixture users; it does not deliver external email. If Playwright's browser is not installed, run `npx playwright install chromium`, or set `CHROMIUM_EXECUTABLE` to an installed compatible Chromium. Server tests exercise a temporary SQLite database and a real temporary SMTP server.

Implementation references: [Node SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html), [Nodemailer SMTP](https://nodemailer.com/smtp), and [Vite server file access restrictions](https://vite.dev/config/server-options#server-fs-allow).
