import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { DashboardError } from '@/components/dashboard/DashboardError';
import { OrderStatusActions } from '@/components/orders/OrderStatusActions';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { OrderDetail } from '@/data/orders-api';

interface OrderDetailDrawerProps {
  open: boolean;
  detail: OrderDetail | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  onClose: () => void;
  onStatusChange: (status: string) => Promise<void>;
}

export function OrderDetailDrawer({
  open,
  detail,
  isLoading,
  isUpdating,
  error,
  onClose,
  onStatusChange,
}: OrderDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{detail ? `Sipariş #${detail.orderNo}` : 'Sipariş Detayı'}</SheetTitle>
          <SheetDescription>
            {detail
              ? `${detail.customerName} · ${detail.channelLabel} · ${detail.tableName}`
              : 'Sipariş bilgileri yükleniyor'}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {isLoading && (
            <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {error && !isLoading && (
            <DashboardError title="Detay yüklenemedi" message={error} onRetry={onClose} />
          )}

          {detail && !isLoading && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{detail.statusLabel}</Badge>
                <Badge variant="outline">{detail.channelLabel}</Badge>
                <span className="text-sm text-muted-foreground">{detail.totalLabel}</span>
              </div>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Durum İşlemleri</h3>
                <OrderStatusActions
                  status={detail.status}
                  isUpdating={isUpdating}
                  onChange={onStatusChange}
                />
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Sipariş Kalemleri</h3>
                {detail.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Kalem bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.items.map((item) => (
                      <div key={item.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} adet · {item.unitPriceLabel}
                            </p>
                            {item.note && (
                              <p className="mt-1 text-xs text-muted-foreground">Not: {item.note}</p>
                            )}
                          </div>
                          <p className="font-medium">{item.lineTotalLabel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {detail.notes && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Notlar</h3>
                  <p className="rounded-lg border bg-muted/30 p-3 text-sm">{detail.notes}</p>
                </section>
              )}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Durum Geçmişi</h3>
                <div className="space-y-2">
                  {detail.statusHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span>{entry.statusLabel}</span>
                      <span className="text-muted-foreground">{entry.timeLabel}</span>
                    </div>
                  ))}
                </div>
              </section>

              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Toplam</span>
                  <span className="text-lg font-bold">{detail.totalLabel}</span>
                </div>
              </div>
            </motion.div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
