import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL, seedReferenceData } from './schema.js';

let handle = null;
let depth = 0;

export function getDb({ seed = true } = {}) {
  if (handle) return handle;

  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 8000;');
  db.exec('PRAGMA synchronous = FULL;');
  db.exec(SCHEMA_SQL);
  if (seed) seedReferenceData(db);

  handle = db;
  return db;
}

export function importDatabaseTables(tables) {
  const db = getDb({ seed: false });
  const tableNames = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
    .all()
    .map(({ name }) => name);
  const unknownTables = Object.keys(tables).filter((name) => !tableNames.includes(name));
  if (unknownTables.length) throw new Error(`JSON database contains unknown tables: ${unknownTables.join(', ')}`);

  for (const table of tableNames) {
    const rows = tables[table] ?? [];
    if (!Array.isArray(rows)) throw new Error(`JSON database table "${table}" must be an array`);

    const columns = db.prepare(`PRAGMA table_info("${table}")`).all().map(({ name }) => name);
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`JSON database table "${table}" contains an invalid row`);
      }
      const rowColumns = Object.keys(row);
      if (rowColumns.length !== columns.length || rowColumns.some((column) => !columns.includes(column))) {
        throw new Error(`JSON database table "${table}" has an incompatible row shape`);
      }
      const names = rowColumns.map((column) => `"${column}"`).join(', ');
      const placeholders = rowColumns.map(() => '?').join(', ');
      db.prepare(`INSERT INTO "${table}" (${names}) VALUES (${placeholders})`).run(
        ...rowColumns.map((column) => row[column])
      );
    }
  }

  seedReferenceData(db);
}

export function exportDatabaseTables() {
  const db = getDb();
  const tableNames = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
    .all()
    .map(({ name }) => name);
  return Object.fromEntries(tableNames.map((table) => [table, db.prepare(`SELECT * FROM "${table}"`).all()]));
}

export function closeDb() {
  if (!handle) return;
  try {
    handle.close();
  } finally {
    handle = null;
    depth = 0;
  }
}

function normalizeParams(params) {
  return params.map((param) => {
    if (param === undefined || param === null) return null;
    if (typeof param === 'boolean') return param ? 1 : 0;
    return param;
  });
}

export function all(sql, params = []) {
  return getDb().prepare(sql).all(...normalizeParams(params));
}

export function get(sql, params = []) {
  return getDb().prepare(sql).get(...normalizeParams(params));
}

export function run(sql, params = []) {
  const result = getDb().prepare(sql).run(...normalizeParams(params));
  return {
    changes: Number(result.changes ?? 0),
    lastInsertRowid: Number(result.lastInsertRowid ?? 0),
  };
}

export function exec(sql) {
  getDb().exec(sql);
}

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
      // Nothing remains to roll back.
    }
    if (level !== 0) {
      try {
        db.exec(`RELEASE ${savepoint}`);
      } catch {
        // The savepoint may already have been released.
      }
    }
    throw error;
  }
}

export function isTransientError(error) {
  const message = String(error?.message ?? error ?? '');
  return /SQLITE_BUSY|SQLITE_LOCKED|database is locked|disk I\/O error/i.test(message);
}
