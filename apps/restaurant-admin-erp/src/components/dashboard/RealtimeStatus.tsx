import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RealtimeStatusProps {
  status: string;
}

function getStatusMeta(status: string) {
  const key = String(status || '').toUpperCase();
  if (key === 'SUBSCRIBED') {
    return { label: 'Canlı', variant: 'success' as const, description: 'Supabase realtime kanalı aktif' };
  }
  if (key === 'CHANNEL_ERROR' || key === 'TIMED_OUT') {
    return { label: 'Bağlantı sorunu', variant: 'warning' as const, description: 'Realtime yeniden bağlanıyor' };
  }
  if (key === 'UNAVAILABLE') {
    return { label: 'Realtime kapalı', variant: 'secondary' as const, description: 'Supabase istemcisi kullanılamıyor' };
  }
  return { label: 'Bağlanıyor', variant: 'outline' as const, description: 'Sipariş kanalı hazırlanıyor' };
}

export function RealtimeStatus({ status }: RealtimeStatusProps) {
  const meta = getStatusMeta(status);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Realtime hazırlığı</CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </div>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Kanal: <code className="rounded bg-muted px-1 py-0.5">orders</code> · Filtre:{' '}
          <code className="rounded bg-muted px-1 py-0.5">restaurant_id</code>
        </CardContent>
      </Card>
    </motion.div>
  );
}
