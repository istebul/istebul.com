import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

interface UseCxRealtimeOptions {
  restaurantId: string;
  enabled?: boolean;
  onChange: () => void;
  onStatus?: (status: string) => void;
}

export function useCxRealtime({
  restaurantId,
  enabled = true,
  onChange,
  onStatus,
}: UseCxRealtimeOptions) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !restaurantId) return undefined;

    const client = getSupabaseClient();
    if (!client || typeof client.channel !== 'function') {
      onStatus?.('UNAVAILABLE');
      return undefined;
    }

    const channelName = `garson:${restaurantId}:cx-experience`;
    const filter = `restaurant_id=eq.${restaurantId}`;
    const notify = () => onChangeRef.current();

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'restaurant_tables', filter },
        notify,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations', filter },
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
