import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface MenuItemCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function MenuItemCreateDialog({ open, onClose }: MenuItemCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Ürün</DialogTitle>
          <DialogDescription>
            CRUD henüz aktif değil — yeni ürün formu sonraki adım için hazırlandı.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">İsim</label>
            <Input placeholder="Ürün adı" disabled />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Fiyat</label>
            <Input placeholder="0" disabled />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Kategori</label>
            <Input placeholder="Kategori seçimi yakında" disabled />
          </div>
          <Button className="w-full" disabled>
            Oluştur (yakında)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
