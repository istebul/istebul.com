import { motion } from 'framer-motion';
import { DashboardError } from '@/components/dashboard/DashboardError';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus';
import { InventoryEmptyState } from '@/components/inventory/InventoryEmptyState';
import { InventoryFilters } from '@/components/inventory/InventoryFilters';
import { InventoryItemDetailDrawer } from '@/components/inventory/InventoryItemDetailDrawer';
import { InventoryItemsTable } from '@/components/inventory/InventoryItemsTable';
import { InventorySummaryCards } from '@/components/inventory/InventorySummaryCards';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/TenantContext';
import { useInventoryPage } from '@/hooks/useInventoryPage';

export function InventoryPage() {
  const { restaurantId, tenant, isLoading: tenantLoading, error: tenantError, reloadTenants } =
    useTenant();
  const inventory = useInventoryPage(restaurantId);

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
            <Badge variant="secondary">P7-E Stok</Badge>
            {inventory.isLoading && <Badge variant="outline">Güncelleniyor</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Stok Yönetimi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.name} · <span className="font-mono text-xs">{restaurantId}</span>
          </p>
        </div>
      </motion.div>

      <InventorySummaryCards summary={inventory.summary} />

      <InventoryFilters
        search={inventory.search}
        categoryId={inventory.categoryId}
        criticalOnly={inventory.criticalOnly}
        categories={inventory.categories}
        onSearchChange={inventory.setSearch}
        onCategoryChange={inventory.setCategoryId}
        onCriticalOnlyChange={inventory.setCriticalOnly}
      />

      {inventory.error && !inventory.items.length && (
        <DashboardError message={inventory.error} onRetry={() => void inventory.reload()} />
      )}

      {inventory.isLoading && !inventory.items.length ? (
        <DashboardLoading label="Stok yükleniyor…" />
      ) : inventory.filteredItems.length === 0 ? (
        <InventoryEmptyState />
      ) : (
        <InventoryItemsTable items={inventory.filteredItems} onOpen={inventory.openItem} />
      )}

      <RealtimeStatus
        status={inventory.realtimeStatus}
        tables="inventory_items · inventory_categories"
      />

      <InventoryItemDetailDrawer
        open={Boolean(inventory.selectedItemId)}
        item={inventory.selectedItem}
        onClose={inventory.closeItem}
      />
    </div>
  );
}
