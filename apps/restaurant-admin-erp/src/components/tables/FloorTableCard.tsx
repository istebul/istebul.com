import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import type { FloorTableCard as FloorTableCardModel } from '@/data/tables-api';
import { TABLE_STATUS_STYLES } from '@/lib/table-status';
import { cn } from '@/lib/utils';

interface FloorTableCardProps {
  table: FloorTableCardModel;
  onOpen: (id: string) => void;
  index?: number;
}

export function FloorTableCardView({ table, onOpen, index = 0 }: FloorTableCardProps) {
  const styles = TABLE_STATUS_STYLES[table.status];

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.24) }}
      onClick={() => onOpen(table.id)}
      data-table-id={table.id}
      data-pos-x={table.posX ?? undefined}
      data-pos-y={table.posY ?? undefined}
      className={cn(
        'flex h-full w-full flex-col rounded-xl border p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        styles.card,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold tracking-tight">{table.name}</p>
          <p className="text-xs text-muted-foreground">{table.capacity} kişi</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
            styles.badge,
          )}
        >
          {table.statusLabel}
        </span>
      </div>

      <div className="mt-auto space-y-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Saat</span>
          <span className="font-medium">{table.reservedAt || '—'}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Misafir</span>
          <span className="truncate font-medium">{table.guestName || '—'}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Kişi</span>
          <span className="font-medium">{table.guestCount ?? '—'}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant={table.hasPreorder ? 'default' : 'outline'} className="text-[10px]">
            Ön sipariş: {table.hasPreorder ? 'Var' : 'Yok'}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Provizyon: {table.guarantee?.statusLabel || '—'}
          </Badge>
        </div>
      </div>
    </motion.button>
  );
}
