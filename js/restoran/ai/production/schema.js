/**
 * GarsonAI production JSON Schema ve Zod doğrulama.
 */
import {
  zodEnum,
  zodNumber,
  zodObject,
  zodOptionalString,
  zodString
} from './zod-validator.js';
import { WHATSAPP_INTENTS } from '../../whatsapp/intent-detector.js';

export const ORDER_ITEM_JSON_SCHEMA = Object.freeze({
  type: 'object',
  required: ['name', 'quantity'],
  properties: {
    name: { type: 'string', minLength: 1 },
    quantity: { type: 'number', minimum: 1 },
    note: { type: 'string' }
  }
});

export const PARSED_MESSAGE_JSON_SCHEMA = Object.freeze({
  type: 'object',
  required: ['intent', 'raw', 'items'],
  properties: {
    intent: { type: 'string', enum: [...WHATSAPP_INTENTS] },
    raw: { type: 'string' },
    items: {
      type: 'array',
      items: ORDER_ITEM_JSON_SCHEMA
    }
  }
});

const validateOrderItemZod = zodObject({
  name: zodString(1),
  quantity: zodNumber(1),
  note: zodOptionalString()
});

const validateParsedMessageZod = zodObject({
  intent: zodEnum(WHATSAPP_INTENTS),
  raw: zodString(0),
  items: (value, path, errors) => {
    if (!Array.isArray(value)) {
      errors.push(`${path}: dizi bekleniyor`);
      return [];
    }
    return value.map((item, index) => {
      const result = validateOrderItemZod(item);
      if (!result.ok) {
        errors.push(...result.errors.map((err) => `${path}[${index}].${err}`));
        return null;
      }
      return result.data;
    }).filter(Boolean);
  }
});

/**
 * @param {unknown} schema
 * @param {unknown} value
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateJsonSchema(schema, value) {
  /** @type {string[]} */
  const errors = [];

  if (!schema || typeof schema !== 'object') {
    return { ok: false, errors: ['Şema tanımsız'] };
  }

  const row = /** @type {Record<string, unknown>} */ (schema);
  if (row.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, errors: ['Kök değer nesne olmalı'] };
    }
    const obj = /** @type {Record<string, unknown>} */ (value);
    const required = Array.isArray(row.required) ? row.required : [];
    for (const key of required) {
      if (obj[key] == null || obj[key] === '') {
        errors.push(`Eksik alan: ${key}`);
      }
    }
    const properties = /** @type {Record<string, unknown>} */ (row.properties || {});
    for (const [key, propSchema] of Object.entries(properties)) {
      if (obj[key] == null) continue;
      const nested = validateJsonSchema(propSchema, obj[key]);
      errors.push(...nested.errors.map((err) => `${key}.${err}`));
    }
  }

  if (row.type === 'array' && Array.isArray(value)) {
    const itemSchema = row.items;
    value.forEach((item, index) => {
      const nested = validateJsonSchema(itemSchema, item);
      errors.push(...nested.errors.map((err) => `[${index}].${err}`));
    });
  }

  if (row.type === 'string' && typeof value === 'string') {
    const minLength = Number(row.minLength || 0);
    if (value.trim().length < minLength) {
      errors.push('Metin çok kısa');
    }
    if (Array.isArray(row.enum) && !row.enum.includes(value)) {
      errors.push('Geçersiz enum değeri');
    }
  }

  if (row.type === 'number' && typeof value === 'number') {
    const minimum = Number(row.minimum ?? 0);
    if (value < minimum) errors.push('Sayı minimumun altında');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * @param {unknown} parsed
 * @returns {{ ok: boolean, data: Record<string, unknown>|null, errors: string[] }}
 */
export function validateParsedMessage(parsed) {
  const jsonSchema = validateJsonSchema(PARSED_MESSAGE_JSON_SCHEMA, parsed);
  const zodResult = validateParsedMessageZod(parsed);

  const errors = [...jsonSchema.errors, ...zodResult.errors];
  return {
    ok: jsonSchema.ok && zodResult.ok,
    data: zodResult.ok ? /** @type {Record<string, unknown>} */ (zodResult.data) : null,
    errors
  };
}
