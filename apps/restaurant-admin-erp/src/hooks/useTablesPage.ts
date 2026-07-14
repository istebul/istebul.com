import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchTablesPageData,
  type FloorTableCard,
  type TablesKpis,
} from '@/data/tables-api';
import { useTablesRealtime } from '@/hooks/useTablesRealtime';
import { getSupabaseClient } from '@/lib/supabase';

interface UseTablesPageResult {
  tables: FloorTableCard[];
  filteredTables: FloorTableCard[];
  salons: string[];
  activeSalon: string | null;
  kpis: TablesKpis | null;
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  selected: FloorTableCard | null;
  realtimeStatus: string;
  setActiveSalon: (salon: string | null) => void;
  openTable: (id: string) => void;
  closeTable: () => void;
  reload: () => Promise<void>;
}

export function useTablesPage(restaurantId: string): UseTablesPageResult {
  const [tables, setTables] = useState<FloorTableCard[]>([]);
  const [salons, setSalons] = useState<string[]>([]);
  const [activeSalon, setActiveSalon] = useState<string | null>(null);
  const [kpis, setKpis] = useState<TablesKpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState('INIT');
  const isMounted = useRef(true);
  const salonInitialized = useRef(false);
  const activeSalonRef = useRef<string | null>(null);
  activeSalonRef.current = activeSalon;

  const load = useCallback(async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      const data = await fetchTablesPageData(client, restaurantId);
      if (!isMounted.current) return;
      setTables(data.tables);
      setSalons(data.salons);
      setKpis(data.kpis);

      if (!salonInitialized.current) {
        salonInitialized.current = true;
        setActiveSalon(data.salons[0] ?? null);
      } else if (
        activeSalonRef.current &&
        data.salons.length > 0 &&
        !data.salons.includes(activeSalonRef.current)
      ) {
        setActiveSalon(data.salons[0] ?? null);
      }
    } catch (loadError) {
      if (!isMounted.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Masa planı yüklenemedi.');
      setTables([]);
      setSalons([]);
      setKpis(null);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    isMounted.current = true;
    void load();
    return () => {
      isMounted.current = false;
    };
  }, [load]);

  useTablesRealtime({
    restaurantId,
    enabled: Boolean(restaurantId),
    onChange: () => {
      void load();
    },
    onStatus: setRealtimeStatus,
  });

  const filteredTables = useMemo(() => {
    if (!activeSalon) return tables;
    return tables.filter((table) => table.salon === activeSalon);
  }, [tables, activeSalon]);

  const selected = useMemo(
    () => tables.find((table) => table.id === selectedId) ?? null,
    [tables, selectedId],
  );

  return {
    tables,
    filteredTables,
    salons,
    activeSalon,
    kpis,
    isLoading,
    error,
    selectedId,
    selected,
    realtimeStatus,
    setActiveSalon,
    openTable: (id: string) => setSelectedId(id),
    closeTable: () => setSelectedId(null),
    reload: load,
  };
}
