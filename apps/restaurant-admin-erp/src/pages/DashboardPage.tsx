import { motion } from 'framer-motion';
import { Banknote, Package, ShoppingBag, Wallet } from 'lucide-react';
import { DashboardError } from '@/components/dashboard/DashboardError';
import { HourlyOrdersChart, OrderStatusChart } from '@/components/dashboard/DashboardCharts';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus';
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/TenantContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatCurrencyTry } from '@/lib/format';

export function DashboardPage() {
  const { restaurantId, tenant, isLoading: tenantLoading, error: tenantError, reloadTenants } = useTenant();
  const { data, isLoading, error, reload, realtimeStatus } = useDashboardData(restaurantId);

  if (tenantLoading) {
    return <DashboardLoading label="Restoran bağlamı yükleniyor…" />;
  }

  if (tenantError) {
    return <DashboardError message={tenantError} onRetry={() => void reloadTenants()} />;
  }

  if (!restaurantId || !tenant) {
    return <DashboardError message="Aktif restoran seçilemedi." onRetry={() => void reloadTenants()} />;
  }

  if (isLoading && !data) {
    return <DashboardLoading />;
  }

  if (error && !data) {
    return <DashboardError message={error} onRetry={() => void reload()} />;
  }

  if (!data) {
    return <DashboardError message="Dashboard verisi bulunamadı." onRetry={() => void reload()} />;
  }

  const kpis = [
    {
      id: 'active-orders',
      label: 'Aktif Sipariş',
      value: String(data.kpis.activeOrders),
      icon: ShoppingBag,
      hint: 'Yeni + hazırlanıyor',
    },
    {
      id: 'today-revenue',
      label: 'Bugünkü Ciro',
      value: formatCurrencyTry(data.kpis.todayRevenue),
      icon: Banknote,
      hint: 'Tamamlanan siparişler',
    },
    {
      id: 'avg-order',
      label: 'Ortalama Sipariş Tutarı',
      value: formatCurrencyTry(data.kpis.averageOrderValue),
      icon: Wallet,
      hint: 'Bugünkü tamamlanan siparişler',
    },
    {
      id: 'active-products',
      label: 'Aktif Ürün Sayısı',
      value: String(data.kpis.activeProducts),
      icon: Package,
      hint: 'Aktif menü ürünleri',
    },
  ];

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
            <Badge variant="secondary">P7-B Canlı</Badge>
            <Badge variant="outline">{tenant.plan}</Badge>
            {isLoading && <Badge variant="outline">Güncelleniyor</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Operasyon Özeti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.name} · <span className="font-mono text-xs">{restaurantId}</span>
          </p>
        </div>
      </motion.div>

      {error && (
        <DashboardError title="Kısmi güncelleme hatası" message={error} onRetry={() => void reload()} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi, index) => (
          <KpiCard key={kpi.id} {...kpi} index={index} />
        ))}
      </div>

      <RecentOrdersTable rows={data.recentOrders} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <HourlyOrdersChart data={data.hourlyOrders} />
        </div>
        <RealtimeStatus status={realtimeStatus} />
      </div>

      <OrderStatusChart data={data.statusDistribution} />
    </div>
  );
}
