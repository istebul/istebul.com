import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

interface UseOrderRealtimeOptions {
  restaurantId: string;
  enabled?: boolean;
  channelSuffix?: string;
  onChange: () => void;
  onStatus?: (status: string) => void;
}

function buildChannelName(restaurantId: string, suffix: string): string {
  return `garson:${restaurantId}:${suffix}`;
}

export function useOrderRealtime({
  restaurantId,
  enabled = true,
  channelSuffix = 'erp-dashboard',
  onChange,
  onStatus,
}: UseOrderRealtimeOptions) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !restaurantId) return undefined;

    const client = getSupabaseClient();
    if (!client || typeof client.channel !== 'function') {
      onStatus?.('UNAVAILABLE');
      return undefined;
    }

    const channelName = buildChannelName(restaurantId, channelSuffix);
    const filter = `restaurant_id=eq.${restaurantId}`;

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter },
        () => onChangeRef.current(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter },
        () => onChangeRef.current(),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders', filter },
        () => onChangeRef.current(),
      )
      .subscribe((status) => {
        onStatus?.(String(status));
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled, restaurantId, channelSuffix, onStatus]);
}
