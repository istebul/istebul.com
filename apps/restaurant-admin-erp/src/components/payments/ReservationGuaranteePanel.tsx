import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { PaymentPolicySettings } from '@/data/payments-api';

interface ReservationGuaranteePanelProps {
  policy: PaymentPolicySettings | null;
  busy: boolean;
  onSave: (policy: PaymentPolicySettings) => Promise<void>;
}

const RULES = [
  { key: 'fixedGuaranteeEnabled', label: 'Sabit Provizyon', amountKey: 'fixedGuaranteeAmount' },
  {
    key: 'perGuestGuaranteeEnabled',
    label: 'Kişi Başı Provizyon',
    amountKey: 'perGuestGuaranteeAmount',
  },
  {
    key: 'weekendGuaranteeEnabled',
    label: 'Hafta Sonu Provizyonu',
    amountKey: 'weekendGuaranteeAmount',
  },
  {
    key: 'specialDayGuaranteeEnabled',
    label: 'Özel Gün Provizyonu',
    amountKey: 'specialDayGuaranteeAmount',
  },
] as const;

export function ReservationGuaranteePanel({
  policy,
  busy,
  onSave,
}: ReservationGuaranteePanelProps) {
  const [draft, setDraft] = useState<PaymentPolicySettings | null>(policy);

  useEffect(() => {
    setDraft(policy);
  }, [policy]);

  if (!draft) return null;

  const toggle = (key: keyof PaymentPolicySettings) => {
    setDraft((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
  };

  const setNumber = (key: keyof PaymentPolicySettings, value: string) => {
    const n = Number(value);
    setDraft((prev) => (prev ? { ...prev, [key]: Number.isFinite(n) ? n : 0 } : prev));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Reservation Guarantee</CardTitle>
            <CardDescription>
              İşletme provizyon kuralları — altyapı kaydı. Gerçek tahsilat yok.
            </CardDescription>
          </div>
          <Badge variant="outline">Settings only</Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            {RULES.map((rule) => (
              <div key={rule.key} className="rounded-lg border border-border/70 p-3">
                <label className="flex items-center justify-between gap-3 text-sm font-medium">
                  <span>{rule.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(draft[rule.key])}
                    onChange={() => toggle(rule.key)}
                    className="h-4 w-4"
                  />
                </label>
                <Input
                  type="number"
                  min={0}
                  className="mt-2"
                  value={draft[rule.amountKey]}
                  onChange={(event) => setNumber(rule.amountKey, event.target.value)}
                  disabled={!draft[rule.key]}
                  aria-label={`${rule.label} tutarı`}
                />
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <span>VIP Muafiyet</span>
              <input
                type="checkbox"
                checked={draft.vipExemptionEnabled}
                onChange={() => toggle('vipExemptionEnabled')}
                className="h-4 w-4"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
              <span>Çocuk Muafiyeti</span>
              <input
                type="checkbox"
                checked={draft.childExemptionEnabled}
                onChange={() => toggle('childExemptionEnabled')}
                className="h-4 w-4"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Ücretsiz Rezervasyon Limiti
              <Input
                type="number"
                min={0}
                value={draft.freeReservationLimit}
                onChange={(event) => setNumber('freeReservationLimit', event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Son İptal Süresi (saat)
              <Input
                type="number"
                min={0}
                value={draft.cancelDeadlineHours}
                onChange={(event) => setNumber('cancelDeadlineHours', event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              No-show Politikası
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                value={draft.noShowPolicy}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          noShowPolicy: event.target.value as PaymentPolicySettings['noShowPolicy'],
                        }
                      : prev,
                  )
                }
              >
                <option value="none">Yok</option>
                <option value="capture">Capture</option>
                <option value="partial">Kısmi</option>
                <option value="fee">Sabit ücret</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              No-show ücreti
              <Input
                type="number"
                min={0}
                value={draft.noShowFeeAmount}
                onChange={(event) => setNumber('noShowFeeAmount', event.target.value)}
                disabled={draft.noShowPolicy === 'none'}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Kurallar `payment_policies` tablosuna yazılır. Provider authorize/capture çağrılmaz.
            </p>
            <Button
              disabled={busy}
              onClick={() => {
                void onSave(draft);
              }}
            >
              {busy ? 'Kaydediliyor…' : 'Politikayı kaydet'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
