import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CxEmpty } from '@/components/cx/CxStates';
import type { PreorderCartItem } from '@/data/cx-api';
import { formatCurrencyTry } from '@/lib/format';

interface PreorderStepProps {
  cart: PreorderCartItem[];
  total: number;
  onQty: (id: string, qty: number) => void;
  onNote: (id: string, note: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function PreorderStep({
  cart,
  total,
  onQty,
  onNote,
  onContinue,
  onBack,
}: PreorderStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ön Sipariş</CardTitle>
        <CardDescription>Sepet · adet · not · toplam (ödeme yok)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cart.length === 0 ? (
          <CxEmpty
            title="Sepet boş"
            description="Menüden ürün ekleyebilir veya doğrudan provizyon adımına geçebilirsiniz."
          />
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.menuItemId} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrencyTry(item.unitPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onQty(item.menuItemId, item.quantity - 1)}
                    >
                      −
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onQty(item.menuItemId, item.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <Input
                  className="mt-2"
                  placeholder="Kalem notu"
                  value={item.note}
                  onChange={(event) => onNote(item.menuItemId, event.target.value)}
                />
              </div>
            ))}
            <p className="text-right text-lg font-semibold">{formatCurrencyTry(total)}</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Bu adımda ödeme alınmaz. Sipariş rezervasyonla birlikte kaydedilir.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            Geri
          </Button>
          <Button className="flex-1" onClick={onContinue}>
            Provizyon bilgisi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
