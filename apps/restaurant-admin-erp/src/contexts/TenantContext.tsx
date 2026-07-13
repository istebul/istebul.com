import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchRestaurantTenants } from '@/data/tenant-api';
import { getSupabaseClient } from '@/lib/supabase';

export interface RestaurantTenant {
  restaurant_id: string;
  name: string;
  slug: string;
  city: string;
  plan: 'starter' | 'pro' | 'enterprise';
  role?: string;
}

interface TenantContextValue {
  restaurantId: string;
  tenant: RestaurantTenant | null;
  tenants: RestaurantTenant[];
  setRestaurantId: (restaurantId: string) => void;
  isLoading: boolean;
  error: string | null;
  reloadTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);
const RESTAURANT_ID_STORAGE_KEY = 'garson-erp-restaurant-id';

function readStoredRestaurantId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(RESTAURANT_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredRestaurantId(restaurantId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RESTAURANT_ID_STORAGE_KEY, restaurantId);
  } catch {
    // ignore
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<RestaurantTenant[]>([]);
  const [restaurantId, setRestaurantIdState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const client = getSupabaseClient();
      const nextTenants = await fetchRestaurantTenants(client);
      setTenants(nextTenants);

      const storedId = readStoredRestaurantId();
      const resolvedId =
        nextTenants.find((item) => item.restaurant_id === storedId)?.restaurant_id ||
        nextTenants[0]?.restaurant_id ||
        '';

      setRestaurantIdState(resolvedId);
      if (resolvedId) writeStoredRestaurantId(resolvedId);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Restoran bağlamı yüklenemedi.';
      setTenants([]);
      setRestaurantIdState('');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      if (!active) return;
      await loadTenants();
    };

    void boot();

    const client = getSupabaseClient();
    if (!client) {
      return () => {
        active = false;
      };
    }

    const { data } = client.auth.onAuthStateChange(() => {
      void loadTenants();
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [loadTenants]);

  const setRestaurantId = useCallback((nextId: string) => {
    setRestaurantIdState(nextId);
    writeStoredRestaurantId(nextId);
  }, []);

  const tenant = useMemo(
    () => tenants.find((item) => item.restaurant_id === restaurantId) ?? tenants[0] ?? null,
    [restaurantId, tenants],
  );

  const value = useMemo(
    () => ({
      restaurantId,
      tenant,
      tenants,
      setRestaurantId,
      isLoading,
      error,
      reloadTenants: loadTenants,
    }),
    [restaurantId, tenant, tenants, setRestaurantId, isLoading, error, loadTenants],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}
