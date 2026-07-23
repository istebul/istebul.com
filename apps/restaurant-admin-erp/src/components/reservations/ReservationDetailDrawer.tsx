import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { ReservationListItem } from '@/data/reservations-api';
import { formatDateTimeTr } from '@/lib/format-datetime';

interface ReservationDetailDrawerProps {
  open: boolean;
  item: ReservationListItem | null;
  onClose: () => void;
}

export function ReservationDetailDrawer({
  open,
  item,
  onClose,
}: ReservationDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{item?.customerName || 'Rezervasyon Detayı'}</SheetTitle>
          <SheetDescription>
            {item ? `${item.date} · ${item.time} · ${item.guestCount} kişi` : 'Misafir rezervasyonu'}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {item && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap gap-2">
                <Badge>{item.statusLabel}</Badge>
                <Badge variant="outline">{item.salon}</Badge>
                <Badge variant="outline">{item.tableName}</Badge>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Müşteri</dt>
                  <dd className="font-medium">{item.customerName}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Telefon</dt>
                  <dd className="font-medium">{item.phone || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium">{item.email || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Kişi</dt>
                  <dd className="font-medium">{item.guestCount}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Rezervasyon saati</dt>
                  <dd className="font-medium">
                    {item.date} {item.time}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Salon</dt>
                  <dd className="font-medium">{item.salon}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Masa</dt>
                  <dd className="font-medium">{item.tableName}</dd>
                </div>
              </dl>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Not</h3>
                <p className="rounded-lg border bg-muted/20 p-3 text-sm">
                  {item.notes || '—'}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Özel İstekler</h3>
                <p className="rounded-lg border bg-muted/20 p-3 text-sm">
                  {item.specialRequests || '—'}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Reservation Guarantee</h3>
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  {item.guarantee ? (
                    <dl className="space-y-2">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Tutar</dt>
                        <dd>{item.guarantee.amountLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Durum</dt>
                        <dd>{item.guarantee.statusLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Ödeme ID</dt>
                        <dd className="font-mono text-xs">
                          {item.guarantee.paymentId || '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">İade</dt>
                        <dd>{item.guarantee.refundStatusLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Politika</dt>
                        <dd>{item.guarantee.policy || '—'}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-muted-foreground">
                      Provizyon kaydı yok — model hazır, ödeme entegrasyonu sonraki adım.
                    </p>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Ön Sipariş</h3>
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  Placeholder — ileride menü, sepet ve sipariş buraya bağlanacak.
                  {item.hasPreorder ? ' Bu rezervasyonda ön sipariş bayrağı açık.' : ''}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">No-show hazırlığı</h3>
                <dl className="space-y-2 rounded-lg border p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">no_show</dt>
                    <dd>{item.noShow ? 'true' : 'false'}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">arrival_status</dt>
                    <dd>{item.arrivalStatus}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">check_in_time</dt>
                    <dd>{formatDateTimeTr(item.checkInTime)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">cancel_reason</dt>
                    <dd>{item.cancelReason || '—'}</dd>
                  </div>
                </dl>
              </section>
            </motion.div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
