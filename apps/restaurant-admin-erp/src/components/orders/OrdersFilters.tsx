import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ERP_ORDER_FILTERS, type ErpOrderFilterId } from '@/lib/order-status';
import { cn } from '@/lib/utils';

interface OrdersFiltersProps {
  filter: ErpOrderFilterId;
  search: string;
  onFilterChange: (filter: ErpOrderFilterId) => void;
  onSearchChange: (search: string) => void;
}

export function OrdersFilters({
  filter,
  search,
  onFilterChange,
  onSearchChange,
}: OrdersFiltersProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {ERP_ORDER_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilterChange(item.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              filter === item.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:bg-muted',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="relative w-full lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Sipariş no, müşteri veya telefon ara…"
          className="pl-9"
          aria-label="Sipariş ara"
        />
      </div>
    </div>
  );
}
