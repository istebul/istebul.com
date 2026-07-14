import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { DashboardError } from '@/components/dashboard/DashboardError';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { PaymentTransactionDetail } from '@/data/payments-api';
import { formatCurrencyTry } from '@/lib/format';
import { paymentStatusTone } from '@/lib/payment-status';
import { cn } from '@/lib/utils';

interface PaymentDetailDrawerProps {
  open: boolean;
  detail: PaymentTransactionDetail | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

export function PaymentDetailDrawer({
  open,
  detail,
  isLoading,
  error,
  onClose,
}: PaymentDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>İşlem Detayı</SheetTitle>
          <SheetDescription>
            {detail
              ? `${detail.customerName} · ${detail.providerLabel} · ${detail.amountLabel}`
              : 'Ödeme / provizyon kaydı'}
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
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    paymentStatusTone(detail.status),
                  )}
                >
                  {detail.statusLabel}
                </span>
                <Badge variant="outline">{detail.providerLabel}</Badge>
                <Badge variant="secondary">{detail.kind}</Badge>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Reservation</h3>
                <p className="text-sm">
                  {detail.reservation.date || '—'} {detail.reservation.time || ''}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {detail.reservation.id || '—'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Misafir: {detail.reservation.guestCount ?? '—'}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Customer</h3>
                <p className="text-sm">{detail.customer.name}</p>
                <p className="text-sm text-muted-foreground">{detail.customer.phone || '—'}</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Ön Sipariş Özeti</h3>
                <p className="text-sm">{detail.preorderSummaryLabel}</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Provizyon</h3>
                <p className="text-sm">{detail.guaranteeLabel}</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Provider</h3>
                <p className="text-sm">{detail.providerLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Transaction Id:{' '}
                  <span className="font-mono">
                    {detail.providerTransactionId || detail.id}
                  </span>
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Settlement (prep)</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>
                    Toplam:{' '}
                    {detail.settlement.totalBill === null
                      ? '—'
                      : formatCurrencyTry(detail.settlement.totalBill)}
                  </p>
                  <p>
                    Mahsup:{' '}
                    {detail.settlement.guaranteeOffset === null
                      ? '—'
                      : formatCurrencyTry(detail.settlement.guaranteeOffset)}
                  </p>
                  <p>
                    Kalan:{' '}
                    {detail.settlement.remainingCollection === null
                      ? '—'
                      : formatCurrencyTry(detail.settlement.remainingCollection)}
                  </p>
                  <p>
                    İade:{' '}
                    {detail.settlement.refund === null
                      ? '—'
                      : formatCurrencyTry(detail.settlement.refund)}
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Notlar</h3>
                <p className="text-sm text-muted-foreground">{detail.notes || '—'}</p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Audit Timeline</h3>
                {detail.audit.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Henüz audit kaydı yok.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.audit.map((event) => (
                      <li key={event.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{event.action}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.createdAt).toLocaleString('tr-TR')}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {event.actorType}
                          {event.fromStatus || event.toStatus
                            ? ` · ${event.fromStatus || '—'} → ${event.toStatus || '—'}`
                            : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </motion.div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
