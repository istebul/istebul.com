import {
  CalendarCheck2,
  CalendarClock,
  Percent,
  UserRoundX,
  Users,
} from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import type { ReservationsKpis } from '@/data/reservations-api';

interface ReservationsKpiBarProps {
  kpis: ReservationsKpis | null;
}

export function ReservationsKpiBar({ kpis }: ReservationsKpiBarProps) {
  if (!kpis) return null;

  const cards = [
    {
      id: 'today',
      label: 'Bugünkü rezervasyon',
      value: String(kpis.todayTotal),
      icon: CalendarClock,
    },
    {
      id: 'pending',
      label: 'Bekleyen',
      value: String(kpis.pending),
      icon: Users,
    },
    {
      id: 'confirmed',
      label: 'Onaylanan',
      value: String(kpis.confirmed),
      icon: CalendarCheck2,
    },
    {
      id: 'noshow',
      label: 'No-show',
      value: String(kpis.noShow),
      icon: UserRoundX,
    },
    {
      id: 'occupancy',
      label: 'Doluluk oranı',
      value: kpis.occupancyLabel,
      icon: Percent,
      hint: 'Bugün onaylı / masa sayısı',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card, index) => (
        <KpiCard key={card.id} {...card} index={index} />
      ))}
    </div>
  );
}
