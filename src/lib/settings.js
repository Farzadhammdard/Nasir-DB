import { all, get, run, tx } from './db.js';
import { DEFAULT_TIMEZONE } from './dates.js';

export const SETTING_DEFAULTS = {
  initialized: '0',

  'company.name': '',
  'company.logo': '',
  'company.address': '',
  'company.phone': '',
  'company.email': '',
  'company.website': '',
  'company.footer': '',

  'bill.prefix': 'INV-',
  'bill.start': '1',
  'bill.pad': '3',
  'customer.prefix': 'CUS-',
  'customer.start': '1',
  'customer.pad': '3',
  'payment.prefix': 'PAY-',
  'payment.start': '1',
  'payment.pad': '3',
  'expense.prefix': 'EXP-',
  'expense.start': '1',
  'expense.pad': '3',
  'report.prefix': 'RPT-',
  'report.start': '1',
  'report.pad': '3',

  'currency.code': 'AFN',
  'currency.decimals': '2',

  language: 'fa',
  theme: 'system',
  timezone: DEFAULT_TIMEZONE,

  'print.show_logo': '1',
  'print.company_label': '',
  'print.customer_label': '',
  'print.footer': '',
  'print.font_scale': '100',
};

export function getSetting(key, fallback = '') {
  const row = get('SELECT value FROM settings WHERE key = ?', [key]);
  if (row && row.value !== null) return row.value;
  if (key in SETTING_DEFAULTS) return SETTING_DEFAULTS[key];
  return fallback;
}

export function getNumberSetting(key, fallback = 0) {
  const parsed = Number(getSetting(key, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getBoolSetting(key, fallback = false) {
  const value = getSetting(key, fallback ? '1' : '0');
  return value === '1' || value === 'true';
}

export function setSetting(key, value) {
  const text = value === null || value === undefined ? '' : String(value);
  run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, text]
  );
}

export function setManySettings(entries) {
  tx(() => {
    for (const [key, value] of Object.entries(entries)) {
      setSetting(key, value);
    }
  });
}

export function getSettingsTable() {
  return Object.fromEntries(all('SELECT key, value FROM settings').map((row) => [row.key, row.value]));
}

export function isInitialized() {
  return getBoolSetting('initialized', false);
}

export function sequenceConfig(kind) {
  return {
    prefix: getSetting(`${kind}.prefix`),
    start: getNumberSetting(`${kind}.start`, 1),
    pad: getNumberSetting(`${kind}.pad`, 3),
  };
}

// Single resolved config object consumed by both server code and rendered pages,
// so no company identity is ever hard-coded (§3).
export function getAppConfig() {
  return {
    initialized: isInitialized(),
    company: {
      name: getSetting('company.name'),
      logo: getSetting('company.logo'),
      address: getSetting('company.address'),
      phone: getSetting('company.phone'),
      email: getSetting('company.email'),
      website: getSetting('company.website'),
      footer: getSetting('company.footer'),
    },
    sequences: {
      bill: sequenceConfig('bill'),
      customer: sequenceConfig('customer'),
      payment: sequenceConfig('payment'),
      expense: sequenceConfig('expense'),
      report: sequenceConfig('report'),
    },
    currency: {
      code: getSetting('currency.code') || 'AFN',
      decimals: getNumberSetting('currency.decimals', 2),
    },
    language: getSetting('language') || 'fa',
    theme: getSetting('theme') || 'system',
    timezone: getSetting('timezone') || DEFAULT_TIMEZONE,
    print: {
      showLogo: getBoolSetting('print.show_logo', true),
      companyLabel: getSetting('print.company_label'),
      customerLabel: getSetting('print.customer_label'),
      footer: getSetting('print.footer'),
      fontScale: getNumberSetting('print.font_scale', 100),
    },
  };
}
