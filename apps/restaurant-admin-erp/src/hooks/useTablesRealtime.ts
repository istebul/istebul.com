import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

interface UseTablesRealtimeOptions {
  restaurantId: string;
  enabled?: boolean;
  onChange: () => void;
  onStatus?: (status: string) => void;
}

function buildChannelName(restaurantId: string): string {
  return `garson:${restaurantId}:erp-tables`;
}

export function useTablesRealtime({
  restaurantId,
  enabled = true,
  onChange,
  onStatus,
}: UseTablesRealtimeOptions) {
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
        { event: 'INSERT', schema: 'public', table: 'restaurant_tables', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'restaurant_tables', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'restaurant_tables', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reservations', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reservations', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reservations', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders', filter },
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
