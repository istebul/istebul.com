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
import type { FloorTableCard } from '@/data/tables-api';
import { formatDateTimeTr } from '@/lib/format-datetime';
import { TABLE_STATUS_STYLES } from '@/lib/table-status';
import { cn } from '@/lib/utils';

interface TableDetailDrawerProps {
  open: boolean;
  item: FloorTableCard | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export function TableDetailDrawer({ open, item, onClose }: TableDetailDrawerProps) {
  const styles = item ? TABLE_STATUS_STYLES[item.status] : null;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{item?.name || 'Masa Detayı'}</SheetTitle>
          <SheetDescription>
            {item
              ? `${item.salon} · ${item.capacity} kişilik · operasyon merkezi`
              : 'Masa operasyon detayı'}
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
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    styles?.badge,
                  )}
                >
                  {item.statusLabel}
                </span>
                <Badge variant="outline">{item.salon}</Badge>
                {item.hasPreorder ? <Badge>Ön sipariş</Badge> : null}
              </div>

              <dl className="space-y-3 text-sm">
                <Row label="Rezervasyon" value={item.reservationId ? 'Var' : 'Yok'} />
                <Row label="Misafir" value={item.guestName || '—'} />
                <Row label="Telefon" value={item.guestPhone || '—'} />
                <Row label="Saat" value={item.reservedAt || '—'} />
                <Row
                  label="Kişi sayısı"
                  value={item.guestCount != null ? String(item.guestCount) : '—'}
                />
                <Row label="Masa" value={item.name} />
                <Row label="Salon" value={item.salon} />
                <Row
                  label="Provizyon durumu"
                  value={
                    item.guarantee
                      ? `${item.guarantee.statusLabel} · ${item.guarantee.amountLabel}`
                      : '—'
                  }
                />
                <Row
                  label="Check-in"
                  value={
                    item.checkInTime
                      ? formatDateTimeTr(item.checkInTime)
                      : item.arrivalStatus || '—'
                  }
                />
                <Row label="Garson" value={item.assignedWaiter || '—'} />
              </dl>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Sipariş Özeti</h3>
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm">
                  {item.orderSummary ? (
                    <dl className="space-y-2">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Sipariş</dt>
                        <dd className="font-medium">{item.orderSummary.orderNo}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Durum</dt>
                        <dd>{item.orderSummary.statusLabel}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Tutar</dt>
                        <dd>{item.orderSummary.totalLabel}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-muted-foreground">
                      Placeholder — menü / sepet / mutfak satırları ileride buraya bağlanacak.
                    </p>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Notlar</h3>
                <p className="rounded-lg border bg-muted/20 p-3 text-sm">
                  {item.notes || '—'}
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Entegrasyon hazırlığı</h3>
                <p className="text-xs text-muted-foreground">
                  Bu drawer AI Reservation, Kitchen, WhatsApp, QR ve Preorder yüzeylerine eklenti
                  noktası olarak genişletilebilir (`table_id`, `reservationId`, `orderSummary`).
                </p>
              </section>
            </motion.div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
