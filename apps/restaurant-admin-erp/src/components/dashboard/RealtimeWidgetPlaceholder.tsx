import { motion } from 'framer-motion';
import { Activity, ChefHat, CreditCard, UtensilsCrossed } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RealtimeEvent } from '@/data/mock-data';
import { cn } from '@/lib/utils';

const EVENT_ICONS = {
  order: UtensilsCrossed,
  reservation: Activity,
  kitchen: ChefHat,
  payment: CreditCard,
} as const;

const STATUS_VARIANT = {
  active: 'default',
  completed: 'success',
  warning: 'warning',
} as const;

interface RealtimeWidgetPlaceholderProps {
  events: RealtimeEvent[];
  title?: string;
  description?: string;
}

export function RealtimeWidgetPlaceholder({
  events,
  title = 'Canlı Akış',
  description = 'Mock realtime widget — WebSocket bağlantısı henüz yok',
}: RealtimeWidgetPlaceholderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[280px] pr-3">
            <ul className="space-y-3">
              {events.map((event, index) => {
                const Icon = EVENT_ICONS[event.type];
                return (
                  <motion.li
                    key={event.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="rounded-md bg-background p-2 text-primary shadow-sm">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{event.title}</p>
                        <Badge variant={STATUS_VARIANT[event.status]} className="text-[10px]">
                          {event.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>
                    </div>
                    <span className={cn('shrink-0 text-xs text-muted-foreground')}>{event.time}</span>
                  </motion.li>
                );
              })}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface RealtimeSummaryPlaceholderProps {
  activeOrders: number;
  kitchenQueue: number;
  openTables: number;
}

export function RealtimeSummaryPlaceholder({
  activeOrders,
  kitchenQueue,
  openTables,
}: RealtimeSummaryPlaceholderProps) {
  const items = [
    { label: 'Aktif sipariş', value: activeOrders },
    { label: 'Mutfak kuyruğu', value: kitchenQueue },
    { label: 'Açık masa', value: openTables },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Anlık Durum</CardTitle>
        <CardDescription>Mock realtime özet widget</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border bg-muted/20 p-3 text-center">
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
