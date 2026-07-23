import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ConfirmationStepProps {
  reservationId: string | null;
  restaurantName: string;
  onRestart: () => void;
}

export function ConfirmationStep({
  reservationId,
  restaurantName,
  onRestart,
}: ConfirmationStepProps) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Rezervasyon tamamlandı</CardTitle>
          <CardDescription>{restaurantName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kod:{' '}
            <span className="font-mono text-foreground">
              {reservationId ? reservationId.slice(0, 8).toUpperCase() : '—'}
            </span>
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-dashed p-4 text-center text-sm">
              <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-lg bg-muted font-mono text-xs">
                QR
              </div>
              QR Placeholder
            </div>
            <div className="rounded-xl border border-dashed p-4 text-center text-sm">
              WhatsApp Placeholder
            </div>
            <div className="rounded-xl border border-dashed p-4 text-center text-sm">
              Takvime ekle Placeholder
            </div>
          </div>

          <Button className="w-full" onClick={onRestart}>
            Yeni yolculuk
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
