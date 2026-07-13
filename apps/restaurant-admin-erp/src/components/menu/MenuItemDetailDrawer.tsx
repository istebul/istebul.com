import { motion } from 'framer-motion';
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
import type { MenuItemRow } from '@/data/menu-api';
import { formatDateTimeTr } from '@/lib/format-datetime';

interface MenuItemDetailDrawerProps {
  open: boolean;
  item: MenuItemRow | null;
  onClose: () => void;
  onEdit: () => void;
}

export function MenuItemDetailDrawer({
  open,
  item,
  onClose,
  onEdit,
}: MenuItemDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{item?.name || 'Ürün Detayı'}</SheetTitle>
          <SheetDescription>
            {item ? `${item.categoryName} · ${item.priceLabel}` : 'Ürün bilgileri'}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {item && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.active ? 'success' : 'secondary'}>
                  {item.active ? 'Aktif' : 'Pasif'}
                </Badge>
                <Badge variant="outline">{item.categoryName}</Badge>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">İsim</dt>
                  <dd className="font-medium">{item.name}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Fiyat</dt>
                  <dd className="font-medium">{item.priceLabel}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Kategori</dt>
                  <dd className="font-medium">{item.categoryName}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b pb-2">
                  <dt className="text-muted-foreground">Son güncelleme</dt>
                  <dd className="font-medium">{formatDateTimeTr(item.updatedAt)}</dd>
                </div>
              </dl>

              {item.description && (
                <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Açıklama</p>
                  <p>{item.description}</p>
                </div>
              )}

              <Button className="w-full" variant="outline" onClick={onEdit}>
                Düzenle (hazırlık)
              </Button>
            </motion.div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
