import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AiTableSuggestion } from '@/components/checkin/AiTableSuggestion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { CheckinJourneyItem, CheckinTableOption } from '@/data/checkin-api';
import { formatDateTimeTr } from '@/lib/format-datetime';

interface CheckinDetailDrawerProps {
  open: boolean;
  item: CheckinJourneyItem | null;
  tables: CheckinTableOption[];
  busy?: boolean;
  actionError?: string | null;
  onClose: () => void;
  onCheckIn: (id: string) => Promise<void>;
  onMarkLate: (id: string) => Promise<void>;
  onMarkNoShow: (id: string) => Promise<void>;
  onAssignTable: (reservationId: string, tableId: string) => Promise<void>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export function CheckinDetailDrawer({
  open,
  item,
  tables,
  busy,
  actionError,
  onClose,
  onCheckIn,
  onMarkLate,
  onMarkNoShow,
  onAssignTable,
}: CheckinDetailDrawerProps) {
  const [tableId, setTableId] = useState('');

  useEffect(() => {
    setTableId(item?.tableId || '');
  }, [item?.id, item?.tableId]);

  const canCheckIn =
    Boolean(item) &&
    !item?.noShow &&
    item?.arrivalStatus !== 'arrived' &&
    item?.status !== 'cancelled' &&
    item?.status !== 'completed';

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{item?.customerName || 'Check-in'}</SheetTitle>
          <SheetDescription>
            {item
              ? `${item.time} · ${item.guestCount} kişi · yolculuk ekranı`
              : 'Müşteri check-in yönetimi'}
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
                <Badge variant={item.isLate ? 'warning' : 'outline'}>{item.arrivalLabel}</Badge>
                {item.hasPreorder ? <Badge>Ön sipariş</Badge> : null}
                {item.noShow ? <Badge variant="secondary">No-show</Badge> : null}
              </div>

              <dl className="space-y-3 text-sm">
                <Row label="Misafir" value={item.customerName} />
                <Row label="Telefon" value={item.phone || '—'} />
                <Row label="Email" value={item.email || '—'} />
                <Row label="Saat" value={item.time} />
                <Row label="Kişi" value={String(item.guestCount)} />
                <Row label="Salon" value={item.salon} />
                <Row label="Masa" value={item.tableName} />
                <Row
                  label="Check-in zamanı"
                  value={item.checkInTime ? formatDateTimeTr(item.checkInTime) : '—'}
                />
              </dl>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Ön sipariş özeti</h3>
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  {item.hasPreorder
                    ? 'Ön sipariş bayrağı açık — menü/sepet satırları ileride burada özetlenecek.'
                    : 'Bu rezervasyonda ön sipariş yok.'}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Provizyon durumu</h3>
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm">
                  {item.guarantee ? (
                    <p>
                      {item.guarantee.statusLabel} · {item.guarantee.amountLabel}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Placeholder — ödeme yakalama yok; guarantee modeli rezervasyon modülünden
                      okunur.
                    </p>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {item.tableId ? 'Masa değiştir' : 'Masa ata'}
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    value={tableId}
                    onChange={(event) => setTableId(event.target.value)}
                    aria-label="Masa seçimi"
                  >
                    <option value="">Masa seç</option>
                    {tables
                      .filter((table) => table.active)
                      .map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.name} · {table.salon} · {table.capacity} kişi
                        </option>
                      ))}
                  </select>
                  <Button
                    disabled={busy || !tableId || tableId === item.tableId}
                    onClick={() => void onAssignTable(item.id, tableId)}
                  >
                    {item.tableId ? 'Değiştir' : 'Ata'}
                  </Button>
                </div>
              </section>

              <AiTableSuggestion
                tables={tables}
                guestCount={item.guestCount}
                preferredSalon={item.salon === '—' ? null : item.salon}
                onPick={setTableId}
              />

              {(item.notes || item.specialRequests) && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Notlar</h3>
                  <p className="rounded-lg border bg-muted/20 p-3 text-sm">
                    {item.notes || item.specialRequests}
                  </p>
                </section>
              )}

              {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  disabled={busy || !canCheckIn}
                  onClick={() => void onCheckIn(item.id)}
                >
                  Check-in
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || item.noShow || item.arrivalStatus === 'arrived'}
                  onClick={() => void onMarkLate(item.id)}
                >
                  Geç geldi
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || item.noShow || item.arrivalStatus === 'arrived'}
                  onClick={() => void onMarkNoShow(item.id)}
                >
                  No-show
                </Button>
              </div>
            </motion.div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
