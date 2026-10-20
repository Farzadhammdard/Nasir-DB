import { get, run, tx } from './db.js';

export const COUNTER_KEYS = {
  bill: 'bill',
  customer: 'customer',
  payment: 'payment',
  expense: 'expense',
  report: 'report',
};

// padStart naturally widens once the value outgrows the padding, so CUS-999 is
// followed by CUS-1000 rather than wrapping or throwing (accepted resolution of
// the §10 vs §49 numbering conflict).
export function formatSequence(prefix, value, pad = 3) {
  const width = Math.max(0, Number(pad) || 0);
  return `${prefix ?? ''}${String(value).padStart(width, '0')}`;
}

function ensureCounter(key, startValue) {
  const existing = get('SELECT next_value FROM counters WHERE key = ?', [key]);
  if (existing) return Number(existing.next_value);
  run('INSERT INTO counters (key, next_value) VALUES (?, ?)', [key, startValue]);
  return startValue;
}

// Must be called inside tx(); the BEGIN IMMEDIATE write lock is what stops two
// concurrent bills from claiming the same number (§19).
export function nextSequence(key, { start = 1, pad = 3, prefix = '' } = {}) {
  return tx(() => {
    const current = ensureCounter(key, start);
    run('UPDATE counters SET next_value = next_value + 1 WHERE key = ?', [key]);
    return {
      value: current,
      formatted: formatSequence(prefix, current, pad),
    };
  });
}

export function peekSequence(key, { start = 1, pad = 3, prefix = '' } = {}) {
  const existing = get('SELECT next_value FROM counters WHERE key = ?', [key]);
  const value = existing ? Number(existing.next_value) : start;
  return { value, formatted: formatSequence(prefix, value, pad) };
}

export function resetSequence(key, nextValue) {
  run(
    `INSERT INTO counters (key, next_value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET next_value = excluded.next_value`,
    [key, Number(nextValue)]
  );
}
