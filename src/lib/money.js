// Money is stored as integer minor units (afghani x 100) so that no float
// rounding can ever leak into an invoice total or a weekly profit figure.
export const MINOR_PER_UNIT = 100;
export const DEFAULT_DECIMALS = 2;

// Parses from the decimal string rather than via Number(x) * 100, because
// 4.005 * 100 === 400.49999... would silently drop a cent.
export function toMinor(value) {
  if (value === null || value === undefined) return 0;

  let text = String(value).trim().replace(/[,٬\s]/g, '');
  if (text === '') return 0;

  let negative = false;
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }

  text = text.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  text = text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  if (!/^\d*\.?\d*$/.test(text)) return 0;

  const [intPart = '0', fracPart = ''] = text.split('.');
  const fraction = (fracPart + '00').slice(0, 2);
  const minor = Number(intPart || '0') * MINOR_PER_UNIT + Number(fraction);
  if (!Number.isFinite(minor)) return 0;

  return negative ? -minor : minor;
}

export function fromMinor(minor) {
  const value = Number(minor) || 0;
  return value / MINOR_PER_UNIT;
}

export function isValidMinor(minor) {
  return Number.isInteger(minor) && Number.isFinite(minor);
}

export function formatNumber(value, locale = 'en', decimals = DEFAULT_DECIMALS) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numeric);
  } catch {
    return numeric.toFixed(decimals);
  }
}

export function formatMoney(minor, { locale = 'en', currency = 'AFN', decimals = DEFAULT_DECIMALS, withCurrency = true } = {}) {
  const text = formatNumber(fromMinor(minor), locale, decimals);
  if (!withCurrency || !currency) return text;
  const separator = locale === 'en' ? ' ' : ' ';
  return `${text}${separator}${currency}`;
}

export function formatQuantity(quantity, locale = 'en') {
  const numeric = Number(quantity) || 0;
  if (Number.isInteger(numeric)) return formatNumber(numeric, locale, 0);
  return formatNumber(numeric, locale, 2).replace(/\.?0+$/, '');
}
