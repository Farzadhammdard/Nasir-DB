import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_SQL, seedReferenceData } from './schema.js';

let handle = null;
let depth = 0;

// COMPANYMANAGER_DATA_DIR is injected by the Electron main process so the
// database lands in userData instead of the (read-only, upgrade-wiped) install dir.
export function dataDir() {
  const fromEnv = process.env.COMPANYMANAGER_DATA_DIR;
  if (fromEnv && fromEnv.trim()) return path.resolve(fromEnv);
  return path.join(process.cwd(), '.data');
}

export function databaseFile() {
  return path.join(dataDir(), 'companymanager.sqlite');
}

export function getDb() {
  if (handle) return handle;
  const dir = dataDir();
  fs.mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(databaseFile());
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 8000;');
  // FULL, not NORMAL: this holds financial records and §35 forbids silent data loss.
  db.exec('PRAGMA synchronous = FULL;');
  db.exec(SCHEMA_SQL);
  seedReferenceData(db);

  handle = db;
  return db;
}

export function closeDb() {
  if (!handle) return;
  try {
    handle.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    // checkpoint failure must not block shutdown or a restore
  }
  try {
    handle.close();
  } catch {
    // already closed
  }
  handle = null;
  depth = 0;
}

// node:sqlite binds only null/number/bigint/string/Uint8Array, so booleans and
// undefined coming from JSON request bodies have to be normalised first.
function normalizeParams(params) {
  return params.map((p) => {
    if (p === undefined || p === null) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p;
  });
}

export function all(sql, params = []) {
  return getDb()
    .prepare(sql)
    .all(...normalizeParams(params));
}

export function get(sql, params = []) {
  return getDb()
    .prepare(sql)
    .get(...normalizeParams(params));
}

export function run(sql, params = []) {
  const result = getDb()
    .prepare(sql)
    .run(...normalizeParams(params));
  return {
    changes: Number(result.changes ?? 0),
    lastInsertRowid: Number(result.lastInsertRowid ?? 0),
  };
}

export function exec(sql) {
  getDb().exec(sql);
}

// BEGIN IMMEDIATE takes the write lock up front, which is what makes the
// number counters in numbering.js safe against concurrent bill creation (§19).
// Nested calls fall back to savepoints so service functions stay composable.
export function tx(fn) {
  const db = getDb();
  const level = depth;
  const savepoint = `sp${level}`;

  db.exec(level === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${savepoint}`);
  depth = level + 1;

  try {
    const result = fn();
    depth = level;
    db.exec(level === 0 ? 'COMMIT' : `RELEASE ${savepoint}`);
    return result;
  } catch (error) {
    depth = level;
    try {
      db.exec(level === 0 ? 'ROLLBACK' : `ROLLBACK TO ${savepoint}`);
    } catch {
      // nothing left to roll back
    }
    if (level !== 0) {
      try {
        db.exec(`RELEASE ${savepoint}`);
      } catch {
        // savepoint already gone
      }
    }
    throw error;
  }
}

export function isTransientError(error) {
  const message = String(error?.message ?? error ?? '');
  return /SQLITE_BUSY|SQLITE_LOCKED|database is locked|disk I\/O error/i.test(message);
}
