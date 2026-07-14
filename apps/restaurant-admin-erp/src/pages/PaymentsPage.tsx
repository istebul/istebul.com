import { motion } from 'framer-motion';
import { DashboardError } from '@/components/dashboard/DashboardError';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus';
import { PaymentDetailDrawer } from '@/components/payments/PaymentDetailDrawer';
import { PaymentsEmptyState } from '@/components/payments/PaymentsEmptyState';
import { PaymentsFilters } from '@/components/payments/PaymentsFilters';
import { PaymentsKpiBar } from '@/components/payments/PaymentsKpiBar';
import { PaymentsTransactionsTable } from '@/components/payments/PaymentsTransactionsTable';
import { ProviderArchitectureNote } from '@/components/payments/ProviderArchitectureNote';
import { ReservationGuaranteePanel } from '@/components/payments/ReservationGuaranteePanel';
import { SettlementPrepPanel } from '@/components/payments/SettlementPrepPanel';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/TenantContext';
import { usePaymentsPage } from '@/hooks/usePaymentsPage';

export function PaymentsPage() {
  const { restaurantId, tenant, isLoading: tenantLoading, error: tenantError, reloadTenants } =
    useTenant();
  const payments = usePaymentsPage(restaurantId);

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
            <Badge variant="secondary">P7-I Payment Foundation</Badge>
            {payments.isLoading && <Badge variant="outline">Güncelleniyor</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Reservation Guarantee & Payments
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.name} · <span className="font-mono text-xs">{restaurantId}</span>
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Provizyon → tahsilat → settlement altyapısı. Gerçek kart / Stripe / iyzico / PayTR
            çağrısı yok — enterprise mimari hazırlığı.
          </p>
        </div>
      </motion.div>

      <PaymentsKpiBar kpis={payments.kpis} />

      <ReservationGuaranteePanel
        policy={payments.policy}
        busy={payments.isSavingPolicy}
        onSave={payments.savePolicy}
      />

      <SettlementPrepPanel settlement={payments.settlementPrep} />

      <ProviderArchitectureNote />

      <PaymentsFilters
        filters={payments.filters}
        onDatePresetChange={payments.setDatePreset}
        onProviderChange={payments.setProvider}
        onStatusChange={payments.setStatus}
        onSearchChange={payments.setSearch}
      />

      {payments.error && !payments.rows.length ? (
        <DashboardError message={payments.error} onRetry={() => void payments.reload()} />
      ) : null}

      {payments.actionError ? (
        <DashboardError
          title="İşlem uyarısı"
          message={payments.actionError}
          onRetry={() => payments.clearActionError()}
        />
      ) : null}

      {payments.isLoading && !payments.rows.length ? (
        <DashboardLoading label="Ödeme işlemleri yükleniyor…" />
      ) : payments.rows.length === 0 ? (
        <PaymentsEmptyState />
      ) : (
        <PaymentsTransactionsTable rows={payments.rows} onOpen={payments.openTransaction} />
      )}

      <RealtimeStatus
        status={payments.realtimeStatus}
        tables="erp-payments · payment_transactions + refunds + policies + audit"
      />

      <PaymentDetailDrawer
        open={Boolean(payments.selectedId)}
        detail={payments.detail}
        isLoading={payments.detailLoading}
        error={payments.actionError && !payments.detail ? payments.actionError : null}
        onClose={payments.closeTransaction}
      />
    </div>
  );
}
