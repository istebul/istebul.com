import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { MenuActiveFilter } from '@/hooks/useMenuPage';
import { cn } from '@/lib/utils';

interface MenuFiltersProps {
  search: string;
  activeFilter: MenuActiveFilter;
  onSearchChange: (value: string) => void;
  onActiveFilterChange: (value: MenuActiveFilter) => void;
}

const ACTIVE_FILTERS: { id: MenuActiveFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'inactive', label: 'Pasif' },
];

export function MenuFilters({
  search,
  activeFilter,
  onSearchChange,
  onActiveFilterChange,
}: MenuFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {ACTIVE_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onActiveFilterChange(item.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              activeFilter === item.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted',
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
          placeholder="Ürün veya kategori ara…"
          className="pl-9"
          aria-label="Ürün ara"
        />
      </div>
    </div>
  );
}
