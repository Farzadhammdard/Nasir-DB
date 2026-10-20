import fs from 'node:fs';
import path from 'node:path';
import { dataDir } from './db.js';
import { nowIso } from './dates.js';

function logFile() {
  const dir = path.join(dataDir(), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `app-${nowIso().slice(0, 10)}.log`);
}

export function writeLog(level, scope, message, meta = {}) {
  const entry = {
    at: nowIso(),
    level,
    scope,
    message: String(message ?? ''),
    ...meta,
  };
  try {
    fs.appendFileSync(logFile(), `${JSON.stringify(entry)}\n`, 'utf8');
  } catch {
    // A failing log write must never take down a financial transaction.
  }
}

export const logInfo = (scope, message, meta) => writeLog('info', scope, message, meta);
export const logWarn = (scope, message, meta) => writeLog('warn', scope, message, meta);
export const logError = (scope, message, meta) => writeLog('error', scope, message, meta);

export function readRecentLogs(limit = 500) {
  const dir = path.join(dataDir(), 'logs');
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('app-') && f.endsWith('.log'))
    .sort()
    .reverse()
    .slice(0, 7);

  const lines = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8').split('\n').filter(Boolean);
    lines.push(...content.reverse());
    if (lines.length >= limit) break;
  }
  return lines.slice(0, limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { message: line };
    }
  });
}
