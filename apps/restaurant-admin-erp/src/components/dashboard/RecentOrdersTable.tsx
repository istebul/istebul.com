import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RecentOrderRow } from '@/data/dashboard-api';
import { cn } from '@/lib/utils';

interface RecentOrdersTableProps {
  rows: RecentOrderRow[];
}

export function RecentOrdersTable({ rows }: RecentOrdersTableProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card>
        <CardHeader>
          <CardTitle>Son Siparişler</CardTitle>
          <CardDescription>Restorana ait son 10 sipariş</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Sipariş No</th>
                <th className="pb-3 pr-4 font-medium">Masa / Müşteri</th>
                <th className="pb-3 pr-4 font-medium">Durum</th>
                <th className="pb-3 pr-4 font-medium">Tutar</th>
                <th className="pb-3 font-medium">Saat</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Henüz sipariş kaydı yok.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-4 font-medium">{row.orderNo}</td>
                    <td className="py-3 pr-4">{row.customerLabel}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          row.status === 'completed' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                          row.status === 'cancelled' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                          row.status === 'preparing' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                          row.status === 'pending' && 'bg-primary/10 text-primary',
                        )}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{row.amountLabel}</td>
                    <td className="py-3">{row.timeLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
