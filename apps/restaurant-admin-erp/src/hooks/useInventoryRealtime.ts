import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

interface UseInventoryRealtimeOptions {
  restaurantId: string;
  enabled?: boolean;
  onChange: () => void;
  onStatus?: (status: string) => void;
}

function buildChannelName(restaurantId: string): string {
  return `garson:${restaurantId}:erp-inventory`;
}

export function useInventoryRealtime({
  restaurantId,
  enabled = true,
  onChange,
  onStatus,
}: UseInventoryRealtimeOptions) {
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

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items', filter },
        () => onChangeRef.current(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_categories', filter },
        () => onChangeRef.current(),
      )
      .subscribe((status) => {
        onStatus?.(String(status));
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled, restaurantId, onStatus]);
}
