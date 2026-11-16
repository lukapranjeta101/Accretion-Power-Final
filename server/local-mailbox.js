// Development-only SMTP inbox. It never sends messages to external addresses.
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
if (process.env.NODE_ENV === 'production') throw new Error('The local mailbox is for development only.');
process.umask(0o077);
const directory = new URL('../var/local-mail/', import.meta.url);
await mkdir(directory, { recursive: true });
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const smtp = new SMTPServer({ authOptional: true, disabledCommands: ['AUTH', 'STARTTLS'], size: 256 * 1024,
    onData(stream, session, callback) {
        simpleParser(stream).then(async mail => {
            if (stream.sizeExceeded) throw new Error('Message too large');
            const record = { id: randomUUID(), to: mail.to?.text, subject: mail.subject, text: mail.text || '', at: Date.now() };
            await writeFile(new URL(`${record.at}-${record.id}.json`, directory), JSON.stringify(record)); callback();
        }).catch(callback);
    },
});
smtp.listen(1025, '127.0.0.1', () => console.log('Local SMTP inbox listening on 127.0.0.1:1025'));
const web = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'");
    try {
        const files = (await readdir(directory)).filter(f => /^\d+-[\da-f-]+\.json$/.test(f)).sort().reverse().slice(0, 100);
        const mails = await Promise.all(files.map(f => readFile(new URL(f, directory), 'utf8').then(JSON.parse)));
        const body = mails.map(m => `<article><h2>${escape(m.subject)}</h2><p>To: ${escape(m.to)} · ${escape(new Date(m.at).toLocaleString())}</p><pre>${escape(m.text).replace(/https?:\/\/[^\s<>]+/g, url => `<a href="${url}" rel="noreferrer">${url}</a>`)}</pre></article>`).join('');
        res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local SMTP inbox</title><style>body{font:16px system-ui;max-width:900px;margin:40px auto;padding:20px;background:#f4f4f5}article{background:white;padding:24px;margin:20px 0;border-radius:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.6}a{color:#124bcc}</style></head><body><h1>Accretion Power · Local SMTP inbox</h1><p>Development only. Messages were received over SMTP; nothing was delivered to external inboxes. Refresh to see new messages.</p>${body || '<p>No messages yet.</p>'}</body></html>`);
    } catch { res.statusCode = 500; res.end('Unable to load local mailbox.'); }
});
web.listen(8025, '127.0.0.1', () => console.log('Read local emails at http://127.0.0.1:8025'));
process.on('SIGINT', () => { web.close(); smtp.close(); });
process.on('SIGTERM', () => { web.close(); smtp.close(); });
