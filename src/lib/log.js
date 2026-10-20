import { nowIso } from './dates.js';

const recentEntries = [];
const MAX_RECENT_ENTRIES = 500;

export function writeLog(level, scope, message, meta = {}) {
  const entry = {
    at: nowIso(),
    level,
    scope,
    message: String(message ?? ''),
    ...meta,
  };

  recentEntries.push(entry);
  if (recentEntries.length > MAX_RECENT_ENTRIES) recentEntries.shift();
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'](JSON.stringify(entry));
}

export const logInfo = (scope, message, meta) => writeLog('info', scope, message, meta);
export const logWarn = (scope, message, meta) => writeLog('warn', scope, message, meta);
export const logError = (scope, message, meta) => writeLog('error', scope, message, meta);

export function readRecentLogs(limit = 500) {
  if (limit <= 0) return [];
  return recentEntries.slice(-limit).reverse();
}
