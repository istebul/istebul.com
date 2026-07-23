import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchMenuPageData, type MenuCategoryRow, type MenuItemRow } from '@/data/menu-api';
import { useMenuRealtime } from '@/hooks/useMenuRealtime';
import { getSupabaseClient } from '@/lib/supabase';

export type MenuActiveFilter = 'all' | 'active' | 'inactive';

interface UseMenuPageResult {
  categories: MenuCategoryRow[];
  items: MenuItemRow[];
  filteredItems: MenuItemRow[];
  isLoading: boolean;
  error: string | null;
  search: string;
  categoryId: string | null;
  activeFilter: MenuActiveFilter;
  selectedItemId: string | null;
  selectedItem: MenuItemRow | null;
  editDialogOpen: boolean;
  createDialogOpen: boolean;
  realtimeStatus: string;
  setSearch: (value: string) => void;
  setCategoryId: (value: string | null) => void;
  setActiveFilter: (value: MenuActiveFilter) => void;
  openItem: (itemId: string) => void;
  closeItem: () => void;
  openEditDialog: () => void;
  closeEditDialog: () => void;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  reload: () => Promise<void>;
}

export function useMenuPage(restaurantId: string): UseMenuPageResult {
  const [categories, setCategories] = useState<MenuCategoryRow[]>([]);
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<MenuActiveFilter>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('INIT');
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      const data = await fetchMenuPageData(client, restaurantId);
      if (!isMounted.current) return;
      setCategories(data.categories);
      setItems(data.items);
    } catch (loadError) {
      if (!isMounted.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Menü verileri yüklenemedi.');
      setCategories([]);
      setItems([]);
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

  useMenuRealtime({
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
      if (activeFilter === 'active' && !item.active) return false;
      if (activeFilter === 'inactive' && item.active) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query)
      );
    });
  }, [items, categoryId, activeFilter, search]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  return {
    categories,
    items,
    filteredItems,
    isLoading,
    error,
    search,
    categoryId,
    activeFilter,
    selectedItemId,
    selectedItem,
    editDialogOpen,
    createDialogOpen,
    realtimeStatus,
    setSearch,
    setCategoryId,
    setActiveFilter,
    openItem: (itemId: string) => setSelectedItemId(itemId),
    closeItem: () => {
      setSelectedItemId(null);
      setEditDialogOpen(false);
    },
    openEditDialog: () => setEditDialogOpen(true),
    closeEditDialog: () => setEditDialogOpen(false),
    openCreateDialog: () => setCreateDialogOpen(true),
    closeCreateDialog: () => setCreateDialogOpen(false),
    reload: load,
  };
}
