import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReservationListItem } from '@/data/reservations-api';

interface ReservationsTableProps {
  rows: ReservationListItem[];
  onOpen: (id: string) => void;
}

function statusVariant(status: string) {
  if (status === 'confirmed' || status === 'seated') return 'success' as const;
  if (status === 'pending') return 'warning' as const;
  if (status === 'no_show' || status === 'cancelled') return 'secondary' as const;
  return 'outline' as const;
}

export function ReservationsTable({ rows, onOpen }: ReservationsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rezervasyon Listesi</CardTitle>
        <CardDescription>
          Misafir rezervasyonu · masa · provizyon · ön sipariş hazırlığı
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 pr-3 font-medium">Saat</th>
              <th className="pb-3 pr-3 font-medium">Müşteri</th>
              <th className="pb-3 pr-3 font-medium">Telefon</th>
              <th className="pb-3 pr-3 font-medium">Kişi</th>
              <th className="pb-3 pr-3 font-medium">Salon</th>
              <th className="pb-3 pr-3 font-medium">Masa</th>
              <th className="pb-3 pr-3 font-medium">Durum</th>
              <th className="pb-3 pr-3 font-medium">Provizyon</th>
              <th className="pb-3 pr-3 font-medium">Ön Sipariş</th>
              <th className="pb-3 pr-3 font-medium">Not</th>
              <th className="pb-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0">
                <td className="py-3 pr-3 font-medium">
                  <div>{row.time}</div>
                  <div className="text-xs text-muted-foreground">{row.date}</div>
                </td>
                <td className="py-3 pr-3">{row.customerName}</td>
                <td className="py-3 pr-3">{row.phone || '—'}</td>
                <td className="py-3 pr-3">{row.guestCount}</td>
                <td className="py-3 pr-3">{row.salon}</td>
                <td className="py-3 pr-3">{row.tableName}</td>
                <td className="py-3 pr-3">
                  <Badge variant={statusVariant(row.status)}>{row.statusLabel}</Badge>
                </td>
                <td className="py-3 pr-3">
                  {row.guarantee ? (
                    <div>
                      <div className="font-medium">{row.guarantee.statusLabel}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.guarantee.amountLabel}
                      </div>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-3 pr-3">
                  <Badge variant={row.hasPreorder ? 'default' : 'outline'}>
                    {row.hasPreorder ? 'Var' : 'Yok'}
                  </Badge>
                </td>
                <td className="max-w-[160px] truncate py-3 pr-3 text-muted-foreground">
                  {row.notes || '—'}
                </td>
                <td className="py-3">
                  <Button variant="outline" size="sm" onClick={() => onOpen(row.id)}>
                    <Eye className="h-4 w-4" />
                    Detay
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
