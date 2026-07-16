import { useEffect, useState } from 'react';
import { paymentGatewayRealtimeChannel } from '@istebul/payment-gateway';
import { getSupabaseClient } from '@/lib/supabase';

/**
 * Subscribes to P8-E payment gateway realtime channel naming.
 * Channel: garson:{restaurantId}:payment-gateway
 */
export function usePaymentGatewaysRealtime(restaurantId: string | null | undefined) {
  const [status, setStatus] = useState('INIT');

  useEffect(() => {
    if (!restaurantId) {
      setStatus('IDLE');
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setStatus('NO_CLIENT');
      return;
    }

    const channelName = paymentGatewayRealtimeChannel(restaurantId);
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_authorizations',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          setStatus('EVENT');
        },
      )
      .subscribe((subscribeStatus) => {
        setStatus(String(subscribeStatus));
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [restaurantId]);

  return { status };
}
