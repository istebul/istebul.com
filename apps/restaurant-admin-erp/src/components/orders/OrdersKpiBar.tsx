import { Banknote, ClipboardList, Clock, CookingPot } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import type { OrdersKpis } from '@/data/orders-api';
import { formatCurrencyTry } from '@/lib/format';

interface OrdersKpiBarProps {
  kpis: OrdersKpis | null;
}

export function OrdersKpiBar({ kpis }: OrdersKpiBarProps) {
  if (!kpis) return null;

  const items = [
    {
      id: 'total',
      label: 'Toplam Sipariş',
      value: String(kpis.totalOrders),
      icon: ClipboardList,
    },
    {
      id: 'pending',
      label: 'Bekleyen',
      value: String(kpis.pendingOrders),
      icon: Clock,
    },
    {
      id: 'preparing',
      label: 'Hazırlanan',
      value: String(kpis.preparingOrders),
      icon: CookingPot,
    },
    {
      id: 'revenue',
      label: 'Bugünkü Ciro',
      value: formatCurrencyTry(kpis.todayRevenue),
      icon: Banknote,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <KpiCard key={item.id} {...item} index={index} />
      ))}
    </div>
  );
}
