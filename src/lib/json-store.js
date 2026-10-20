import { get, list, put } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError, ERROR_KIND } from './errors.js';
import {
  closeDb,
  exportDatabaseTables,
  getDb,
  importDatabaseTables,
} from './db.js';

const JSON_FORMAT = 'nasirdb-database-v2';
const BLOB_PATH = 'companymanager/database-v2.json';
const LOCAL_FILE = 'companymanager-v2.json';
const MAX_BLOB_WRITE_ATTEMPTS = 5;
let queue = Promise.resolve();

function useBlobStorage() {
  return process.env.VERCEL === '1'
    || Boolean(process.env.BLOB_STORE_ID)
    || Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function localDatabasePath() {
  const base = process.env.COMPANYMANAGER_DATA_DIR || path.join(process.cwd(), '.data');
  return path.join(base, LOCAL_FILE);
}

function parseDocument(text) {
  const document = JSON.parse(text);
  if (
    !document
    || document.format !== JSON_FORMAT
    || !document.tables
    || typeof document.tables !== 'object'
    || Array.isArray(document.tables)
  ) {
    throw new Error('The JSON database has an unsupported or invalid format.');
  }
  return document;
}

async function readBlobDocument() {
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new AppError(ERROR_KIND.STORAGE, 'errors.storage.not_configured', {
      message: 'Connect a private Vercel Blob store to this project before using the V2 deployment.',
      status: 503,
    });
  }

  const { blobs } = await list({ prefix: BLOB_PATH, limit: 10 });
  const blob = blobs.find((entry) => entry.pathname === BLOB_PATH);
  if (!blob) return { document: null, etag: null };

  const result = await get(blob.url, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) {
    throw new Error('The Vercel Blob database could not be read.');
  }

  const text = await new Response(result.stream).text();
  return { document: parseDocument(text), etag: result.blob.etag };
}

function readLocalDocument() {
  const file = localDatabasePath();
  if (!fs.existsSync(file)) return { document: null, etag: null };
  return { document: parseDocument(fs.readFileSync(file, 'utf8')), etag: null };
}

async function writeBlobDocument(document, etag) {
  try {
    await put(BLOB_PATH, JSON.stringify(document, null, 2), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: Boolean(etag),
      contentType: 'application/json; charset=utf-8',
      cacheControlMaxAge: 60,
      ...(etag ? { ifMatch: etag } : {}),
    });
  } catch (error) {
    if (
      error?.name === 'BlobPreconditionFailedError'
      || /already exists|precondition failed/i.test(String(error?.message ?? ''))
    ) {
      throw new AppError(ERROR_KIND.STORAGE, 'errors.storage.conflict', {
        message: 'Another request changed the JSON database. Reload the page and try again.',
        status: 409,
      });
    }
    throw error;
  }
}

function writeLocalDocument(document) {
  const file = localDatabasePath();
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true });

  const temporaryFile = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporaryFile, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    fs.renameSync(temporaryFile, file);
  } finally {
    if (fs.existsSync(temporaryFile)) fs.unlinkSync(temporaryFile);
  }
}

export async function withJsonStore(operation) {
  const previous = queue;
  let release;
  queue = new Promise((resolve) => {
    release = resolve;
  });
  await previous;

  try {
    const blobStorage = useBlobStorage();
    for (let attempt = 0; ; attempt += 1) {
      try {
        const { document, etag } = blobStorage
          ? await readBlobDocument()
          : readLocalDocument();

        const db = getDb({ seed: false });
        importDatabaseTables(document?.tables ?? {});
        const originalTables = document ? JSON.stringify(document.tables) : null;
        const result = await operation();
        const tables = exportDatabaseTables();

        if (JSON.stringify(tables) !== originalTables) {
          const updatedDocument = {
            format: JSON_FORMAT,
            updatedAt: new Date().toISOString(),
            tables,
          };
          if (blobStorage) {
            await writeBlobDocument(updatedDocument, etag);
          } else {
            writeLocalDocument(updatedDocument);
          }
        }

        return result;
      } catch (error) {
        const isBlobConflict = error instanceof AppError && error.code === 'errors.storage.conflict';
        if (!blobStorage || !isBlobConflict || attempt + 1 >= MAX_BLOB_WRITE_ATTEMPTS) {
          throw error;
        }
        const backoffMs = Math.min(100 * (2 ** attempt) + Math.floor(Math.random() * 100), 1000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } finally {
        try {
          closeDb();
        } catch (error) {
          console.error('Failed to close the JSON database after a request.', error);
        }
      }
    }
  } finally {
    release();
  }
}
