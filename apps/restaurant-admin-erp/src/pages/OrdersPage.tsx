import { motion } from 'framer-motion';
import { DashboardError } from '@/components/dashboard/DashboardError';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus';
import { OrderDetailDrawer } from '@/components/orders/OrderDetailDrawer';
import { OrdersEmptyState } from '@/components/orders/OrdersEmptyState';
import { OrdersFilters } from '@/components/orders/OrdersFilters';
import { OrdersKpiBar } from '@/components/orders/OrdersKpiBar';
import { OrdersPagination } from '@/components/orders/OrdersPagination';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/TenantContext';
import { useOrdersPage } from '@/hooks/useOrdersPage';

export function OrdersPage() {
  const { restaurantId, tenant, isLoading: tenantLoading, error: tenantError, reloadTenants } =
    useTenant();

  const orders = useOrdersPage(restaurantId);

  if (tenantLoading) {
    return <DashboardLoading label="Restoran bağlamı yükleniyor…" />;
  }

  if (tenantError) {
    return <DashboardError message={tenantError} onRetry={() => void reloadTenants()} />;
  }

  if (!restaurantId || !tenant) {
    return <DashboardError message="Aktif restoran seçilemedi." onRetry={() => void reloadTenants()} />;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">P7-C Siparişler</Badge>
            {orders.isLoading && <Badge variant="outline">Güncelleniyor</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sipariş Yönetimi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.name} · <span className="font-mono text-xs">{restaurantId}</span>
          </p>
        </div>
      </motion.div>

      <OrdersKpiBar kpis={orders.kpis} />

      <OrdersFilters
        filter={orders.filter}
        search={orders.search}
        onFilterChange={orders.setFilter}
        onSearchChange={orders.setSearch}
      />

      {orders.error && !orders.rows.length && (
        <DashboardError message={orders.error} onRetry={() => void orders.reload()} />
      )}

      {orders.isLoading && !orders.rows.length ? (
        <DashboardLoading label="Siparişler yükleniyor…" />
      ) : orders.rows.length === 0 ? (
        <OrdersEmptyState />
      ) : (
        <>
          <OrdersTable rows={orders.rows} onOpen={orders.openOrder} />
          <OrdersPagination
            page={orders.page}
            totalPages={orders.totalPages}
            total={orders.total}
            onPageChange={orders.setPage}
          />
        </>
      )}

      <RealtimeStatus status={orders.realtimeStatus} />

      <OrderDetailDrawer
        open={Boolean(orders.selectedOrderId)}
        detail={orders.orderDetail}
        isLoading={orders.detailLoading}
        isUpdating={orders.isUpdating}
        error={orders.detailError}
        onClose={orders.closeOrder}
        onStatusChange={async (status) => {
          if (!orders.selectedOrderId) return;
          await orders.changeOrderStatus(orders.selectedOrderId, status);
        }}
      />
    </div>
  );
}
