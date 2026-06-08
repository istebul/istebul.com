/**
 * AI Listings Auto Collector — XML adapter (Sprint-13).
 */

import { COLLECTOR_SUPPORTED_FIELDS } from './collector-validator.js';

/**
 * @param {string} xml
 * @returns {string}
 */
function decodeXmlValue(xml) {
  return String(xml ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * @param {string} block
 * @returns {Record<string, unknown>}
 */
function parseXmlListingBlock(block) {
  /** @type {Record<string, unknown>} */
  const row = {};
  for (const field of COLLECTOR_SUPPORTED_FIELDS) {
    const pattern = new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\\/${field}>`, 'i');
    const match = block.match(pattern);
    if (match) row[field] = decodeXmlValue(match[1]);
  }
  return row;
}

/**
 * @param {string} content
 * @returns {Record<string, unknown>[]}
 */
export function parseXmlAdapter(content) {
  const raw = String(content ?? '').trim();
  if (!raw) return [];

  const blocks = raw.match(/<(listing|item|record)\b[\s\S]*?<\/\1>/gi) ?? [];
  if (!blocks.length) {
    throw new Error('XML içinde listing/item/record düğümü bulunamadı');
  }

  return blocks.map(parseXmlListingBlock).filter((row) => Object.keys(row).length > 0);
}
