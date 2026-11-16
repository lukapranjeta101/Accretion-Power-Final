import { configuration } from './config.js';
import { createMailTransport } from './mail.js';
const config = configuration();
const transport = createMailTransport(config);
try {
    await transport.verify();
    console.log(`SMTP connection and authentication verified for ${config.smtpHost}:${config.smtpPort}.`);
    if (process.argv.includes('--send-test')) {
        await transport.sendMail({
            from: config.mailFrom, to: config.approvalEmail,
            subject: 'Accretion Power — email delivery test',
            text: 'This is a delivery test for Accretion Power account emails. Verification, password reset, and approval messages will use this connection. Quote delivery remains simulated for testing.',
        });
        console.log(`SMTP server accepted the test message for ${config.approvalEmail}. Check the inbox and spam folder to confirm receipt.`);
    }
} catch (error) {
    const details = {
        EAUTH: 'Authentication failed. Check the sending Gmail address and its App Password; a normal Google password will not work.',
        ECONNECTION: 'Could not connect to the SMTP server. Check the host, port, and network.',
        ETIMEDOUT: 'The SMTP connection timed out. Check network access to the configured port.',
        ESOCKET: 'The secure SMTP connection failed. Check the network and TLS settings.',
        EENVELOPE: 'The SMTP server rejected the sender or recipient. Use the authenticated sender address or an authorized alias.',
    };
    console.error(details[error.code] || 'SMTP verification or delivery failed. Check the server-side mail configuration.');
    process.exitCode = 1;
} finally { transport.close(); }
