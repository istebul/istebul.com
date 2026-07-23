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
import type { InventoryItemRow } from '@/data/inventory-api';
import { formatDateTimeTr } from '@/lib/format-datetime';

interface InventoryItemDetailDrawerProps {
  open: boolean;
  item: InventoryItemRow | null;
  onClose: () => void;
}

export function InventoryItemDetailDrawer({
  open,
  item,
  onClose,
}: InventoryItemDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{item?.name || 'Stok Detayı'}</SheetTitle>
          <SheetDescription>
            {item ? `${item.categoryName} · ${item.unit}` : 'Stok bilgileri'}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {item && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div className="flex flex-wrap gap-2">
                <Badge variant={item.isCritical ? 'warning' : 'success'}>
                  {item.isCritical ? 'Kritik stok' : 'Normal'}
                </Badge>
                <Badge variant="outline">{item.categoryName}</Badge>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Mevcut stok</dt>
                  <dd className="font-medium">
                    {item.currentStock} {item.unit}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Minimum stok</dt>
                  <dd className="font-medium">
                    {item.minStock} {item.unit}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Son alış fiyatı</dt>
                  <dd className="font-medium">{item.lastPurchasePriceLabel}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Ortalama maliyet</dt>
                  <dd className="font-medium">{item.averageCostLabel}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Güncelleme</dt>
                  <dd className="font-medium">{formatDateTimeTr(item.updatedAt)}</dd>
                </div>
              </dl>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Hareket geçmişi</h3>
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                  Placeholder — stok hareket kaydı sonraki adımda bağlanacak. CRUD ve stok
                  düşme mantığı bu sürümde yok.
                </div>
              </section>
            </motion.div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
