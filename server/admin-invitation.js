import { token, hash } from './security.js';
import { transaction } from './database.js';
import { queueMail } from './mail.js';

// One-time owner bootstrap, tied to the server-configured mailbox, never a public role field.
export function ensureAdminInvitation(db, config, resend = false) {
    return transaction(db, () => {
        const existing = db.prepare('SELECT * FROM admin_setup WHERE id=1').get();
        if (existing?.completed_at) return false;
        const recipient = config.approvalEmail.trim().toLowerCase();
        if (db.prepare("SELECT id FROM users WHERE role='admin'").get()) {
            db.prepare('INSERT INTO admin_setup VALUES (1,NULL,?,0,?) ON CONFLICT(id) DO UPDATE SET hash=NULL,completed_at=excluded.completed_at')
                .run(recipient, Date.now());
            return false;
        }
        if (!resend && existing?.recipient === recipient && existing.expires_at > Date.now()) return false;
        const raw = token();
        db.prepare('INSERT INTO admin_setup VALUES (1,?,?,?,NULL) ON CONFLICT(id) DO UPDATE SET hash=excluded.hash,recipient=excluded.recipient,expires_at=excluded.expires_at')
            .run(hash(raw), recipient, Date.now() + 24 * 3600000);
        queueMail(db, recipient, 'Set up your Accretion Power administrator account',
            `You are the configured account approval administrator for Accretion Power.\n\nSet up administrator access: ${config.baseUrl}/admin-setup.html#token=${raw}\n\nRegister or sign in using ${recipient}, verify your email, then explicitly select Enable administrator access on the setup page. No terminal command is required. Opening this link does not grant access.\n\nThis invitation expires in 24 hours and can only be used once. After setup, new account requests will be emailed here with a Review Application link where you can approve or reject each applicant.`);
        return true;
    });
}
