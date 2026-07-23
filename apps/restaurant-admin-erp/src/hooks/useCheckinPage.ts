import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  assignReservationTable,
  cancelWaitlistEntry,
  checkInReservation,
  createWalkInParty,
  fetchCheckinPageData,
  markReservationLate,
  markReservationNoShow,
  seatWaitlistEntry,
  type CheckinJourneyItem,
  type CheckinKpis,
  type CheckinTableOption,
  type WaitlistItem,
} from '@/data/checkin-api';
import { useCheckinRealtime } from '@/hooks/useCheckinRealtime';
import { getSupabaseClient } from '@/lib/supabase';

interface UseCheckinPageResult {
  reservations: CheckinJourneyItem[];
  waitlist: WaitlistItem[];
  tables: CheckinTableOption[];
  kpis: CheckinKpis | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  actionError: string | null;
  selectedId: string | null;
  selected: CheckinJourneyItem | null;
  realtimeStatus: string;
  openReservation: (id: string) => void;
  closeReservation: () => void;
  reload: () => Promise<void>;
  checkIn: (id: string) => Promise<void>;
  markLate: (id: string) => Promise<void>;
  markNoShow: (id: string) => Promise<void>;
  assignTable: (reservationId: string, tableId: string) => Promise<void>;
  createWalkIn: (input: {
    customerName: string;
    phone?: string;
    guestCount: number;
    preferredSalon?: string;
    notes?: string;
  }) => Promise<void>;
  seatWaitlist: (waitlistId: string, tableId: string) => Promise<void>;
  cancelWaitlist: (waitlistId: string) => Promise<void>;
  clearActionError: () => void;
}

export function useCheckinPage(restaurantId: string): UseCheckinPageResult {
  const [reservations, setReservations] = useState<CheckinJourneyItem[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  const [tables, setTables] = useState<CheckinTableOption[]>([]);
  const [kpis, setKpis] = useState<CheckinKpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState('INIT');
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      const data = await fetchCheckinPageData(client, restaurantId);
      if (!isMounted.current) return;
      setReservations(data.reservations);
      setWaitlist(data.waitlist);
      setTables(data.tables);
      setKpis(data.kpis);
    } catch (loadError) {
      if (!isMounted.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Check-in verisi yüklenemedi.');
      setReservations([]);
      setWaitlist([]);
      setTables([]);
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

  useCheckinRealtime({
    restaurantId,
    enabled: Boolean(restaurantId),
    onChange: () => {
      void load();
    },
    onStatus: setRealtimeStatus,
  });

  const runMutation = useCallback(
    async (action: () => Promise<void>) => {
      setIsMutating(true);
      setActionError(null);
      try {
        await action();
        await load();
      } catch (mutationError) {
        setActionError(
          mutationError instanceof Error ? mutationError.message : 'İşlem tamamlanamadı.',
        );
        throw mutationError;
      } finally {
        if (isMounted.current) setIsMutating(false);
      }
    },
    [load],
  );

  const selected = useMemo(
    () => reservations.find((item) => item.id === selectedId) ?? null,
    [reservations, selectedId],
  );

  return {
    reservations,
    waitlist,
    tables,
    kpis,
    isLoading,
    isMutating,
    error,
    actionError,
    selectedId,
    selected,
    realtimeStatus,
    openReservation: (id: string) => setSelectedId(id),
    closeReservation: () => setSelectedId(null),
    reload: load,
    checkIn: (id) =>
      runMutation(async () => {
        await checkInReservation(getSupabaseClient(), restaurantId, id);
      }),
    markLate: (id) =>
      runMutation(async () => {
        await markReservationLate(getSupabaseClient(), restaurantId, id);
      }),
    markNoShow: (id) =>
      runMutation(async () => {
        await markReservationNoShow(getSupabaseClient(), restaurantId, id);
      }),
    assignTable: (reservationId, tableId) =>
      runMutation(async () => {
        await assignReservationTable(getSupabaseClient(), restaurantId, reservationId, tableId);
      }),
    createWalkIn: (input) =>
      runMutation(async () => {
        await createWalkInParty(getSupabaseClient(), restaurantId, input);
      }),
    seatWaitlist: (waitlistId, tableId) =>
      runMutation(async () => {
        await seatWaitlistEntry(getSupabaseClient(), restaurantId, waitlistId, tableId);
      }),
    cancelWaitlist: (waitlistId) =>
      runMutation(async () => {
        await cancelWaitlistEntry(getSupabaseClient(), restaurantId, waitlistId);
      }),
    clearActionError: () => setActionError(null),
  };
}
