/** Shared demo tenant payload for GarsonAI admin modules. */

/**
 * @returns {Record<string, unknown>}
 */
export function getMockDemoTenantPayload() {
  return {
    restaurant: {
      id: 'a0000000-0000-4000-8000-00000000cafe',
      name: 'Demo Cafe',
      slug: 'demo-cafe',
      status: 'active',
      plan: 'pilot',
      onboarding_status: 'completed',
      created_at: '2026-07-08T12:00:00Z'
    },
    settings: {
      restaurant_id: 'a0000000-0000-4000-8000-00000000cafe',
      whatsapp_enabled: true,
      preorder_enabled: true,
      kitchen_enabled: true,
      ai_enabled: true
    },
    user: {
      restaurant_id: 'a0000000-0000-4000-8000-00000000cafe',
      user_id: 'demo-owner',
      role: 'owner'
    },
    stats: {
      today_reservations: 12,
      active_preorders: 4,
      kitchen_queue_count: 3,
      kitchen_status: 'preparing'
    }
  };
}
