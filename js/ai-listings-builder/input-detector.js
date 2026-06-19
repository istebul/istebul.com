/**
 * AI Auto Listing Builder — input type detection.
 */

import { logBuilderStage } from './debug-log.js';

/** @typedef {'text'|'url'|'json'|'csv'} BuilderInputType */

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function looksLikeHttpUrl(value) {
  const trimmed = String(value ?? '').trim();
  return /^https?:\/\//i.test(trimmed);
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function looksLikeJson(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'object' && parsed !== null;
  } catch {
    return false;
  }
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function looksLikeCsv(value) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 1) return false;

  const header = lines[0];
  if (!header.includes(',')) return false;

  const headers = header.split(',').map((part) => part.trim().toLowerCase());
  const knownHeaders = new Set([
    'category',
    'title',
    'description',
    'price',
    'currency',
    'location',
    'source_url',
    'images',
    'attributes',
    'brand',
    'model',
    'year',
    'km'
  ]);

  return headers.some((headerName) => knownHeaders.has(headerName));
}

/**
 * Detect builder input type.
 * @param {unknown} rawInput
 * @returns {BuilderInputType}
 */
export function detectInputType(rawInput) {
  const value = String(rawInput ?? '').trim();
  if (!value) {
    logBuilderStage('input-detector', { detected: 'text', empty: true });
    return 'text';
  }

  if (looksLikeHttpUrl(value)) {
    logBuilderStage('input-detector', { detected: 'url' });
    return 'url';
  }

  if (looksLikeJson(value)) {
    logBuilderStage('input-detector', { detected: 'json' });
    return 'json';
  }

  if (looksLikeCsv(value)) {
    logBuilderStage('input-detector', { detected: 'csv' });
    return 'csv';
  }

  logBuilderStage('input-detector', { detected: 'text', length: value.length });
  return 'text';
}
