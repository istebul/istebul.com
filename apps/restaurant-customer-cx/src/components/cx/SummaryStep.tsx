import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CxTable, GuaranteePolicyInfo, PreorderCartItem } from '@/data/cx-api';
import type { JourneyDraft } from '@/hooks/useRestaurantCx';
import { formatCurrencyTry } from '@/lib/format';

interface SummaryStepProps {
  draft: JourneyDraft;
  table: CxTable | null;
  guarantee: GuaranteePolicyInfo;
  cart: PreorderCartItem[];
  cartTotal: number;
  isSubmitting: boolean;
  error: string | null;
  updateDraft: (patch: Partial<JourneyDraft>) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function SummaryStep({
  draft,
  table,
  guarantee,
  cart,
  cartTotal,
  isSubmitting,
  error,
  updateDraft,
  onBack,
  onSubmit,
}: SummaryStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rezervasyon özeti</CardTitle>
        <CardDescription>Müşteri · masa · saat · sipariş · provizyon</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <Input
            placeholder="Ad Soyad"
            value={draft.customerName}
            onChange={(event) => updateDraft({ customerName: event.target.value })}
          />
          <Input
            placeholder="Telefon"
            value={draft.customerPhone}
            onChange={(event) => updateDraft({ customerPhone: event.target.value })}
          />
          <Input
            placeholder="Not (opsiyonel)"
            value={draft.notes}
            onChange={(event) => updateDraft({ notes: event.target.value })}
          />
        </div>

        <div className="rounded-xl border p-3 text-sm">
          <p>
            <span className="text-muted-foreground">Masa:</span>{' '}
            {table ? `${table.name} · ${table.salon}` : '—'}
          </p>
          <p>
            <span className="text-muted-foreground">Saat:</span> {draft.date} {draft.time}
          </p>
          <p>
            <span className="text-muted-foreground">Kişi:</span> {draft.guestCount}
          </p>
          <p>
            <span className="text-muted-foreground">Provizyon:</span> {guarantee.amountLabel}{' '}
            (ödeme yok)
          </p>
        </div>

        <div className="rounded-xl border p-3 text-sm">
          <p className="mb-2 font-medium">Sipariş özeti</p>
          {cart.length === 0 ? (
            <p className="text-muted-foreground">Ön sipariş yok</p>
          ) : (
            <ul className="space-y-1">
              {cart.map((item) => (
                <li key={item.menuItemId}>
                  {item.quantity}× {item.name}
                  {item.note ? ` — ${item.note}` : ''}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 font-semibold">{formatCurrencyTry(cartTotal)}</p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack} disabled={isSubmitting}>
            Geri
          </Button>
          <Button
            className="flex-1"
            disabled={isSubmitting || !draft.customerName.trim()}
            onClick={onSubmit}
          >
            {isSubmitting ? 'Kaydediliyor…' : 'Rezervasyonu tamamla'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
