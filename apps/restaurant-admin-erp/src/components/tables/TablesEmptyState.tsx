import { LayoutGrid } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function TablesEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <LayoutGrid className="h-10 w-10 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-base font-semibold">Henüz masa tanımı yok</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Bu restoran için `restaurant_tables` kaydı bulunamadı. Masalar eklendiğinde salon
            sekmeleri ve floor plan burada gerçek zamanlı görünecek.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
