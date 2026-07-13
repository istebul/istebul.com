import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { MenuItemRow } from '@/data/menu-api';

interface MenuItemEditDialogProps {
  open: boolean;
  item: MenuItemRow | null;
  onClose: () => void;
}

export function MenuItemEditDialog({ open, item, onClose }: MenuItemEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ürün Düzenle</DialogTitle>
          <DialogDescription>
            CRUD henüz aktif değil — form alanları sonraki adım için hazırlandı.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">İsim</label>
            <Input defaultValue={item?.name || ''} disabled />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Fiyat</label>
            <Input defaultValue={item ? String(item.price) : ''} disabled />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Kategori</label>
            <Input defaultValue={item?.categoryName || ''} disabled />
          </div>
          <Button className="w-full" disabled>
            Kaydet (yakında)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
