import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createPaymentGateway,
  type PaymentAuthorization,
  type PaymentProviderCode,
} from '@istebul/payment-gateway';
import {
  fetchRestaurantCxBySlug,
  filterAvailableTables,
  resolveGuaranteeForGuests,
  submitCustomerReservation,
  type CxMenuItem,
  type CxRestaurantBundle,
  type PreorderCartItem,
} from '@/data/cx-api';
import { useCxRealtime } from '@/hooks/useCxRealtime';
import { nextStep, prevStep, type JourneyStep } from '@/lib/journey';
import { formatLocalDate } from '@/lib/format';
import { getSupabaseClient } from '@/lib/supabase';

export interface JourneyDraft {
  date: string;
  time: string;
  guestCount: number;
  salon: string;
  tableId: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  favorites: string[];
  cart: PreorderCartItem[];
}

interface UseRestaurantCxResult {
  step: JourneyStep;
  setStep: (step: JourneyStep) => void;
  goNext: () => void;
  goBack: () => void;
  draft: JourneyDraft;
  updateDraft: (patch: Partial<JourneyDraft>) => void;
  bundle: CxRestaurantBundle | null;
  availableTables: ReturnType<typeof filterAvailableTables>;
  guarantee: CxRestaurantBundle['guarantee'] | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  submitError: string | null;
  realtimeStatus: string;
  reservationId: string | null;
  cartTotal: number;
  paymentProvider: PaymentProviderCode;
  setPaymentProvider: (code: PaymentProviderCode) => void;
  authorization: PaymentAuthorization | null;
  authorizeError: string | null;
  isAuthorizing: boolean;
  startAuthorization: () => Promise<void>;
  addToCart: (item: CxMenuItem) => void;
  updateCartQty: (menuItemId: string, quantity: number) => void;
  updateCartNote: (menuItemId: string, note: string) => void;
  toggleFavorite: (menuItemId: string) => void;
  reload: () => Promise<void>;
  submit: () => Promise<void>;
}

const defaultDraft = (): JourneyDraft => ({
  date: formatLocalDate(new Date()),
  time: '19:00',
  guestCount: 2,
  salon: '',
  tableId: '',
  customerName: '',
  customerPhone: '',
  notes: '',
  favorites: [],
  cart: [],
});

export function useRestaurantCx(slug: string): UseRestaurantCxResult {
  const [step, setStep] = useState<JourneyStep>('landing');
  const [draft, setDraft] = useState<JourneyDraft>(defaultDraft);
  const [bundle, setBundle] = useState<CxRestaurantBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState('INIT');
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProviderCode>('mock');
  const [authorization, setAuthorization] = useState<PaymentAuthorization | null>(null);
  const [authorizeError, setAuthorizeError] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const gatewayRef = useRef(createPaymentGateway());
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRestaurantCxBySlug(getSupabaseClient(), slug);
      if (!mounted.current) return;
      setBundle(data);
      setDraft((prev) => ({
        ...prev,
        salon: prev.salon || data.salons[0] || '',
      }));
    } catch (loadError) {
      if (!mounted.current) return;
      setBundle(null);
      setError(loadError instanceof Error ? loadError.message : 'Restoran yüklenemedi.');
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  useCxRealtime({
    restaurantId: bundle?.restaurant.id || '',
    enabled: Boolean(bundle?.restaurant.id),
    onChange: () => {
      void load();
    },
    onStatus: setRealtimeStatus,
  });

  const availableTables = useMemo(() => {
    if (!bundle) return [];
    return filterAvailableTables(bundle.tables, {
      salon: draft.salon,
      guestCount: draft.guestCount,
    });
  }, [bundle, draft.guestCount, draft.salon]);

  const guarantee = useMemo(() => {
    if (!bundle) return null;
    return resolveGuaranteeForGuests(bundle.guarantee, draft.guestCount);
  }, [bundle, draft.guestCount]);

  const cartTotal = useMemo(
    () => draft.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [draft.cart],
  );

  const updateDraft = useCallback((patch: Partial<JourneyDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const addToCart = useCallback((item: CxMenuItem) => {
    setDraft((prev) => {
      const existing = prev.cart.find((entry) => entry.menuItemId === item.id);
      if (existing) {
        return {
          ...prev,
          cart: prev.cart.map((entry) =>
            entry.menuItemId === item.id
              ? { ...entry, quantity: entry.quantity + 1 }
              : entry,
          ),
        };
      }
      return {
        ...prev,
        cart: [
          ...prev.cart,
          {
            menuItemId: item.id,
            name: item.name,
            unitPrice: item.price,
            quantity: 1,
            note: '',
          },
        ],
      };
    });
  }, []);

  const updateCartQty = useCallback((menuItemId: string, quantity: number) => {
    setDraft((prev) => ({
      ...prev,
      cart:
        quantity <= 0
          ? prev.cart.filter((item) => item.menuItemId !== menuItemId)
          : prev.cart.map((item) =>
              item.menuItemId === menuItemId ? { ...item, quantity } : item,
            ),
    }));
  }, []);

  const updateCartNote = useCallback((menuItemId: string, note: string) => {
    setDraft((prev) => ({
      ...prev,
      cart: prev.cart.map((item) =>
        item.menuItemId === menuItemId ? { ...item, note } : item,
      ),
    }));
  }, []);

  const toggleFavorite = useCallback((menuItemId: string) => {
    setDraft((prev) => ({
      ...prev,
      favorites: prev.favorites.includes(menuItemId)
        ? prev.favorites.filter((id) => id !== menuItemId)
        : [...prev.favorites, menuItemId],
    }));
  }, []);

  const startAuthorization = useCallback(async () => {
    if (!bundle || !guarantee) return;
    setIsAuthorizing(true);
    setAuthorizeError(null);
    try {
      const gateway = gatewayRef.current;
      gateway.setConfig(bundle.restaurant.id, {
        activeProvider: paymentProvider === 'mock' ? 'mock' : paymentProvider,
        mode: 'test',
        enabled: true,
      });
      // Non-mock providers are architecture stubs (ok:false). Prefer Mock for CX demo path.
      const providerForAuth: PaymentProviderCode =
        paymentProvider === 'mock' ? 'mock' : 'mock';
      const result = await gateway.authorize({
        restaurantId: bundle.restaurant.id,
        provider: providerForAuth,
        amount: { amount: guarantee.amount, currency: 'TRY' },
        guaranteeRules: [
          { kind: 'fixed', fixedAmount: guarantee.amount, currency: 'TRY' },
          { kind: 'per_guest', perGuestAmount: Math.round(guarantee.amount / Math.max(1, draft.guestCount)) },
        ],
        guaranteeContext: {
          partySize: draft.guestCount,
          reservationDate: draft.date,
        },
        metadata: {
          source: 'cx-payment-gateway-step',
          selectedProvider: paymentProvider,
        },
      });
      if (!mounted.current) return;
      if (!result.ok || !result.authorizationId) {
        setAuthorization(null);
        setAuthorizeError(result.message || 'Yetkilendirme başarısız');
        setStep('authorization');
        return;
      }
      const auth = gateway.store.getAuthorization(result.authorizationId);
      setAuthorization(auth);
      setStep('authorization');
    } catch (authErr) {
      if (!mounted.current) return;
      setAuthorization(null);
      setAuthorizeError(authErr instanceof Error ? authErr.message : 'Yetkilendirme başarısız');
      setStep('authorization');
    } finally {
      if (mounted.current) setIsAuthorizing(false);
    }
  }, [bundle, draft.date, draft.guestCount, guarantee, paymentProvider]);

  const submit = useCallback(async () => {
    if (!bundle || !guarantee) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitCustomerReservation(getSupabaseClient(), {
        restaurantId: bundle.restaurant.id,
        customerName: draft.customerName,
        customerPhone: draft.customerPhone,
        date: draft.date,
        time: draft.time,
        guestCount: draft.guestCount,
        salon: draft.salon,
        tableId: draft.tableId,
        notes: draft.notes,
        cart: draft.cart,
        guaranteeAmount: guarantee.amount,
        guaranteePolicyId: guarantee.id,
      });
      if (!mounted.current) return;
      setReservationId(result.reservationId);
      setStep('confirmation');
    } catch (submitErr) {
      setSubmitError(submitErr instanceof Error ? submitErr.message : 'Rezervasyon tamamlanamadı.');
    } finally {
      if (mounted.current) setIsSubmitting(false);
    }
  }, [bundle, draft, guarantee]);

  return {
    step,
    setStep,
    goNext: () => {
      const next = nextStep(step);
      if (next) setStep(next);
    },
    goBack: () => {
      const prev = prevStep(step);
      if (prev) setStep(prev);
    },
    draft,
    updateDraft,
    bundle,
    availableTables,
    guarantee,
    isLoading,
    isSubmitting,
    error,
    submitError,
    realtimeStatus,
    reservationId,
    cartTotal,
    paymentProvider,
    setPaymentProvider,
    authorization,
    authorizeError,
    isAuthorizing,
    startAuthorization,
    addToCart,
    updateCartQty,
    updateCartNote,
    toggleFavorite,
    reload: load,
    submit,
  };
}
