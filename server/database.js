import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(filename) {
    if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(filename);
    if (filename !== ':memory:') chmodSync(filename, 0o600);
    db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, company TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE, website TEXT NOT NULL, reason TEXT NOT NULL,
            password_hash TEXT NOT NULL, verified_at INTEGER,
            approval TEXT NOT NULL DEFAULT 'pending' CHECK (approval IN ('pending','approved','rejected','revoked')),
            role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS admin_setup (
            id INTEGER PRIMARY KEY CHECK (id=1), hash TEXT, recipient TEXT NOT NULL,
            expires_at INTEGER NOT NULL, completed_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS sessions (
            hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tokens (
            hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
            purpose TEXT NOT NULL CHECK (purpose IN ('verify','reset')), expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS quotes (
            id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), request_key TEXT NOT NULL,
            snapshot TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'submitted',
            created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
            UNIQUE(user_id, request_key)
        );
        CREATE TRIGGER IF NOT EXISTS immutable_quote BEFORE UPDATE OF snapshot, user_id, request_key, created_at ON quotes
            BEGIN SELECT RAISE(ABORT, 'Quote snapshots are immutable'); END;
        CREATE TABLE IF NOT EXISTS outbox (
            id TEXT PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
            kind TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
            next_attempt INTEGER NOT NULL, created_at INTEGER NOT NULL, sent_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS audit (
            id INTEGER PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id),
            action TEXT NOT NULL, target_id TEXT NOT NULL, created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS quotes_owner ON quotes(user_id, created_at);
        CREATE INDEX IF NOT EXISTS outbox_due ON outbox(state, next_attempt);
    `);
    return db;
}

export function transaction(db, fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
}
