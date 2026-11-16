import nodemailer from 'nodemailer';
import { randomUUID } from 'node:crypto';
export function queueMail(db, recipient, subject, body, kind = 'account') {
    db.prepare('INSERT INTO outbox (id,recipient,subject,body,kind,state,next_attempt,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(randomUUID(), recipient, subject, body, kind, kind === 'quote' ? 'simulated' : 'pending', Date.now(), Date.now());
}
export function createMailTransport(config) {
    return nodemailer.createTransport({
        host: config.smtpHost, port: config.smtpPort, secure: config.smtpSecure,
        requireTLS: !config.smtpSecure && !['127.0.0.1', 'localhost', '::1'].includes(config.smtpHost),
        auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPassword } : undefined,
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });
    }
export function mailer(db, config, injectedTransport) {
    const transport = injectedTransport || createMailTransport(config);
    let busy = false;
    return {
        async flush() {
            if (busy) return;
            busy = true;
            try {
                const rows = db.prepare("SELECT * FROM outbox WHERE state='pending' AND next_attempt<=? ORDER BY created_at LIMIT 10").all(Date.now());
                for (const row of rows) {
                    try {
                        await transport.sendMail({ from: config.mailFrom, to: row.recipient, subject: row.subject, text: row.body,
                            messageId: `<${row.id}@${new URL(config.baseUrl).hostname}>` });
                        db.prepare("UPDATE outbox SET state='sent',sent_at=?,body='',attempts=attempts+1 WHERE id=?").run(Date.now(), row.id);
                    } catch {
                        const attempts = row.attempts + 1;
                        db.prepare('UPDATE outbox SET state=?,attempts=?,next_attempt=? WHERE id=?').run(
                            attempts >= 10 ? 'failed' : 'pending', attempts,
                            Date.now() + Math.min(3600000, 30000 * 2 ** attempts), row.id);
                        console.error('Account email delivery failed; inspect SMTP configuration. Message:', row.id);
                    }
                }
            } finally { busy = false; }
        },
        close() { transport.close?.(); },
    };
}
