import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { InventoryCategoryRow } from '@/data/inventory-api';
import { cn } from '@/lib/utils';

interface InventoryFiltersProps {
  search: string;
  categoryId: string | null;
  criticalOnly: boolean;
  categories: InventoryCategoryRow[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onCriticalOnlyChange: (value: boolean) => void;
}

export function InventoryFilters({
  search,
  categoryId,
  criticalOnly,
  categories,
  onSearchChange,
  onCategoryChange,
  onCriticalOnlyChange,
}: InventoryFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCriticalOnlyChange(false)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              !criticalOnly
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            Tümü
          </button>
          <button
            type="button"
            onClick={() => onCriticalOnlyChange(true)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              criticalOnly
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            Kritik stok
          </button>
        </div>

        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Ürün, kategori veya birim ara…"
            className="pl-9"
            aria-label="Stok ara"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onCategoryChange(null)}
          className={cn(
            'shrink-0 rounded-md border px-3 py-1.5 text-sm transition-colors',
            categoryId === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background hover:bg-muted',
          )}
        >
          Tüm kategoriler
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'shrink-0 rounded-md border px-3 py-1.5 text-sm transition-colors',
              categoryId === category.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
