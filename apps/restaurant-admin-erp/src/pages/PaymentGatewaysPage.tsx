import { motion } from 'framer-motion';
import {
  createPaymentGateway,
  listPaymentGatewayProviders,
  paymentGatewayRealtimeChannel,
  type PaymentMode,
  type PaymentProviderCode,
} from '@istebul/payment-gateway';
import { useMemo, useState } from 'react';
import { DashboardError } from '@/components/dashboard/DashboardError';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTenant } from '@/contexts/TenantContext';
import { usePaymentGatewaysRealtime } from '@/hooks/usePaymentGatewaysRealtime';

const PROVIDERS: PaymentProviderCode[] = ['mock', 'stripe', 'iyzico', 'paytr'];
const MODES: PaymentMode[] = ['test', 'live'];

export function PaymentGatewaysPage() {
  const { restaurantId, tenant, isLoading: tenantLoading, error: tenantError, reloadTenants } =
    useTenant();
  const gateway = useMemo(() => createPaymentGateway(), []);
  const [provider, setProvider] = useState<PaymentProviderCode>('mock');
  const [mode, setMode] = useState<PaymentMode>('test');
  const [merchantId, setMerchantId] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('test_webhook_secret');
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [demoAuthId, setDemoAuthId] = useState<string | null>(null);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const realtime = usePaymentGatewaysRealtime(restaurantId);

  if (tenantLoading) {
    return <DashboardLoading label="Restoran bağlamı yükleniyor…" />;
  }

  if (tenantError) {
    return <DashboardError message={tenantError} onRetry={() => void reloadTenants()} />;
  }

  if (!restaurantId || !tenant) {
    return (
      <DashboardError message="Aktif restoran seçilemedi." onRetry={() => void reloadTenants()} />
    );
  }

  const channel = paymentGatewayRealtimeChannel(restaurantId);
  const strategies = listPaymentGatewayProviders();

  const saveConfig = () => {
    const cfg = gateway.setConfig(restaurantId, {
      activeProvider: provider,
      mode,
      merchantId: merchantId || `merchant_${restaurantId.slice(0, 8)}`,
      webhookSecret,
      providerMetadata: { foundation: 'P8-E', ui: 'payment-gateways' },
      enabled: true,
    });
    setSavedLabel(
      `${cfg.activeProvider} · ${cfg.mode} · merchant=${cfg.merchantId}`,
    );
  };

  const runMockAuthorize = async () => {
    gateway.setConfig(restaurantId, { activeProvider: 'mock', mode: 'test', enabled: true });
    const result = await gateway.authorize({
      restaurantId,
      amount: { amount: 250, currency: 'TRY' },
      guaranteeRules: [
        { kind: 'fixed', fixedAmount: 200 },
        { kind: 'per_guest', perGuestAmount: 100 },
      ],
      guaranteeContext: {
        partySize: 2,
        reservationDate: new Date().toISOString().slice(0, 10),
      },
      metadata: { source: 'erp-payment-gateways-demo' },
    });
    setDemoAuthId(result.authorizationId || null);
    setDemoMessage(result.message);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">P8-E Payment Gateway</Badge>
            <Badge variant="outline">No live API keys</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Payment Gateways</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.name} · <span className="font-mono text-xs">{restaurantId}</span>
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Provider seçimi, test/live modu, webhook secret ve merchant id hazırlığı. Gerçek Stripe /
            iyzico / PayTR çağrısı yok — Mock ile authorize simülasyonu.
          </p>
        </div>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Provider Architecture</CardTitle>
          <CardDescription>Strategy Pattern · Stripe · iyzico · PayTR · Mock</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {strategies.map((item) => (
            <Badge key={item.code} variant="outline">
              {item.displayName}GatewayProvider
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gateway Config</CardTitle>
          <CardDescription>
            Aktif provider · mode · webhook secret · merchant id · metadata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Aktif provider</span>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={provider}
                onChange={(event) => setProvider(event.target.value as PaymentProviderCode)}
              >
                {PROVIDERS.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Mod</span>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={mode}
                onChange={(event) => setMode(event.target.value as PaymentMode)}
              >
                {MODES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Merchant ID</span>
              <Input
                value={merchantId}
                onChange={(event) => setMerchantId(event.target.value)}
                placeholder="merchant_demo"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Webhook secret</span>
              <Input
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
                placeholder="whsec_…"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={saveConfig}>
              Konfigürasyonu kaydet (in-memory)
            </Button>
            <Button type="button" variant="outline" onClick={() => void runMockAuthorize()}>
              Mock authorize dene
            </Button>
          </div>
          {savedLabel ? (
            <p className="text-sm text-muted-foreground">Kayıt: {savedLabel}</p>
          ) : null}
          {demoMessage ? (
            <p className="text-sm">
              Demo: {demoMessage}
              {demoAuthId ? (
                <span className="ml-2 font-mono text-xs text-muted-foreground">{demoAuthId}</span>
              ) : null}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle</CardTitle>
          <CardDescription>
            Pending → Authorize → Captured → Released → Refunded → Expired → Cancelled
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {['pending', 'authorized', 'captured', 'released', 'refunded', 'expired', 'cancelled'].map(
            (status) => (
              <Badge key={status} variant="secondary">
                {status}
              </Badge>
            ),
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Realtime</CardTitle>
          <CardDescription>Kanal hazırlığı (Supabase publication tabloları P8-E migration)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-mono text-xs">{channel}</p>
          <RealtimeStatus status={realtime.status} tables={channel} />
        </CardContent>
      </Card>
    </div>
  );
}
