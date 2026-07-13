import { UtensilsCrossed } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function MenuEmptyState() {
  return (
    <Card>
      <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="rounded-full bg-muted p-4 text-muted-foreground">
          <UtensilsCrossed className="h-8 w-8" aria-hidden />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Ürün bulunamadı</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Seçili kategori veya filtreye uygun menü ürünü yok.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
