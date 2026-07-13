import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  hint?: string;
  index?: number;
}

export function KpiCard({ label, value, change, trend, icon: Icon, hint, index = 0 }: KpiCardProps) {
  const TrendIcon = trend === 'down' ? TrendingDown : TrendingUp;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            {trend !== 'neutral' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                  trend === 'up'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                )}
              >
                <TrendIcon className="h-3 w-3" aria-hidden />
                {change}
              </span>
            )}
            {trend === 'neutral' && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                {change}
              </span>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
