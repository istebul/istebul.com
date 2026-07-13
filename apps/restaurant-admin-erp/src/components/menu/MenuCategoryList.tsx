import { motion } from 'framer-motion';
import type { MenuCategoryRow } from '@/data/menu-api';
import { cn } from '@/lib/utils';

interface MenuCategoryListProps {
  categories: MenuCategoryRow[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function MenuCategoryList({
  categories,
  selectedCategoryId,
  onSelect,
}: MenuCategoryListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card p-4"
    >
      <h2 className="mb-3 text-sm font-semibold">Kategoriler</h2>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            'shrink-0 rounded-md border px-3 py-2 text-left text-sm transition-colors',
            selectedCategoryId === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background hover:bg-muted',
          )}
        >
          Tümü
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={cn(
              'shrink-0 rounded-md border px-3 py-2 text-left text-sm transition-colors',
              selectedCategoryId === category.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted',
            )}
          >
            <span className="block font-medium">{category.name}</span>
            <span
              className={cn(
                'text-xs',
                selectedCategoryId === category.id
                  ? 'text-primary-foreground/80'
                  : 'text-muted-foreground',
              )}
            >
              Sıra: {category.sortOrder}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
