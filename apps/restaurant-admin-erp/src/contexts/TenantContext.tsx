import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface RestaurantTenant {
  restaurant_id: string;
  name: string;
  slug: string;
  city: string;
  plan: 'starter' | 'pro' | 'enterprise';
}

interface TenantContextValue {
  restaurantId: string;
  tenant: RestaurantTenant;
  tenants: RestaurantTenant[];
  setRestaurantId: (restaurantId: string) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({
  children,
  tenants,
  initialRestaurantId,
}: {
  children: ReactNode;
  tenants: RestaurantTenant[];
  initialRestaurantId?: string;
}) {
  const [restaurantId, setRestaurantIdState] = useState(
    () => initialRestaurantId ?? tenants[0]?.restaurant_id ?? '',
  );

  const tenant = useMemo(
    () => tenants.find((item) => item.restaurant_id === restaurantId) ?? tenants[0],
    [restaurantId, tenants],
  );

  const setRestaurantId = useCallback((nextId: string) => {
    setRestaurantIdState(nextId);
  }, []);

  const value = useMemo(
    () => ({
      restaurantId,
      tenant,
      tenants,
      setRestaurantId,
    }),
    [restaurantId, tenant, tenants, setRestaurantId],
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
