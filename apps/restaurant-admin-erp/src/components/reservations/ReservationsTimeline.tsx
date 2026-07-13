import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReservationListItem } from '@/data/reservations-api';
import { cn } from '@/lib/utils';

interface ReservationsTimelineProps {
  rows: ReservationListItem[];
}

function buildSlots() {
  const slots: string[] = [];
  for (let hour = 10; hour <= 23; hour += 1) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    if (hour < 23) slots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  return slots;
}

function normalizeTime(value: string): string {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function ReservationsTimeline({ rows }: ReservationsTimelineProps) {
  const slots = buildSlots();
  const bySlot = new Map<string, number>();

  for (const row of rows) {
    const key = normalizeTime(row.time);
    if (!key) continue;
    bySlot.set(key, (bySlot.get(key) || 0) + 1);
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Timeline</CardTitle>
        <CardDescription>10:00 – 23:30 placeholder</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
          {slots.map((slot) => {
            const count = bySlot.get(slot) || 0;
            return (
              <div
                key={slot}
                className={cn(
                  'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
                  count > 0 ? 'border-primary/30 bg-primary/5' : 'border-border/60',
                )}
              >
                <span className="font-medium">{slot}</span>
                <span className="text-xs text-muted-foreground">
                  {count > 0 ? `${count} rezervasyon` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
