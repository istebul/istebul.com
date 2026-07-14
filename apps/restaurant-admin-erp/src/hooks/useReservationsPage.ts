import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchReservationsPageData,
  type DatePreset,
  type ReservationListItem,
  type ReservationsKpis,
  type RestaurantTableRow,
} from '@/data/reservations-api';
import { useReservationsRealtime } from '@/hooks/useReservationsRealtime';
import { getSupabaseClient } from '@/lib/supabase';

interface UseReservationsPageResult {
  rows: ReservationListItem[];
  tables: RestaurantTableRow[];
  salons: string[];
  kpis: ReservationsKpis | null;
  isLoading: boolean;
  error: string | null;
  datePreset: DatePreset;
  status: string | null;
  salon: string | null;
  tableId: string | null;
  guestCount: number | null;
  search: string;
  selectedId: string | null;
  selected: ReservationListItem | null;
  realtimeStatus: string;
  setDatePreset: (value: DatePreset) => void;
  setStatus: (value: string | null) => void;
  setSalon: (value: string | null) => void;
  setTableId: (value: string | null) => void;
  setGuestCount: (value: number | null) => void;
  setSearch: (value: string) => void;
  openReservation: (id: string) => void;
  closeReservation: () => void;
  reload: () => Promise<void>;
}

export function useReservationsPage(restaurantId: string): UseReservationsPageResult {
  const [rows, setRows] = useState<ReservationListItem[]>([]);
  const [tables, setTables] = useState<RestaurantTableRow[]>([]);
  const [salons, setSalons] = useState<string[]>([]);
  const [kpis, setKpis] = useState<ReservationsKpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [status, setStatus] = useState<string | null>(null);
  const [salon, setSalon] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState('INIT');
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      const data = await fetchReservationsPageData(client, restaurantId, {
        datePreset,
        status,
        salon,
        tableId,
        guestCount,
        search,
      });
      if (!isMounted.current) return;
      setRows(data.rows);
      setTables(data.tables);
      setSalons(data.salons);
      setKpis(data.kpis);
    } catch (loadError) {
      if (!isMounted.current) return;
      setError(
        loadError instanceof Error ? loadError.message : 'Rezervasyonlar yüklenemedi.',
      );
      setRows([]);
      setTables([]);
      setSalons([]);
      setKpis(null);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [restaurantId, datePreset, status, salon, tableId, guestCount, search]);

  useEffect(() => {
    isMounted.current = true;
    void load();
    return () => {
      isMounted.current = false;
    };
  }, [load]);

  useReservationsRealtime({
    restaurantId,
    enabled: Boolean(restaurantId),
    onChange: () => {
      void load();
    },
    onStatus: setRealtimeStatus,
  });

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  return {
    rows,
    tables,
    salons,
    kpis,
    isLoading,
    error,
    datePreset,
    status,
    salon,
    tableId,
    guestCount,
    search,
    selectedId,
    selected,
    realtimeStatus,
    setDatePreset,
    setStatus,
    setSalon,
    setTableId,
    setGuestCount,
    setSearch,
    openReservation: (id: string) => setSelectedId(id),
    closeReservation: () => setSelectedId(null),
    reload: load,
  };
}
