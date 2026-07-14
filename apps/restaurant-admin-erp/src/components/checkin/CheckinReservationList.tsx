import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CheckinJourneyItem } from '@/data/checkin-api';

interface CheckinReservationListProps {
  items: CheckinJourneyItem[];
  onOpen: (id: string) => void;
}

export function CheckinReservationList({ items, onOpen }: CheckinReservationListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bugünkü rezervasyonlar</CardTitle>
        <CardDescription>Rezervasyon → masa → ön sipariş → check-in yolculuğu</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 pr-3 font-medium">Saat</th>
              <th className="pb-3 pr-3 font-medium">Misafir</th>
              <th className="pb-3 pr-3 font-medium">Kişi</th>
              <th className="pb-3 pr-3 font-medium">Masa</th>
              <th className="pb-3 pr-3 font-medium">Durum</th>
              <th className="pb-3 pr-3 font-medium">Varış</th>
              <th className="pb-3 pr-3 font-medium">Ön sipariş</th>
              <th className="pb-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/60 last:border-0">
                <td className="py-3 pr-3 font-medium">{item.time}</td>
                <td className="py-3 pr-3">
                  <div>{item.customerName}</div>
                  <div className="text-xs text-muted-foreground">{item.phone || '—'}</div>
                </td>
                <td className="py-3 pr-3">{item.guestCount}</td>
                <td className="py-3 pr-3">
                  <div>{item.tableName}</div>
                  <div className="text-xs text-muted-foreground">{item.salon}</div>
                </td>
                <td className="py-3 pr-3">
                  <Badge variant="outline">{item.statusLabel}</Badge>
                </td>
                <td className="py-3 pr-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant={
                        item.noShow
                          ? 'secondary'
                          : item.arrivalStatus === 'arrived'
                            ? 'success'
                            : item.isLate
                              ? 'warning'
                              : 'outline'
                      }
                    >
                      {item.arrivalLabel}
                    </Badge>
                    {item.isNoShowHint ? (
                      <Badge variant="warning">No-show riski</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <Badge variant={item.hasPreorder ? 'default' : 'outline'}>
                    {item.hasPreorder ? 'Var' : 'Yok'}
                  </Badge>
                </td>
                <td className="py-3">
                  <Button variant="outline" size="sm" onClick={() => onOpen(item.id)}>
                    Check-in
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
