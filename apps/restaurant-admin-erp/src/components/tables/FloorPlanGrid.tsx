import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FloorTableCardView } from '@/components/tables/FloorTableCard';
import type { FloorTableCard } from '@/data/tables-api';

interface FloorPlanGridProps {
  tables: FloorTableCard[];
  salon: string | null;
  onOpen: (id: string) => void;
}

/**
 * Responsive floor-plan grid.
 * Cards carry data-table-id / data-pos-* for a future drag-drop layer
 * without changing the current interactive card UX.
 */
export function FloorPlanGrid({ tables, salon, onOpen }: FloorPlanGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Floor Plan</CardTitle>
        <CardDescription>
          {salon ? `${salon} · ` : ''}
          Responsive kart grid · sürükle-bırak mimarisi hazır (pos_x / pos_y / layout_meta)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          data-floor-plan="grid"
          data-salon={salon || undefined}
        >
          {tables.map((table, index) => (
            <FloorTableCardView
              key={table.id}
              table={table}
              onOpen={onOpen}
              index={index}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
