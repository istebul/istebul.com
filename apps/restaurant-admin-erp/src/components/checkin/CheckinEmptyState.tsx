import { UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function CheckinEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <UserCheck className="h-10 w-10 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-base font-semibold">Bugün için rezervasyon yok</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Walk-in ekleyerek kuyruğu başlatabilir veya gelecek rezervasyonları bekleyebilirsiniz.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
