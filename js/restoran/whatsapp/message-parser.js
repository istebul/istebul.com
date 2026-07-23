/**
 * GarsonAI WhatsApp message parser (Turkish free-text order extraction).
 */
import { detectIntent } from './intent-detector.js';

/** @type {readonly RegExp[]} */
const TRAILING_ACTION_PATTERNS = [
  /\s+gönder\s*$/i,
  /\s+sipariş\s*(ver|et)?\s*$/i,
  /\s+lütfen\s*$/i
];

/** @type {readonly RegExp[]} */
const NOTE_PATTERNS = [
  /\bbiri\s+acısız\b/i,
  /\bacısız\b/i,
  /\bacılı\b/i,
  /\bsosuz\b/i,
  /\baz\s+pişmiş\b/i,
  /\bbol\s+soğanlı\b/i,
  /\bekstra\b/i
];

/**
 * @typedef {Object} ParsedWhatsAppItem
 * @property {string} name
 * @property {number} quantity
 * @property {string} [note]
 */

/**
 * @typedef {Object} ParsedWhatsAppMessage
 * @property {string} intent
 * @property {string} raw
 * @property {ParsedWhatsAppItem[]} items
 */

/**
 * @param {string} segment
 * @returns {{ name: string, note?: string }}
 */
function splitItemNameAndNote(segment) {
  const trimmed = String(segment || '').trim();
  if (!trimmed) return { name: '' };

  for (const pattern of NOTE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match || match.index == null) continue;

    const note = match[0].trim();
    const name = trimmed.slice(0, match.index).trim();
    if (name) {
      return { name, note };
    }
  }

  return { name: trimmed };
}

/**
 * @param {string} message
 * @returns {string}
 */
export function normalizeOrderMessage(message) {
  let text = String(message || '').trim().toLowerCase();
  text = text.replace(/[,.;!?]+/g, ' ');

  for (const pattern of TRAILING_ACTION_PATTERNS) {
    text = text.replace(pattern, '');
  }

  return text.replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} message
 * @returns {ParsedWhatsAppItem[]}
 */
export function extractOrderItems(message) {
  const text = normalizeOrderMessage(message);
  if (!text) return [];

  const segmentPattern = /(\d+)\s+(.+?)(?=\s+\d+\s+|$)/gi;
  /** @type {ParsedWhatsAppItem[]} */
  const items = [];

  let match = segmentPattern.exec(text);
  while (match) {
    const quantityRaw = Number.parseInt(match[1], 10);
    const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;
    const { name, note } = splitItemNameAndNote(match[2]);

    if (name) {
      /** @type {ParsedWhatsAppItem} */
      const item = { name, quantity };
      if (note) item.note = note;
      items.push(item);
    }

    match = segmentPattern.exec(text);
  }

  return items;
}

/**
 * @param {string} message
 * @param {{ intent?: string }} [options]
 * @returns {ParsedWhatsAppMessage}
 */
export function parseWhatsAppMessage(message, options = {}) {
  const raw = String(message || '').trim();
  const intent = String(options.intent || detectIntent(raw) || 'unknown');

  return {
    intent,
    raw,
    items: intent === 'new_order' ? extractOrderItems(raw) : []
  };
}
