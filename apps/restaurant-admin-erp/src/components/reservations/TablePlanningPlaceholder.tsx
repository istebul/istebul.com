import { LayoutGrid } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RestaurantTableRow } from '@/data/reservations-api';

interface TablePlanningPlaceholderProps {
  tables: RestaurantTableRow[];
}

export function TablePlanningPlaceholder({ tables }: TablePlanningPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Table Planning</CardTitle>
        <CardDescription>
          Placeholder — ileride görsel masa planına bağlanacak
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <LayoutGrid className="h-4 w-4" />
            {tables.length
              ? `${tables.length} masa tanımı yüklendi (salon bazlı özet)`
              : 'Henüz restaurant_tables kaydı yok'}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tables.slice(0, 9).map((table) => (
              <div key={table.id} className="rounded-md border bg-background px-3 py-2 text-sm">
                <p className="font-medium">{table.name}</p>
                <p className="text-xs text-muted-foreground">
                  {table.salon} · {table.capacity} kişi
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
