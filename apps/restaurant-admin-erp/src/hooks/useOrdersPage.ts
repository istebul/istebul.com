import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchOrderDetail,
  fetchOrdersKpis,
  fetchOrdersPage,
  updateOrderStatus,
  type FetchOrdersResult,
  type OrderDetail,
  type OrdersKpis,
} from '@/data/orders-api';
import { useOrderRealtime } from '@/hooks/useOrderRealtime';
import { getSupabaseClient } from '@/lib/supabase';
import type { ErpOrderFilterId } from '@/lib/order-status';
import { ERP_ORDER_FILTERS } from '@/lib/order-status';

const PAGE_SIZE = 15;

interface UseOrdersPageResult {
  rows: FetchOrdersResult['rows'];
  kpis: OrdersKpis | null;
  page: number;
  totalPages: number;
  total: number;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  filter: ErpOrderFilterId;
  search: string;
  selectedOrderId: string | null;
  orderDetail: OrderDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  realtimeStatus: string;
  setFilter: (filter: ErpOrderFilterId) => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  openOrder: (orderId: string) => void;
  closeOrder: () => void;
  reload: () => Promise<void>;
  changeOrderStatus: (orderId: string, status: string) => Promise<void>;
}

export function useOrdersPage(restaurantId: string): UseOrdersPageResult {
  const [rows, setRows] = useState<FetchOrdersResult['rows']>([]);
  const [kpis, setKpis] = useState<OrdersKpis | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<ErpOrderFilterId>('all');
  const [search, setSearchState] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState('INIT');
  const isMounted = useRef(true);

  const statusFilter = ERP_ORDER_FILTERS.find((item) => item.id === filter)?.status ?? null;

  const loadList = useCallback(async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      const [listResult, kpiResult] = await Promise.all([
        fetchOrdersPage(client, {
          restaurantId,
          page,
          pageSize: PAGE_SIZE,
          status: statusFilter,
          search,
        }),
        fetchOrdersKpis(client, restaurantId),
      ]);

      if (!isMounted.current) return;

      setRows(listResult.rows);
      setTotal(listResult.total);
      setTotalPages(listResult.totalPages);
      setKpis(kpiResult);
    } catch (loadError) {
      if (!isMounted.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Siparişler yüklenemedi.');
      setRows([]);
      setKpis(null);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [restaurantId, page, statusFilter, search]);

  const loadDetail = useCallback(
    async (orderId: string) => {
      if (!restaurantId || !orderId) return;

      setDetailLoading(true);
      setDetailError(null);

      try {
        const client = getSupabaseClient();
        const detail = await fetchOrderDetail(client, restaurantId, orderId);
        if (isMounted.current) setOrderDetail(detail);
      } catch (loadError) {
        if (!isMounted.current) return;
        setDetailError(loadError instanceof Error ? loadError.message : 'Sipariş detayı alınamadı.');
        setOrderDetail(null);
      } finally {
        if (isMounted.current) setDetailLoading(false);
      }
    },
    [restaurantId],
  );

  const reload = useCallback(async () => {
    await loadList();
    if (selectedOrderId) await loadDetail(selectedOrderId);
  }, [loadList, loadDetail, selectedOrderId]);

  useEffect(() => {
    isMounted.current = true;
    void loadList();
    return () => {
      isMounted.current = false;
    };
  }, [loadList]);

  useEffect(() => {
    if (selectedOrderId) void loadDetail(selectedOrderId);
    else setOrderDetail(null);
  }, [selectedOrderId, loadDetail]);

  useOrderRealtime({
    restaurantId,
    enabled: Boolean(restaurantId),
    channelSuffix: 'erp-orders',
    onChange: () => {
      void reload();
    },
    onStatus: setRealtimeStatus,
  });

  const setFilter = useCallback((next: ErpOrderFilterId) => {
    setFilterState(next);
    setPage(1);
  }, []);

  const setSearch = useCallback((next: string) => {
    setSearchState(next);
    setPage(1);
  }, []);

  const openOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
  }, []);

  const closeOrder = useCallback(() => {
    setSelectedOrderId(null);
    setOrderDetail(null);
    setDetailError(null);
  }, []);

  const changeOrderStatus = useCallback(
    async (orderId: string, status: string) => {
      if (!restaurantId) return;

      setIsUpdating(true);
      setDetailError(null);

      try {
        const client = getSupabaseClient();
        await updateOrderStatus(client, restaurantId, orderId, status);
        await reload();
      } catch (updateError) {
        const message =
          updateError instanceof Error ? updateError.message : 'Durum güncellenemedi.';
        setDetailError(message);
        throw updateError;
      } finally {
        setIsUpdating(false);
      }
    },
    [restaurantId, reload],
  );

  return {
    rows,
    kpis,
    page,
    totalPages,
    total,
    isLoading,
    isUpdating,
    error,
    filter,
    search,
    selectedOrderId,
    orderDetail,
    detailLoading,
    detailError,
    realtimeStatus,
    setFilter,
    setSearch,
    setPage,
    openOrder,
    closeOrder,
    reload,
    changeOrderStatus,
  };
}
