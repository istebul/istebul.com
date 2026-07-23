import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { OrderListItem } from '@/data/orders-api';
import { cn } from '@/lib/utils';

interface OrdersTableProps {
  rows: OrderListItem[];
  onOpen: (orderId: string) => void;
}

function statusClass(status: string) {
  if (status === 'completed') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (status === 'cancelled') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
  if (status === 'preparing') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  if (status === 'ready') return 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
  return 'bg-primary/10 text-primary';
}

export function OrdersTable({ rows, onOpen }: OrdersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sipariş Listesi</CardTitle>
        <CardDescription>Tüm siparişler Supabase üzerinden canlı yüklenir</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 pr-4 font-medium">Sipariş No</th>
              <th className="pb-3 pr-4 font-medium">Müşteri</th>
              <th className="pb-3 pr-4 font-medium">Masa</th>
              <th className="pb-3 pr-4 font-medium">Kanal</th>
              <th className="pb-3 pr-4 font-medium">Durum</th>
              <th className="pb-3 pr-4 font-medium">Toplam</th>
              <th className="pb-3 pr-4 font-medium">Saat</th>
              <th className="pb-3 font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0">
                <td className="py-3 pr-4 font-medium">{row.orderNo}</td>
                <td className="py-3 pr-4">{row.customerName}</td>
                <td className="py-3 pr-4">{row.tableName}</td>
                <td className="py-3 pr-4">{row.channelLabel}</td>
                <td className="py-3 pr-4">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusClass(row.status))}>
                    {row.statusLabel}
                  </span>
                </td>
                <td className="py-3 pr-4">{row.totalLabel}</td>
                <td className="py-3 pr-4">{row.timeLabel}</td>
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
