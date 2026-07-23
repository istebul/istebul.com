import {
  CalendarClock,
  Clock3,
  ListOrdered,
  UserCheck,
  UserRoundX,
  Users,
} from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import type { CheckinKpis } from '@/data/checkin-api';

interface CheckinKpiBarProps {
  kpis: CheckinKpis | null;
}

export function CheckinKpiBar({ kpis }: CheckinKpiBarProps) {
  if (!kpis) return null;

  const cards = [
    { id: 'today', label: 'Bugünkü rezervasyon', value: String(kpis.todayTotal), icon: CalendarClock },
    { id: 'awaiting', label: 'Check-in bekleyen', value: String(kpis.awaitingCheckin), icon: Users },
    { id: 'checked', label: 'Check-in yapıldı', value: String(kpis.checkedIn), icon: UserCheck },
    { id: 'queue', label: 'Kuyruk', value: String(kpis.queueWaiting), icon: ListOrdered },
    { id: 'late', label: 'Geç', value: String(kpis.late), icon: Clock3 },
    { id: 'noshow', label: 'No-show', value: String(kpis.noShow), icon: UserRoundX },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card, index) => (
        <KpiCard key={card.id} {...card} index={index} />
      ))}
    </div>
  );
}
