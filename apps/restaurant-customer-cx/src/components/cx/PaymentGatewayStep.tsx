import type { PaymentProviderCode } from '@istebul/payment-gateway';
import { listPaymentGatewayProviders } from '@istebul/payment-gateway';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GuaranteePolicyInfo } from '@/data/cx-api';

interface PaymentGatewayStepProps {
  guarantee: GuaranteePolicyInfo;
  provider: PaymentProviderCode;
  onProviderChange: (code: PaymentProviderCode) => void;
  onContinue: () => void;
  onBack: () => void;
  isAuthorizing?: boolean;
}

export function PaymentGatewayStep({
  guarantee,
  provider,
  onProviderChange,
  onContinue,
  onBack,
  isAuthorizing = false,
}: PaymentGatewayStepProps) {
  const providers = listPaymentGatewayProviders();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Gateway</CardTitle>
        <CardDescription>
          Reservation Guarantee → Provider seçimi · gerçek API anahtarı gerekmez
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">Garanti tutarı</p>
          <p className="font-display text-3xl font-semibold tracking-tight">
            {guarantee.amountLabel}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{guarantee.summaryLabel}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Provider</p>
          <div className="flex flex-wrap gap-2">
            {providers.map((item) => (
              <Button
                key={item.code}
                type="button"
                size="sm"
                variant={provider === item.code ? 'default' : 'outline'}
                onClick={() => onProviderChange(item.code)}
              >
                {item.displayName}
              </Button>
            ))}
          </div>
          {provider !== 'mock' ? (
            <p className="text-xs text-muted-foreground">
              {provider} Strategy hazır; canlı anahtar yok. Devam edince Mock authorize
              kullanılabilir veya stub yanıtı gösterilir.
            </p>
          ) : (
            <Badge variant="secondary">Mock — yerel authorize</Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack} disabled={isAuthorizing}>
            Geri
          </Button>
          <Button className="flex-1" onClick={onContinue} disabled={isAuthorizing}>
            {isAuthorizing ? 'Yetkilendiriliyor…' : 'Authorization'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
