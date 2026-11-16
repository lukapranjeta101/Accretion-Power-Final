import { configuration } from './config.js';
import { openDatabase, transaction } from './database.js';
import { email } from './security.js';
const [command, address] = process.argv.slice(2);
if (!['grant', 'revoke'].includes(command) || !address) throw new Error('Usage: npm run admin -- grant|revoke email@example.com');
const db = openDatabase(configuration().databasePath);
try {
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email(address));
    if (!user) throw new Error('Register this account through Request Access first.');
    if (command === 'grant' && !user.verified_at) throw new Error('Verify the account email before granting administrator access.');
    transaction(db, () => {
        db.prepare('UPDATE users SET role=?,approval=? WHERE id=?').run(command === 'grant' ? 'admin' : 'customer', command === 'grant' ? 'approved' : 'revoked', user.id);
        db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
        db.prepare('INSERT INTO audit(actor_id,action,target_id,created_at) VALUES (?,?,?,?)').run(user.id, `operator.admin.${command}`, user.id, Date.now());
    });
    console.log(`Administrator access ${command === 'grant' ? 'granted' : 'revoked'}. Sign in again.`);
} finally { db.close(); }
