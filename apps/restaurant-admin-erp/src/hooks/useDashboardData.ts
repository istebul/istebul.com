import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboardData, type DashboardData } from '@/data/dashboard-api';
import { getSupabaseClient } from '@/lib/supabase';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';

interface UseDashboardDataResult {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  realtimeStatus: string;
}

export function useDashboardData(restaurantId: string): UseDashboardDataResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState('INIT');
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    if (!restaurantId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      const nextData = await fetchDashboardData(client, restaurantId);
      if (isMounted.current) {
        setData(nextData);
      }
    } catch (loadError) {
      if (isMounted.current) {
        const message =
          loadError instanceof Error ? loadError.message : 'Dashboard verileri yüklenemedi.';
        setError(message);
        setData(null);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [restaurantId]);

  useEffect(() => {
    isMounted.current = true;
    void load();
    return () => {
      isMounted.current = false;
    };
  }, [load]);

  useOrderRealtime({
    restaurantId,
    enabled: Boolean(restaurantId),
    onChange: () => {
      void load();
    },
    onStatus: setRealtimeStatus,
  });

  return {
    data,
    isLoading,
    error,
    reload: load,
    realtimeStatus,
  };
}
