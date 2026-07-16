import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AiConciergeChat } from '@/components/cx/AiConciergeChat';
import { CxEmpty, CxError, CxLoading } from '@/components/cx/CxStates';
import { CxShell } from '@/components/cx/CxShell';
import { Button } from '@/components/ui/button';
import { fetchRestaurantCxBySlug, type CxRestaurantBundle } from '@/data/cx-api';
import { getSupabaseClient } from '@/lib/supabase';

interface ConciergePageProps {
  slug: string;
}

/**
 * Dedicated P8-C route: /r/{restaurantSlug}/concierge
 * Additive to P7 journey — does not replace ConciergeStep placeholder.
 */
export function ConciergePage({ slug }: ConciergePageProps) {
  const [bundle, setBundle] = useState<CxRestaurantBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    try {
      const client = getSupabaseClient();
      if (!client) {
        // Offline / unset Supabase: still run Concierge on Knowledge demo seed.
        setBundle(null);
        setError(null);
        return;
      }
      const next = await fetchRestaurantCxBySlug(client, slug);
      setBundle(next);
    } catch (err) {
      setBundle(null);
      setError(err instanceof Error ? err.message : 'Restoran yüklenemedi.');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!slug) {
    return (
      <CxShell step="concierge">
        <CxEmpty
          title="Restoran seçilmedi"
          description="Adres /r/{restaurantSlug}/concierge biçiminde olmalıdır."
        />
      </CxShell>
    );
  }

  if (isLoading) {
    return (
      <CxShell step="concierge">
        <CxLoading label="AI Concierge hazırlanıyor…" />
      </CxShell>
    );
  }

  // Demo / no Supabase: Knowledge Graph seed powers the chat.
  if (!bundle) {
    const demoName = slug === 'demo-cafe' ? 'Demo Cafe' : slug;
    return (
      <CxShell restaurantName={demoName} step="concierge">
        {error ? (
          <div className="mb-3 space-y-2">
            <CxError message={error} onRetry={() => void load()} />
            <p className="text-xs text-muted-foreground">
              Knowledge Graph demo seed ile Concierge yine de açılabilir.
            </p>
          </div>
        ) : null}
        <AiConciergeChat
          restaurantSlug={slug}
          restaurantId={slug}
          restaurantName={demoName}
        />
      </CxShell>
    );
  }

  return (
    <CxShell restaurantName={bundle.restaurant.name} step="concierge">
      <div className="mb-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/${encodeURIComponent(slug)}`}>← {bundle.restaurant.name} ana sayfa</Link>
        </Button>
      </div>
      <AiConciergeChat
        restaurantSlug={bundle.restaurant.slug || slug}
        restaurantId={bundle.restaurant.id || slug}
        restaurantName={bundle.restaurant.name}
      />
    </CxShell>
  );
}
