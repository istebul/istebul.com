import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SettlementPreview } from '@/lib/payments';
import { formatCurrencyTry } from '@/lib/format';

interface SettlementPrepPanelProps {
  settlement: SettlementPreview | null;
}

function valueLabel(value: number | null): string {
  if (value === null) return '—';
  return formatCurrencyTry(value);
}

export function SettlementPrepPanel({ settlement }: SettlementPrepPanelProps) {
  if (!settlement) return null;

  const fields = [
    { label: 'Toplam Hesap', value: valueLabel(settlement.totalBill) },
    { label: 'Provizyon Mahsup', value: valueLabel(settlement.guaranteeOffset) },
    { label: 'Kalan Tahsilat', value: valueLabel(settlement.remainingCollection) },
    { label: 'İade', value: valueLabel(settlement.refund) },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle>Settlement</CardTitle>
          <CardDescription>Enterprise hazırlık alanı — gerçek hesaplama yok</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {fields.map((field) => (
              <div key={field.label} className="rounded-lg border border-dashed p-3">
                <p className="text-xs text-muted-foreground">{field.label}</p>
                <p className="mt-1 text-lg font-semibold tracking-tight">{field.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{settlement.note}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
