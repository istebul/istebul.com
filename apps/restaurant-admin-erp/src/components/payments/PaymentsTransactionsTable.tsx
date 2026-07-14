import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PaymentTransactionListItem } from '@/data/payments-api';
import { paymentStatusTone } from '@/lib/payment-status';
import { cn } from '@/lib/utils';

interface PaymentsTransactionsTableProps {
  rows: PaymentTransactionListItem[];
  onOpen: (id: string) => void;
}

export function PaymentsTransactionsTable({ rows, onOpen }: PaymentsTransactionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Transactions</CardTitle>
        <CardDescription>
          Provizyon ve tahsilat kayıtları · restaurant_id izolasyonlu
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 pr-4 font-medium">Müşteri</th>
              <th className="pb-3 pr-4 font-medium">Rezervasyon</th>
              <th className="pb-3 pr-4 font-medium">Telefon</th>
              <th className="pb-3 pr-4 font-medium">Provider</th>
              <th className="pb-3 pr-4 font-medium">Tutar</th>
              <th className="pb-3 pr-4 font-medium">Durum</th>
              <th className="pb-3 pr-4 font-medium">Tarih</th>
              <th className="pb-3 pr-4 font-medium">Restaurant</th>
              <th className="pb-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0">
                <td className="py-3 pr-4 font-medium">{row.customerName}</td>
                <td className="py-3 pr-4">{row.reservationLabel}</td>
                <td className="py-3 pr-4">{row.phone || '—'}</td>
                <td className="py-3 pr-4">{row.providerLabel}</td>
                <td className="py-3 pr-4">{row.amountLabel}</td>
                <td className="py-3 pr-4">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      paymentStatusTone(row.status),
                    )}
                  >
                    {row.statusLabel}
                  </span>
                </td>
                <td className="py-3 pr-4">{row.dateLabel}</td>
                <td className="py-3 pr-4">{row.restaurantLabel}</td>
                <td className="py-3">
                  <Button variant="outline" size="sm" onClick={() => onOpen(row.id)}>
                    <Eye className="h-4 w-4" />
                    Detay
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
