import { AlertTriangle, Boxes, Layers3, Package } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import type { InventorySummary } from '@/data/inventory-api';

interface InventorySummaryCardsProps {
  summary: InventorySummary | null;
}

export function InventorySummaryCards({ summary }: InventorySummaryCardsProps) {
  if (!summary) return null;

  const cards = [
    {
      id: 'total',
      label: 'Toplam Stok Kalemi',
      value: String(summary.totalItems),
      icon: Package,
    },
    {
      id: 'critical',
      label: 'Kritik Stok',
      value: String(summary.criticalItems),
      icon: AlertTriangle,
      hint: 'Mevcut ≤ minimum',
    },
    {
      id: 'low',
      label: 'Düşük Stok',
      value: String(summary.lowStockItems),
      icon: Boxes,
    },
    {
      id: 'categories',
      label: 'Kategori',
      value: String(summary.categoryCount),
      icon: Layers3,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <KpiCard key={card.id} {...card} index={index} />
      ))}
    </div>
  );
}
