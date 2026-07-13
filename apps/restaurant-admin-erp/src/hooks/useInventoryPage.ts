import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchInventoryPageData,
  type InventoryCategoryRow,
  type InventoryItemRow,
  type InventorySummary,
} from '@/data/inventory-api';
import { useInventoryRealtime } from '@/hooks/useInventoryRealtime';
import { getSupabaseClient } from '@/lib/supabase';

export type InventoryCriticalFilter = 'all' | 'critical';

interface UseInventoryPageResult {
  categories: InventoryCategoryRow[];
  items: InventoryItemRow[];
  filteredItems: InventoryItemRow[];
  summary: InventorySummary | null;
  isLoading: boolean;
  error: string | null;
  search: string;
  categoryId: string | null;
  criticalOnly: boolean;
  selectedItemId: string | null;
  selectedItem: InventoryItemRow | null;
  realtimeStatus: string;
  setSearch: (value: string) => void;
  setCategoryId: (value: string | null) => void;
  setCriticalOnly: (value: boolean) => void;
  openItem: (itemId: string) => void;
  closeItem: () => void;
  reload: () => Promise<void>;
}

export function useInventoryPage(restaurantId: string): UseInventoryPageResult {
  const [categories, setCategories] = useState<InventoryCategoryRow[]>([]);
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState('INIT');
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      const data = await fetchInventoryPageData(client, restaurantId);
      if (!isMounted.current) return;
      setCategories(data.categories);
      setItems(data.items);
      setSummary(data.summary);
    } catch (loadError) {
      if (!isMounted.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Stok verileri yüklenemedi.');
      setCategories([]);
      setItems([]);
      setSummary(null);
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

  useInventoryRealtime({
    restaurantId,
    enabled: Boolean(restaurantId),
    onChange: () => {
      void load();
    },
    onStatus: setRealtimeStatus,
  });

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      if (categoryId && item.categoryId !== categoryId) return false;
      if (criticalOnly && !item.isCritical) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query) ||
        item.unit.toLowerCase().includes(query)
      );
    });
  }, [items, categoryId, criticalOnly, search]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  return {
    categories,
    items,
    filteredItems,
    summary,
    isLoading,
    error,
    search,
    categoryId,
    criticalOnly,
    selectedItemId,
    selectedItem,
    realtimeStatus,
    setSearch,
    setCategoryId,
    setCriticalOnly,
    openItem: (itemId: string) => setSelectedItemId(itemId),
    closeItem: () => setSelectedItemId(null),
    reload: load,
  };
}
