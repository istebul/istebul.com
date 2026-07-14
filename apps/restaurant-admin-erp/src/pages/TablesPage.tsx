import { motion } from 'framer-motion';
import { DashboardError } from '@/components/dashboard/DashboardError';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus';
import { FloorPlanGrid } from '@/components/tables/FloorPlanGrid';
import { SalonTabs } from '@/components/tables/SalonTabs';
import { TableDetailDrawer } from '@/components/tables/TableDetailDrawer';
import { TablesEmptyState } from '@/components/tables/TablesEmptyState';
import { TablesKpiBar } from '@/components/tables/TablesKpiBar';
import { TableStatusLegend } from '@/components/tables/TableStatusLegend';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/TenantContext';
import { useTablesPage } from '@/hooks/useTablesPage';

export function TablesPage() {
  const { restaurantId, tenant, isLoading: tenantLoading, error: tenantError, reloadTenants } =
    useTenant();
  const tables = useTablesPage(restaurantId);

  if (tenantLoading) {
    return <DashboardLoading label="Restoran bağlamı yükleniyor…" />;
  }

  if (tenantError) {
    return <DashboardError message={tenantError} onRetry={() => void reloadTenants()} />;
  }

  if (!restaurantId || !tenant) {
    return (
      <DashboardError message="Aktif restoran seçilemedi." onRetry={() => void reloadTenants()} />
    );
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
            <Badge variant="secondary">P7-G Table Planner</Badge>
            {tables.isLoading && <Badge variant="outline">Güncelleniyor</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Masa Planı</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.name} · <span className="font-mono text-xs">{restaurantId}</span>
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Salon ve masa operasyon merkezi — rezervasyon, check-in, ön sipariş, mutfak ve garson
            akışlarının görsel odağı.
          </p>
        </div>
      </motion.div>

      <TablesKpiBar kpis={tables.kpis} />
      <TableStatusLegend />

      <SalonTabs
        salons={tables.salons}
        activeSalon={tables.activeSalon}
        onChange={tables.setActiveSalon}
      />

      {tables.error && !tables.tables.length && (
        <DashboardError message={tables.error} onRetry={() => void tables.reload()} />
      )}

      {tables.isLoading && !tables.tables.length ? (
        <DashboardLoading label="Masa planı yükleniyor…" />
      ) : tables.tables.length === 0 ? (
        <TablesEmptyState />
      ) : tables.filteredTables.length === 0 ? (
        <TablesEmptyState />
      ) : (
        <FloorPlanGrid
          tables={tables.filteredTables}
          salon={tables.activeSalon}
          onOpen={tables.openTable}
        />
      )}

      <RealtimeStatus
        status={tables.realtimeStatus}
        tables="restaurant_tables, reservations, orders"
      />

      <TableDetailDrawer
        open={Boolean(tables.selectedId)}
        item={tables.selected}
        onClose={tables.closeTable}
      />
    </div>
  );
}
