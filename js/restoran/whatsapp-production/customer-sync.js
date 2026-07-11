/**
 * GarsonAI production WhatsApp customer sync (phone-based upsert).
 */
import { upsertCustomer } from '../database/customer-repository.js';
import { isGarsonSupabaseClientAvailable, getGarsonDataClient } from '../data-service.js';
import { requireRestaurantId } from '../database/tenant-utils.js';
import { normalizeWhatsAppCustomer } from '../whatsapp/order-builder.js';

export class WhatsAppCustomerSyncError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WhatsAppCustomerSyncError';
  }
}

/**
 * @param {string} phone
 * @returns {string}
 */
export function normalizeWhatsAppPhone(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? digits : `+${digits.replace(/^\+/, '')}`;
}

/**
 * @param {{ restaurantId?: string, customer?: { phone?: string, name?: string, whatsappId?: string }, orderTotal?: number|null, client?: import('@supabase/supabase-js').SupabaseClient, useSupabase?: boolean }} options
 * @returns {Promise<{ synced: boolean, source: 'supabase'|'mock', customer: Record<string, unknown>|null }>}
 */
export async function syncWhatsAppCustomer(options = {}) {
  const restaurantId = requireRestaurantId(options.restaurantId);
  const normalized = normalizeWhatsAppCustomer(options.customer);
  const phone = normalizeWhatsAppPhone(normalized.phone || normalized.whatsappId || '');

  if (!phone) {
    throw new WhatsAppCustomerSyncError('Müşteri telefonu gerekli.');
  }

  const client = options.client || getGarsonDataClient(options);
  if (!isGarsonSupabaseClientAvailable(client, options)) {
    return {
      synced: false,
      source: 'mock',
      customer: {
        id: `mock-${phone}`,
        restaurantId,
        name: normalized.name || 'WhatsApp Müşteri',
        phone
      }
    };
  }

  const saved = await upsertCustomer({
    restaurantId,
    client,
    customer: {
      name: normalized.name || 'WhatsApp Müşteri',
      phone,
      totalOrders: 1,
      totalSpent: options.orderTotal ?? 0,
      lastOrderAt: new Date().toISOString()
    }
  });

  if (saved.restaurantId !== restaurantId) {
    throw new WhatsAppCustomerSyncError('Tenant izolasyonu ihlali: müşteri farklı restorana ait.');
  }

  return { synced: true, source: 'supabase', customer: saved };
}
