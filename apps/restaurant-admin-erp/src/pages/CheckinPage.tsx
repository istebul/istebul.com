import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckinDetailDrawer } from '@/components/checkin/CheckinDetailDrawer';
import { CheckinEmptyState } from '@/components/checkin/CheckinEmptyState';
import { CheckinKpiBar } from '@/components/checkin/CheckinKpiBar';
import { CheckinReservationList } from '@/components/checkin/CheckinReservationList';
import { WaitlistPanel } from '@/components/checkin/WaitlistPanel';
import { WalkInDialog } from '@/components/checkin/WalkInDialog';
import { DashboardError } from '@/components/dashboard/DashboardError';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/contexts/TenantContext';
import { useCheckinPage } from '@/hooks/useCheckinPage';

export function CheckinPage() {
  const { restaurantId, tenant, isLoading: tenantLoading, error: tenantError, reloadTenants } =
    useTenant();
  const checkin = useCheckinPage(restaurantId);
  const [walkInOpen, setWalkInOpen] = useState(false);

  const salons = useMemo(
    () => [...new Set(checkin.tables.map((table) => table.salon).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'tr'),
    ),
    [checkin.tables],
  );

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
            <Badge variant="secondary">P7-H Check-in Engine</Badge>
            {checkin.isLoading && <Badge variant="outline">Güncelleniyor</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Customer Journey / Check-in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.name} · <span className="font-mono text-xs">{restaurantId}</span>
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Rezervasyon → masa → ön sipariş → check-in operasyon merkezi. Walk-in, kuyruk, no-show
            ve geç gelen yönetimi.
          </p>
        </div>
        <Button onClick={() => setWalkInOpen(true)}>Walk-in ekle</Button>
      </motion.div>

      <CheckinKpiBar kpis={checkin.kpis} />

      {checkin.error && !checkin.reservations.length && !checkin.waitlist.length ? (
        <DashboardError message={checkin.error} onRetry={() => void checkin.reload()} />
      ) : null}

      {checkin.isLoading && !checkin.reservations.length && !checkin.waitlist.length ? (
        <DashboardLoading label="Check-in verisi yükleniyor…" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
          <div className="space-y-4">
            {checkin.reservations.length === 0 ? (
              <CheckinEmptyState />
            ) : (
              <CheckinReservationList
                items={checkin.reservations}
                onOpen={checkin.openReservation}
              />
            )}
          </div>
          <WaitlistPanel
            items={checkin.waitlist}
            tables={checkin.tables}
            busy={checkin.isMutating}
            onSeat={checkin.seatWaitlist}
            onCancel={checkin.cancelWaitlist}
          />
        </div>
      )}

      <RealtimeStatus
        status={checkin.realtimeStatus}
        tables="erp-checkin · reservations + waitlist + reservation_tables"
      />

      <CheckinDetailDrawer
        open={Boolean(checkin.selectedId)}
        item={checkin.selected}
        tables={checkin.tables}
        busy={checkin.isMutating}
        actionError={checkin.actionError}
        onClose={checkin.closeReservation}
        onCheckIn={checkin.checkIn}
        onMarkLate={checkin.markLate}
        onMarkNoShow={checkin.markNoShow}
        onAssignTable={checkin.assignTable}
      />

      <WalkInDialog
        open={walkInOpen}
        salons={salons}
        busy={checkin.isMutating}
        onClose={() => setWalkInOpen(false)}
        onSubmit={checkin.createWalkIn}
      />
    </div>
  );
}
