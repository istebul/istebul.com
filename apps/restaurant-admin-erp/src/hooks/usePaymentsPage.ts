import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchPaymentTransactionDetail,
  fetchPaymentsPageData,
  upsertPaymentPolicy,
  type PaymentKpis,
  type PaymentListFilters,
  type PaymentPolicySettings,
  type PaymentProviderRow,
  type PaymentTransactionDetail,
  type PaymentTransactionListItem,
} from '@/data/payments-api';
import { usePaymentsRealtime } from '@/hooks/usePaymentsRealtime';
import type { PaymentDatePreset } from '@/lib/payment-status';
import type { SettlementPreview } from '@/lib/payments';
import { getSupabaseClient } from '@/lib/supabase';

interface UsePaymentsPageResult {
  kpis: PaymentKpis | null;
  policy: PaymentPolicySettings | null;
  providers: PaymentProviderRow[];
  rows: PaymentTransactionListItem[];
  settlementPrep: SettlementPreview | null;
  filters: PaymentListFilters;
  setDatePreset: (preset: PaymentDatePreset) => void;
  setProvider: (provider: PaymentListFilters['provider']) => void;
  setStatus: (status: PaymentListFilters['status']) => void;
  setSearch: (search: string) => void;
  isLoading: boolean;
  isSavingPolicy: boolean;
  error: string | null;
  actionError: string | null;
  selectedId: string | null;
  detail: PaymentTransactionDetail | null;
  detailLoading: boolean;
  realtimeStatus: string;
  openTransaction: (id: string) => void;
  closeTransaction: () => void;
  reload: () => Promise<void>;
  savePolicy: (policy: PaymentPolicySettings) => Promise<void>;
  clearActionError: () => void;
}

const DEFAULT_FILTERS: PaymentListFilters = {
  datePreset: 'today',
  provider: 'all',
  status: 'all',
  search: '',
};

export function usePaymentsPage(restaurantId: string): UsePaymentsPageResult {
  const [kpis, setKpis] = useState<PaymentKpis | null>(null);
  const [policy, setPolicy] = useState<PaymentPolicySettings | null>(null);
  const [providers, setProviders] = useState<PaymentProviderRow[]>([]);
  const [rows, setRows] = useState<PaymentTransactionListItem[]>([]);
  const [settlementPrep, setSettlementPrep] = useState<SettlementPreview | null>(null);
  const [filters, setFilters] = useState<PaymentListFilters>(DEFAULT_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PaymentTransactionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('INIT');
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setIsLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      const data = await fetchPaymentsPageData(client, restaurantId, filters);
      if (!isMounted.current) return;
      setKpis(data.kpis);
      setPolicy(data.policy);
      setProviders(data.providers);
      setRows(data.rows);
      setSettlementPrep(data.settlementPrep);
    } catch (loadError) {
      if (!isMounted.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Ödeme verisi yüklenemedi.');
      setKpis(null);
      setPolicy(null);
      setProviders([]);
      setRows([]);
      setSettlementPrep(null);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [filters, restaurantId]);

  useEffect(() => {
    isMounted.current = true;
    void load();
    return () => {
      isMounted.current = false;
    };
  }, [load]);

  usePaymentsRealtime({
    restaurantId,
    enabled: Boolean(restaurantId),
    onChange: () => {
      void load();
    },
    onStatus: setRealtimeStatus,
  });

  useEffect(() => {
    if (!selectedId || !restaurantId) {
      setDetail(null);
      return;
    }

    let active = true;
    setDetailLoading(true);

    void (async () => {
      try {
        const next = await fetchPaymentTransactionDetail(
          getSupabaseClient(),
          restaurantId,
          selectedId,
        );
        if (!active) return;
        setDetail(next);
      } catch (detailError) {
        if (!active) return;
        setActionError(
          detailError instanceof Error ? detailError.message : 'İşlem detayı yüklenemedi.',
        );
        setDetail(null);
      } finally {
        if (active) setDetailLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [restaurantId, selectedId]);

  const savePolicy = useCallback(
    async (nextPolicy: PaymentPolicySettings) => {
      setIsSavingPolicy(true);
      setActionError(null);
      try {
        const saved = await upsertPaymentPolicy(getSupabaseClient(), restaurantId, nextPolicy);
        if (!isMounted.current) return;
        setPolicy(saved);
        await load();
      } catch (saveError) {
        setActionError(
          saveError instanceof Error ? saveError.message : 'Politika kaydedilemedi.',
        );
        throw saveError;
      } finally {
        if (isMounted.current) setIsSavingPolicy(false);
      }
    },
    [load, restaurantId],
  );

  return useMemo(
    () => ({
      kpis,
      policy,
      providers,
      rows,
      settlementPrep,
      filters,
      setDatePreset: (datePreset) => setFilters((prev) => ({ ...prev, datePreset })),
      setProvider: (provider) => setFilters((prev) => ({ ...prev, provider })),
      setStatus: (status) => setFilters((prev) => ({ ...prev, status })),
      setSearch: (search) => setFilters((prev) => ({ ...prev, search })),
      isLoading,
      isSavingPolicy,
      error,
      actionError,
      selectedId,
      detail,
      detailLoading,
      realtimeStatus,
      openTransaction: (id: string) => setSelectedId(id),
      closeTransaction: () => setSelectedId(null),
      reload: load,
      savePolicy,
      clearActionError: () => setActionError(null),
    }),
    [
      actionError,
      detail,
      detailLoading,
      error,
      filters,
      isLoading,
      isSavingPolicy,
      kpis,
      load,
      policy,
      providers,
      realtimeStatus,
      rows,
      savePolicy,
      selectedId,
      settlementPrep,
    ],
  );
}
