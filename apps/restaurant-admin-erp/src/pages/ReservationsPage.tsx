import { motion } from 'framer-motion';
import { DashboardError } from '@/components/dashboard/DashboardError';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus';
import { ReservationDetailDrawer } from '@/components/reservations/ReservationDetailDrawer';
import { ReservationsEmptyState } from '@/components/reservations/ReservationsEmptyState';
import { ReservationsFilters } from '@/components/reservations/ReservationsFilters';
import { ReservationsKpiBar } from '@/components/reservations/ReservationsKpiBar';
import { ReservationsTable } from '@/components/reservations/ReservationsTable';
import { ReservationsTimeline } from '@/components/reservations/ReservationsTimeline';
import { TablePlanningPlaceholder } from '@/components/reservations/TablePlanningPlaceholder';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/TenantContext';
import { useReservationsPage } from '@/hooks/useReservationsPage';

export function ReservationsPage() {
  const { restaurantId, tenant, isLoading: tenantLoading, error: tenantError, reloadTenants } =
    useTenant();
  const reservations = useReservationsPage(restaurantId);

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
            <Badge variant="secondary">P7-F Rezervasyon</Badge>
            {reservations.isLoading && <Badge variant="outline">Güncelleniyor</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Rezervasyon Yönetimi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.name} · <span className="font-mono text-xs">{restaurantId}</span>
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Misafir rezervasyonu, masa seçimi, provizyon ve ön sipariş altyapısı — GarsonAI ana
            ürün akışının ERP yüzeyi.
          </p>
        </div>
      </motion.div>

      <ReservationsKpiBar kpis={reservations.kpis} />

      <ReservationsFilters
        datePreset={reservations.datePreset}
        status={reservations.status}
        salon={reservations.salon}
        tableId={reservations.tableId}
        guestCount={reservations.guestCount}
        search={reservations.search}
        salons={reservations.salons}
        tables={reservations.tables}
        onDatePresetChange={reservations.setDatePreset}
        onStatusChange={reservations.setStatus}
        onSalonChange={reservations.setSalon}
        onTableIdChange={reservations.setTableId}
        onGuestCountChange={reservations.setGuestCount}
        onSearchChange={reservations.setSearch}
      />

      {reservations.error && !reservations.rows.length && (
        <DashboardError message={reservations.error} onRetry={() => void reservations.reload()} />
      )}

      {reservations.isLoading && !reservations.rows.length ? (
        <DashboardLoading label="Rezervasyonlar yükleniyor…" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            {reservations.rows.length === 0 ? (
              <ReservationsEmptyState />
            ) : (
              <ReservationsTable
                rows={reservations.rows}
                onOpen={reservations.openReservation}
              />
            )}
            <TablePlanningPlaceholder tables={reservations.tables} />
          </div>
          <ReservationsTimeline rows={reservations.rows} />
        </div>
      )}

      <RealtimeStatus status={reservations.realtimeStatus} tables="reservations" />

      <ReservationDetailDrawer
        open={Boolean(reservations.selectedId)}
        item={reservations.selected}
        onClose={reservations.closeReservation}
      />
    </div>
  );
}
