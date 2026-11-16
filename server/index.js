import { resolve } from 'node:path';
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { configuration } from './config.js';
import { openDatabase } from './database.js';
import { createApp } from './app.js';
import { mailer } from './mail.js';
import { ensureAdminInvitation } from './admin-invitation.js';
process.umask(0o077);
const config = configuration();
const db = openDatabase(config.databasePath);
ensureAdminInvitation(db, config);
const app = await createApp(db, config);
const server = createHttpServer(app);
let vite;
if (process.argv.includes('--dev')) {
    if (config.production) throw new Error('Do not run --dev in production.');
    const { createServer } = await import('vite');
    vite = await createServer({ server: { middlewareMode: true, open: false, hmr: { server } }, appType: 'mpa' });
    app.use(vite.middlewares);
} else {
    app.use(express.static(resolve('dist'), { dotfiles: 'deny', index: 'index.html' }));
}
app.use((req, res) => res.status(404).send('Page not found.'));
const delivery = mailer(db, config);
const timer = setInterval(() => delivery.flush(), 10000);
timer.unref();
const cleanup = setInterval(() => {
    db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
    db.prepare('DELETE FROM tokens WHERE expires_at<?').run(Date.now());
}, 3600000);
cleanup.unref();
// localhost can resolve to both ::1 and 127.0.0.1. Own both loopback
// listeners so an old IPv6 preview cannot silently shadow the account API.
const listeners = [server];
if (config.host === '127.0.0.1' && new URL(config.baseUrl).hostname === 'localhost') {
    const ipv6 = createHttpServer(app);
    ipv6.on('upgrade', (req, socket, head) => server.emit('upgrade', req, socket, head));
    listeners.push(ipv6);
}
async function listen(instance, host) {
    await new Promise((resolve, reject) => {
        instance.once('error', reject);
        instance.listen({ port: config.port, host, ipv6Only: host === '::1' }, () => {
            instance.off('error', reject); resolve();
        });
    });
}
async function shutdown() {
    clearInterval(timer); clearInterval(cleanup);
    for (const instance of listeners) { instance.close(); instance.closeAllConnections(); }
    await vite?.close(); delivery.close();
}
try {
    await listen(server, config.host);
    if (listeners.length > 1) await listen(listeners[1], '::1');
    console.log(`Accretion Power: ${config.baseUrl}`);
    console.log(`Account emails: SMTP ${config.smtpHost}:${config.smtpPort}. Quote delivery: simulated.`);
    void delivery.flush();
} catch (error) {
    console.error(`Unable to start the complete account server on port ${config.port}: ${error.code || error.message}. Stop any old preview using this port, then restart.`);
    await shutdown(); process.exitCode = 1;
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
