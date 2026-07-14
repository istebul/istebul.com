import { CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PaymentsEmptyState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden />
          Ödeme işlemi yok
        </CardTitle>
        <CardDescription>
          Seçili filtrelerde gösterilecek provizyon veya tahsilat kaydı bulunamadı.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        P7-I altyapısı hazır. Gerçek kart / provider işlemleri sonraki fazda bağlanacak.
      </CardContent>
    </Card>
  );
}
