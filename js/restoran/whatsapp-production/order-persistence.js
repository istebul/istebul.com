/**
 * GarsonAI production WhatsApp order persistence (repository layer).
 */
import { createOrder } from '../database/order-repository.js';
import { isGarsonSupabaseClientAvailable, getGarsonDataClient } from '../data-service.js';
import { requireRestaurantId } from '../database/tenant-utils.js';

export class WhatsAppProductionPersistenceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WhatsAppProductionPersistenceError';
  }
}

/**
 * @param {import('../whatsapp/order-builder.js').WhatsAppOrder|null|undefined} whatsappOrder
 * @param {{ restaurantId?: string, customerId?: string, client?: import('@supabase/supabase-js').SupabaseClient, useSupabase?: boolean }} [options]
 * @returns {Promise<{ persisted: boolean, source: 'supabase'|'mock', order: Record<string, unknown>|null }>}
 */
export async function persistProductionOrder(whatsappOrder, options = {}) {
  const restaurantId = requireRestaurantId(
    options.restaurantId || whatsappOrder?.restaurantId
  );

  if (!whatsappOrder) {
    throw new WhatsAppProductionPersistenceError('Kaydedilecek sipariş bulunamadı.');
  }

  if (
    whatsappOrder.restaurantId &&
    String(whatsappOrder.restaurantId).trim() !== restaurantId
  ) {
    throw new WhatsAppProductionPersistenceError(
      'Tenant izolasyonu ihlali: sipariş farklı restorana ait.'
    );
  }

  const client = options.client || getGarsonDataClient(options);
  if (!isGarsonSupabaseClientAvailable(client, options)) {
    return { persisted: false, source: 'mock', order: null };
  }

  const saved = await createOrder({
    restaurantId,
    client,
    order: {
      status: whatsappOrder.status,
      totalAmount: whatsappOrder.total,
      source: whatsappOrder.source || 'whatsapp',
      customerId: options.customerId
    },
    items: (whatsappOrder.items || []).map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      note: item.note
    }))
  });

  return { persisted: true, source: 'supabase', order: saved };
}
