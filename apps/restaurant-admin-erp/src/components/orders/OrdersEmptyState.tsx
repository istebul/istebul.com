import { ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function OrdersEmptyState() {
  return (
    <Card>
      <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="rounded-full bg-muted p-4 text-muted-foreground">
          <ShoppingBag className="h-8 w-8" aria-hidden />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Sipariş bulunamadı</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Seçili filtreye veya arama kriterine uygun sipariş yok.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
