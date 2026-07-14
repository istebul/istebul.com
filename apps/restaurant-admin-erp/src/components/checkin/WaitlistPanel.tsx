import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CheckinTableOption, WaitlistItem } from '@/data/checkin-api';
import { suggestTablesForParty } from '@/data/checkin-api';

interface WaitlistPanelProps {
  items: WaitlistItem[];
  tables: CheckinTableOption[];
  busy?: boolean;
  onSeat: (waitlistId: string, tableId: string) => Promise<void>;
  onCancel: (waitlistId: string) => Promise<void>;
}

export function WaitlistPanel({ items, tables, busy, onSeat, onCancel }: WaitlistPanelProps) {
  const [tableByEntry, setTableByEntry] = useState<Record<string, string>>({});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bekleme listesi (Queue)</CardTitle>
        <CardDescription>Walk-in ve taşma kuyruğu · masa atayıp oturtabilirsiniz</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Kuyruk boş.
          </p>
        ) : (
          items.map((item) => {
            const suggestions = suggestTablesForParty(
              tables,
              item.guestCount,
              item.preferredSalon,
            );
            const selectedTable = tableByEntry[item.id] || suggestions[0]?.id || '';

            return (
              <div key={item.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.guestCount} kişi · {item.phone || 'telefon yok'} · {item.statusLabel}
                    </p>
                    {item.preferredSalon ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Salon tercihi: {item.preferredSalon}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedTable}
                    onChange={(event) =>
                      setTableByEntry((prev) => ({ ...prev, [item.id]: event.target.value }))
                    }
                    aria-label={`${item.customerName} masa seçimi`}
                  >
                    <option value="">Masa seç</option>
                    {tables
                      .filter((table) => table.active)
                      .map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.name} · {table.salon} · {table.capacity} kişi · {table.status}
                        </option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={busy || !selectedTable}
                    onClick={() => void onSeat(item.id, selectedTable)}
                  >
                    Masa ata & oturt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void onCancel(item.id)}
                  >
                    İptal
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
