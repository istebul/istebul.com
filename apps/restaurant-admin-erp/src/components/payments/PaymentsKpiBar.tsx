import {
  BadgeDollarSign,
  CircleDollarSign,
  Clock3,
  ShieldAlert,
  Undo2,
  WalletCards,
} from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import type { PaymentKpis } from '@/data/payments-api';

interface PaymentsKpiBarProps {
  kpis: PaymentKpis | null;
}

export function PaymentsKpiBar({ kpis }: PaymentsKpiBarProps) {
  if (!kpis) return null;

  const cards = [
    {
      id: 'today',
      label: 'Bugünkü Tahsilat',
      value: kpis.todayCapturedLabel,
      icon: BadgeDollarSign,
    },
    {
      id: 'pending',
      label: 'Bekleyen Provizyon',
      value: String(kpis.pendingGuarantee),
      icon: Clock3,
    },
    {
      id: 'authorized',
      label: 'Authorized',
      value: String(kpis.authorized),
      icon: ShieldAlert,
    },
    {
      id: 'capture',
      label: 'Capture Bekleyen',
      value: String(kpis.captureWaiting),
      icon: WalletCards,
    },
    {
      id: 'refund',
      label: 'Refund Bekleyen',
      value: String(kpis.refundWaiting),
      icon: Undo2,
    },
    {
      id: 'noshow',
      label: 'No-show Tahsilatı',
      value: kpis.noShowCapturedLabel,
      icon: CircleDollarSign,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card, index) => (
        <KpiCard key={card.id} {...card} index={index} />
      ))}
    </div>
  );
}
