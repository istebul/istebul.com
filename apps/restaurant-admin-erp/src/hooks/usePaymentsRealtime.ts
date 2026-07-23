import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

interface UsePaymentsRealtimeOptions {
  restaurantId: string;
  enabled?: boolean;
  onChange: () => void;
  onStatus?: (status: string) => void;
}

function buildChannelName(restaurantId: string): string {
  return `garson:${restaurantId}:erp-payments`;
}

export function usePaymentsRealtime({
  restaurantId,
  enabled = true,
  onChange,
  onStatus,
}: UsePaymentsRealtimeOptions) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !restaurantId) return undefined;

    const client = getSupabaseClient();
    if (!client || typeof client.channel !== 'function') {
      onStatus?.('UNAVAILABLE');
      return undefined;
    }

    const channelName = buildChannelName(restaurantId);
    const filter = `restaurant_id=eq.${restaurantId}`;
    const notify = () => onChangeRef.current();

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_transactions', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'refund_transactions', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_policies', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_providers', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_audit_logs', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservation_guarantees', filter },
        notify,
      )
      .subscribe((status) => {
        onStatus?.(String(status));
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled, restaurantId, onStatus]);
}
