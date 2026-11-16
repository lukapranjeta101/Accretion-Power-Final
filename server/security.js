import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const token = () => randomBytes(32).toString('hex');
export const hash = value => createHash('sha256').update(value).digest('hex');
export async function passwordHash(password) {
    const salt = randomBytes(16).toString('hex');
    const key = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return `${salt}:${key.toString('hex')}`;
}
export async function passwordMatches(password, stored) {
    const [salt, encoded] = stored.split(':');
    const key = await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return timingSafeEqual(key, Buffer.from(encoded, 'hex'));
}
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export function string(value, label, min = 1, max = 200) {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(400, `${label} must contain ${min}–${max} characters.`);
    return value.trim();
}
export function email(value) {
    const result = string(value, 'Work email', 3, 254).toLowerCase();
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result)) fail(400, 'Enter a valid work email.');
    return result;
}
export function password(value, confirmation) {
    if (typeof value !== 'string' || value.length < 12 || value.length > 128) fail(400, 'Use a password of 12–128 characters.');
    if (value !== confirmation) fail(400, 'Passwords do not match.');
    return value;
}
export function publicUser(user) {
    return { id: user.id, name: user.name, company: user.company, email: user.email, website: user.website,
        reason: user.reason, verified: Boolean(user.verified_at), approval: user.approval, role: user.role, createdAt: user.created_at };
}
