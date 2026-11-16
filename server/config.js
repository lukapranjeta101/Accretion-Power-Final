import { resolve } from 'node:path';
export function configuration(env = process.env) {
    const production = env.NODE_ENV === 'production';
    const baseUrl = (env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
    const url = new URL(baseUrl);
    if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('APP_BASE_URL must be an origin without a path or credentials.');
    if (production && (url.protocol !== 'https:' || !env.SMTP_HOST || !env.MAIL_FROM || !env.ACCOUNT_APPROVAL_EMAIL)) {
        throw new Error('Production requires HTTPS APP_BASE_URL, SMTP_HOST, MAIL_FROM, and ACCOUNT_APPROVAL_EMAIL.');
    }
    const gmail = env.SMTP_HOST === 'smtp.gmail.com';
    const smtpPassword = gmail ? env.SMTP_PASSWORD?.replace(/\s/g, '') : env.SMTP_PASSWORD;
    if (gmail && (!env.SMTP_USER || !smtpPassword)) {
        throw new Error('Gmail SMTP requires SMTP_USER and a Google App Password in SMTP_PASSWORD. Add them to the private .env file.');
    }
    return { production, baseUrl, port: Number(env.PORT || 5173), host: env.HOST || '127.0.0.1',
        databasePath: resolve(env.DATABASE_PATH || 'var/accretion.sqlite'),
        approvalEmail: env.ACCOUNT_APPROVAL_EMAIL || 'lukapranjeta18@gmail.com',
        mailFrom: env.MAIL_FROM || 'Accretion Power <accounts@accretion.test>',
        smtpHost: env.SMTP_HOST || '127.0.0.1', smtpPort: Number(env.SMTP_PORT || 1025),
        smtpSecure: env.SMTP_SECURE === 'true', smtpUser: env.SMTP_USER, smtpPassword,
    };
}
