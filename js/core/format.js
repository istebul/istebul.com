/**
 * Locale-aware formatting (currency, numbers, dates).
 */
import { getActiveLocale, getLocaleDefinition } from '../platform/locale-registry.js';

const CURRENCY_FRACTIONS = {
  TRY: 0,
  USD: 0,
  EUR: 0,
  SAR: 0,
  GBP: 0
};

export function formatNumber(value, localeId = getActiveLocale()) {
  const def = getLocaleDefinition(localeId);
  return new Intl.NumberFormat(def.bcp47, {
    maximumFractionDigits: 0
  }).format(Math.round(Number(value) || 0));
}

export function formatMoney(
  value,
  localeId = getActiveLocale(),
  { currency, showSymbol = true, suffix = '' } = {}
) {
  const def = getLocaleDefinition(localeId);
  const code = currency || def.currency;
  const amount = Number(value) || 0;
  const fractionDigits = CURRENCY_FRACTIONS[code] ?? 0;

  if (!showSymbol) {
    return formatNumber(amount, localeId) + suffix;
  }

  try {
    return (
      new Intl.NumberFormat(def.bcp47, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: fractionDigits
      }).format(amount) + suffix
    );
  } catch {
    return `${formatNumber(amount, localeId)} ${code}${suffix}`;
  }
}

export function formatDate(
  value,
  localeId = getActiveLocale(),
  options = { dateStyle: 'medium' }
) {
  const def = getLocaleDefinition(localeId);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(def.bcp47, options).format(date);
}

export function formatDateTime(value, localeId = getActiveLocale()) {
  return formatDate(value, localeId, { dateStyle: 'medium', timeStyle: 'short' });
}

const RELATIVE_LABELS = {
  tr: { now: 'Şimdi', minute: 'dakika önce', hour: 'saat önce', day: 'gün önce' },
  en: { now: 'Just now', minute: 'min ago', hour: 'h ago', day: 'd ago' },
  de: { now: 'Gerade eben', minute: 'Min. her', hour: 'Std. her', day: 'Tage her' },
  ar: { now: 'الآن', minute: 'دقيقة', hour: 'ساعة', day: 'يوم' }
};

export function formatRelativeTime(value, localeId = getActiveLocale()) {
  const labels = RELATIVE_LABELS[localeId] || RELATIVE_LABELS.en;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return labels.now;
  if (minutes < 60) return `${minutes} ${labels.minute}`;
  if (hours < 24) return `${hours} ${labels.hour}`;
  if (days < 7) return `${days} ${labels.day}`;

  return formatDate(date, localeId);
}
