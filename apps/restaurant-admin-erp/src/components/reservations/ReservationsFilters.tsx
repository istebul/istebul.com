import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { DatePreset, RestaurantTableRow } from '@/data/reservations-api';
import { cn } from '@/lib/utils';

interface ReservationsFiltersProps {
  datePreset: DatePreset;
  status: string | null;
  salon: string | null;
  tableId: string | null;
  guestCount: number | null;
  search: string;
  salons: string[];
  tables: RestaurantTableRow[];
  onDatePresetChange: (value: DatePreset) => void;
  onStatusChange: (value: string | null) => void;
  onSalonChange: (value: string | null) => void;
  onTableIdChange: (value: string | null) => void;
  onGuestCountChange: (value: number | null) => void;
  onSearchChange: (value: string) => void;
}

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Bugün' },
  { id: 'tomorrow', label: 'Yarın' },
  { id: 'week', label: 'Bu Hafta' },
  { id: 'all', label: 'Tümü' },
];

const STATUS_OPTIONS = [
  { id: null, label: 'Durum: Tümü' },
  { id: 'pending', label: 'Bekleyen' },
  { id: 'confirmed', label: 'Onaylanan' },
  { id: 'seated', label: 'Oturdu' },
  { id: 'completed', label: 'Tamamlandı' },
  { id: 'cancelled', label: 'İptal' },
  { id: 'no_show', label: 'No-show' },
] as const;

export function ReservationsFilters({
  datePreset,
  status,
  salon,
  tableId,
  guestCount,
  search,
  salons,
  tables,
  onDatePresetChange,
  onStatusChange,
  onSalonChange,
  onTableIdChange,
  onGuestCountChange,
  onSearchChange,
}: ReservationsFiltersProps) {
  const filteredTables = salon ? tables.filter((table) => table.salon === salon) : tables;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {DATE_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onDatePresetChange(item.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              datePreset === item.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={status || ''}
          onChange={(event) => onStatusChange(event.target.value || null)}
          aria-label="Durum filtresi"
        >
          {STATUS_OPTIONS.map((item) => (
            <option key={String(item.id)} value={item.id || ''}>
              {item.label}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={salon || ''}
          onChange={(event) => {
            onSalonChange(event.target.value || null);
            onTableIdChange(null);
          }}
          aria-label="Salon filtresi"
        >
          <option value="">Salon: Tümü</option>
          {salons.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={tableId || ''}
          onChange={(event) => onTableIdChange(event.target.value || null)}
          aria-label="Masa filtresi"
        >
          <option value="">Masa: Tümü</option>
          {filteredTables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.name} ({table.salon})
            </option>
          ))}
        </select>

        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={guestCount || ''}
          onChange={(event) =>
            onGuestCountChange(event.target.value ? Number(event.target.value) : null)
          }
          aria-label="Kişi sayısı filtresi"
        >
          <option value="">Kişi: Tümü</option>
          {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((count) => (
            <option key={count} value={count}>
              {count} kişi
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Müşteri, telefon, masa…"
            className="pl-9"
            aria-label="Rezervasyon ara"
          />
        </div>
      </div>
    </div>
  );
}
