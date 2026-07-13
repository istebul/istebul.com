import { motion } from 'framer-motion';
import {
  CategoryChartPlaceholder,
  RevenueChartPlaceholder,
} from '@/components/dashboard/ChartPlaceholder';
import { KpiCard } from '@/components/dashboard/KpiCard';
import {
  RealtimeSummaryPlaceholder,
  RealtimeWidgetPlaceholder,
} from '@/components/dashboard/RealtimeWidgetPlaceholder';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/TenantContext';
import { getDashboardMockData } from '@/data/mock-data';

export function DashboardPage() {
  const { restaurantId, tenant } = useTenant();
  const data = getDashboardMockData(restaurantId);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">P7-A ERP</Badge>
            <Badge variant="outline">{tenant.plan}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Operasyon Özeti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.name} · <span className="font-mono text-xs">{restaurantId}</span>
          </p>
        </div>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi, index) => (
          <KpiCard key={kpi.id} {...kpi} index={index} />
        ))}
      </div>

      <RealtimeSummaryPlaceholder
        activeOrders={Number.parseInt(data.kpis[1]?.value ?? '0', 10) || 0}
        kitchenQueue={Math.max(3, Math.floor((Number.parseInt(data.kpis[1]?.value ?? '0', 10) || 0) / 4))}
        openTables={Math.max(8, Math.floor((Number.parseInt(data.kpis[2]?.value.replace('%', '') ?? '0', 10) || 0) / 4))}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChartPlaceholder data={data.revenueSeries} />
        </div>
        <RealtimeWidgetPlaceholder events={data.realtimeEvents} />
      </div>

      <CategoryChartPlaceholder data={data.categoryBreakdown} />
    </div>
  );
}
