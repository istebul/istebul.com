import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { GuaranteePolicyInfo } from '@/data/cx-api';

interface GuaranteeStepProps {
  guarantee: GuaranteePolicyInfo;
  onContinue: () => void;
  onBack: () => void;
}

export function GuaranteeStep({ guarantee, onContinue, onBack }: GuaranteeStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservation Guarantee</CardTitle>
        <CardDescription>Bilgilendirme kartı · ödeme yapılmaz</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">İşletme politikası</p>
          <p className="mt-1 font-medium">{guarantee.summaryLabel}</p>
          <p className="mt-3 text-sm text-muted-foreground">Tahmini provizyon tutarı</p>
          <p className="font-display text-3xl font-semibold tracking-tight">
            {guarantee.amountLabel}
          </p>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            <li>Son iptal süresi: {guarantee.cancelDeadlineHours} saat</li>
            <li>No-show politikası: {guarantee.noShowPolicy}</li>
            {guarantee.notes ? <li>{guarantee.notes}</li> : null}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          Sonraki adımda Payment Gateway (P8-E) ile Mock authorize çalışır. Canlı kart /
          Stripe-iyzico-PayTR anahtarı gerekmez.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Geri
          </Button>
          <Button className="flex-1" onClick={onContinue}>
            Payment Gateway
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
