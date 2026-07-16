import type { PaymentAuthorization } from '@istebul/payment-gateway';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AuthorizationStepProps {
  authorization: PaymentAuthorization | null;
  error: string | null;
  onContinue: () => void;
  onBack: () => void;
  onRetry: () => void;
}

export function AuthorizationStep({
  authorization,
  error,
  onContinue,
  onBack,
  onRetry,
}: AuthorizationStepProps) {
  const ok = Boolean(authorization && authorization.status === 'authorized');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authorization</CardTitle>
        <CardDescription>
          Provizyon yetkilendirmesi · ardından rezervasyon özeti / onay
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">Yetkilendirme başarısız</p>
            <p className="mt-1 text-muted-foreground">{error}</p>
            <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
              Tekrar dene
            </Button>
          </div>
        ) : null}

        {authorization ? (
          <div className="space-y-2 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={ok ? 'secondary' : 'outline'}>{authorization.status}</Badge>
              <Badge variant="outline">{authorization.provider}</Badge>
              <Badge variant="outline">{authorization.mode}</Badge>
            </div>
            <p className="font-display text-2xl font-semibold">
              {authorization.amount.amount} {authorization.amount.currency}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {authorization.providerTransactionId || authorization.id}
            </p>
            {ok ? (
              <p className="text-sm text-muted-foreground">
                Reservation Confirmed adımına hazır — özet üzerinden rezervasyonu tamamlayın.
              </p>
            ) : null}
          </div>
        ) : !error ? (
          <p className="text-sm text-muted-foreground">Yetkilendirme bekleniyor…</p>
        ) : null}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Geri
          </Button>
          <Button className="flex-1" onClick={onContinue} disabled={!ok}>
            Özet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
