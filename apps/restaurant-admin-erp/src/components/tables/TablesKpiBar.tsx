import { Armchair, CalendarClock, CircleDot, UserRoundCheck } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import type { TablesKpis } from '@/data/tables-api';

interface TablesKpiBarProps {
  kpis: TablesKpis | null;
}

export function TablesKpiBar({ kpis }: TablesKpiBarProps) {
  if (!kpis) return null;

  const cards = [
    {
      id: 'empty',
      label: 'Boş Masa',
      value: String(kpis.empty),
      icon: Armchair,
    },
    {
      id: 'occupied',
      label: 'Dolu Masa',
      value: String(kpis.occupied),
      icon: CircleDot,
    },
    {
      id: 'reserved',
      label: 'Rezerveli',
      value: String(kpis.reserved),
      icon: CalendarClock,
    },
    {
      id: 'checkin',
      label: 'Bekleyen Check-in',
      value: String(kpis.awaitingCheckin),
      icon: UserRoundCheck,
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
