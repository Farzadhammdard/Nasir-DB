import * as jalaali from 'jalaali-js';

export const DEFAULT_TIMEZONE = 'Asia/Kabul';

export const SUPPORTED_LOCALES = [
  { code: 'fa', dir: 'rtl', intl: 'fa-AF' },
  { code: 'ps', dir: 'rtl', intl: 'ps-AF' },
  { code: 'en', dir: 'ltr', intl: 'en-GB' },
];

const EASTERN_DIGITS = 'Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹';

// Solar Hijri month names differ between Afghan Dari and Iranian Persian; Â§4
// specifies ÙØ§Ø±Ø³ÛŒ/Ø¯Ø±ÛŒ alongside Pashto and AFN, so the Afghan set is correct here.
const JALALI_MONTHS = {
  fa: ['Ø­Ù…Ù„', 'Ø«ÙˆØ±', 'Ø¬ÙˆØ²Ø§', 'Ø³Ø±Ø·Ø§Ù†', 'Ø§Ø³Ø¯', 'Ø³Ù†Ø¨Ù„Ù‡', 'Ù…ÛŒØ²Ø§Ù†', 'Ø¹Ù‚Ø±Ø¨', 'Ù‚ÙˆØ³', 'Ø¬Ø¯ÛŒ', 'Ø¯Ù„Ùˆ', 'Ø­ÙˆØª'],
  ps: ['ÙˆØ±ÛŒ', 'ØºÙˆÛŒÛŒ', 'ØºØ¨Ø±Ú«ÙˆÙ„ÛŒ', 'Ú†Ù†Ú«Ø§Úš', 'Ø²Ù…Ø±ÛŒ', 'ÙˆÚ–ÛŒ', 'ØªÙ„Ù‡', 'Ù„Ú“Ù…', 'Ù„ÛŒÙ†Ø¯Û', 'Ù…Ø±ØºÙˆÙ…ÛŒ', 'Ø³Ù„ÙˆØ§ØºÙ‡', 'Ú©Ø¨'],
  en: ['Hamal', 'Sawr', 'Jawza', 'Saratan', 'Asad', 'Sunbula', 'Mizan', 'Aqrab', 'Qaws', 'Jaddi', 'Dalwa', 'Hut'],
};

// Indexed by Date#getDay(), where 0 is Sunday.
const WEEKDAYS = {
  fa: ['ÛŒÚ©Ø´Ù†Ø¨Ù‡', 'Ø¯ÙˆØ´Ù†Ø¨Ù‡', 'Ø³Ù‡â€ŒØ´Ù†Ø¨Ù‡', 'Ú†Ù‡Ø§Ø±Ø´Ù†Ø¨Ù‡', 'Ù¾Ù†Ø¬Ø´Ù†Ø¨Ù‡', 'Ø¬Ù…Ø¹Ù‡', 'Ø´Ù†Ø¨Ù‡'],
  ps: ['ÛŒÚ©Ø´Ù†Ø¨Ù‡', 'Ø¯ÙˆØ´Ù†Ø¨Ù‡', 'Ø¯Ø±ÛØ´Ù†Ø¨Ù‡', 'Ú…Ù„ÙˆØ±Ø´Ù†Ø¨Ù‡', 'Ù¾Ù†Ø¬Ø´Ù†Ø¨Ù‡', 'Ø¬Ù…Ø¹Ù‡', 'Ø´Ù†Ø¨Ù‡'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export function dirOf(locale) {
  return SUPPORTED_LOCALES.find((l) => l.code === locale)?.dir ?? 'rtl';
}

export function intlLocale(locale) {
  return SUPPORTED_LOCALES.find((l) => l.code === locale)?.intl ?? 'en-GB';
}

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.some((l) => l.code === locale) ? locale : 'fa';
}

export function localizeDigits(input, locale) {
  const text = String(input);
  if (locale === 'en') return text.replace(/[Û°-Û¹Ù -Ù©]/g, (d) => String('Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©'.indexOf(d) % 10));
  return text.replace(/[0-9]/g, (d) => EASTERN_DIGITS[Number(d)]);
}

export function nowIso() {
  return new Date().toISOString();
}

// Reporting buckets off a plain local calendar date instead of a UTC instant, so
// a bill entered late Friday can never roll into Saturday's week (Â§6, Â§24).
export function businessDate(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return toIsoDate(date);
  }
}

export function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isValidDate(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr ?? '')) && !Number.isNaN(Date.parse(`${dateStr}T00:00:00Z`));
}

function parseDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`);
}

export function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dayOfWeek(dateStr) {
  return parseDate(dateStr).getUTCDay();
}

export function weekdayName(dateStr, locale = 'fa') {
  const list = WEEKDAYS[locale] ?? WEEKDAYS.fa;
  return list[dayOfWeek(dateStr)];
}

// Week runs Saturday..Friday (Â§24). Offset maps Sat->0, Sun->1 ... Fri->6.
export function weekStartOf(dateStr) {
  return addDays(dateStr, -((dayOfWeek(dateStr) + 1) % 7));
}

export function weekEndOf(dateStr) {
  return addDays(weekStartOf(dateStr), 6);
}

export function isThursday(dateStr) {
  return dayOfWeek(dateStr) === 4;
}

export function monthStartOf(dateStr) {
  return dateStr.slice(0, 8) + '01';
}

export function monthEndOf(dateStr) {
  return addDays(addDays(monthStartOf(dateStr), 32).slice(0, 8) + '01', -1);
}

export function toJalali(dateStr) {
  if (!isValidDate(dateStr)) return null;
  const [gy, gm, gd] = dateStr.split('-').map(Number);
  return jalaali.toJalaali(gy, gm, gd);
}

export function toGregorian(jy, jm, jd) {
  const result = jalaali.toGregorian(Number(jy), Number(jm), Number(jd));
  return `${result.gy}-${String(result.gm).padStart(2, '0')}-${String(result.gd).padStart(2, '0')}`;
}

export function jalaliMonthName(jm, locale = 'fa') {
  const list = JALALI_MONTHS[locale] ?? JALALI_MONTHS.fa;
  return list[Number(jm) - 1] ?? '';
}

export function formatDate(dateStr, locale = 'fa') {
  const j = toJalali(dateStr);
  if (!j) return '';
  const text = `${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`;
  return localizeDigits(text, locale);
}

export function formatLongDate(dateStr, locale = 'fa') {
  const j = toJalali(dateStr);
  if (!j) return '';
  const parts = [
    weekdayName(dateStr, locale),
    localizeDigits(j.jd, locale),
    jalaliMonthName(j.jm, locale),
    localizeDigits(j.jy, locale),
  ];
  return parts.join(' ');
}

export function formatDateTime(isoTimestamp, locale = 'fa', timeZone = DEFAULT_TIMEZONE) {
  if (!isoTimestamp) return '';
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return '';
  return formatDate(businessDate(date, timeZone), locale);
}

export function jalaliTodayLabel(locale = 'fa', timeZone = DEFAULT_TIMEZONE) {
  const today = businessDate(new Date(), timeZone);
  return formatLongDate(today, locale);
}

// Enumerates every Saturday that starts a week from `from` up to `to` inclusive.
export function eachWeekStart(fromDate, toDate) {
  const starts = [];
  let cursor = weekStartOf(fromDate);
  const limit = weekStartOf(toDate);
  while (cursor <= limit) {
    starts.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return starts;
}

