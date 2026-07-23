import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { PaymentListFilters } from '@/data/payments-api';
import {
  PAYMENT_DATE_PRESETS,
  PAYMENT_PROVIDERS,
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  type PaymentDatePreset,
} from '@/lib/payment-status';
import { cn } from '@/lib/utils';

interface PaymentsFiltersProps {
  filters: PaymentListFilters;
  onDatePresetChange: (preset: PaymentDatePreset) => void;
  onProviderChange: (provider: PaymentListFilters['provider']) => void;
  onStatusChange: (status: PaymentListFilters['status']) => void;
  onSearchChange: (search: string) => void;
}

export function PaymentsFilters({
  filters,
  onDatePresetChange,
  onProviderChange,
  onStatusChange,
  onSearchChange,
}: PaymentsFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PAYMENT_DATE_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onDatePresetChange(item.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              filters.datePreset === item.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:bg-muted',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="flex min-w-[160px] flex-col gap-1 text-xs text-muted-foreground">
          Provider
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={filters.provider}
            onChange={(event) => onProviderChange(event.target.value)}
            aria-label="Provider filtresi"
          >
            <option value="all">Tümü</option>
            {PAYMENT_PROVIDERS.map((code) => (
              <option key={code} value={code}>
                {PAYMENT_PROVIDER_LABELS[code]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[180px] flex-col gap-1 text-xs text-muted-foreground">
          Durum
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            value={filters.status}
            onChange={(event) => onStatusChange(event.target.value)}
            aria-label="Durum filtresi"
          >
            <option value="all">Tümü</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <div className="relative w-full lg:max-w-sm lg:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Müşteri, telefon, rezervasyon ara…"
            className="pl-9"
            aria-label="Ödeme ara"
          />
        </div>
      </div>
    </div>
  );
}
