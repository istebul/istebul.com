import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { DashboardError } from '@/components/dashboard/DashboardError';
import { DashboardLoading } from '@/components/dashboard/DashboardLoading';
import { RealtimeStatus } from '@/components/dashboard/RealtimeStatus';
import { MenuCategoryList } from '@/components/menu/MenuCategoryList';
import { MenuEmptyState } from '@/components/menu/MenuEmptyState';
import { MenuFilters } from '@/components/menu/MenuFilters';
import { MenuItemCreateDialog } from '@/components/menu/MenuItemCreateDialog';
import { MenuItemDetailDrawer } from '@/components/menu/MenuItemDetailDrawer';
import { MenuItemEditDialog } from '@/components/menu/MenuItemEditDialog';
import { MenuItemsTable } from '@/components/menu/MenuItemsTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenant } from '@/contexts/TenantContext';
import { useMenuPage } from '@/hooks/useMenuPage';

export function MenuPage() {
  const { restaurantId, tenant, isLoading: tenantLoading, error: tenantError, reloadTenants } =
    useTenant();
  const menu = useMenuPage(restaurantId);

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
            <Badge variant="secondary">P7-D Menü</Badge>
            {menu.isLoading && <Badge variant="outline">Güncelleniyor</Badge>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Menü Yönetimi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tenant.name} · <span className="font-mono text-xs">{restaurantId}</span>
          </p>
        </div>
        <Button onClick={menu.openCreateDialog}>
          <Plus className="h-4 w-4" />
          Yeni ürün
        </Button>
      </motion.div>

      <MenuFilters
        search={menu.search}
        activeFilter={menu.activeFilter}
        onSearchChange={menu.setSearch}
        onActiveFilterChange={menu.setActiveFilter}
      />

      {menu.error && !menu.items.length && (
        <DashboardError message={menu.error} onRetry={() => void menu.reload()} />
      )}

      {menu.isLoading && !menu.items.length ? (
        <DashboardLoading label="Menü yükleniyor…" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <MenuCategoryList
            categories={menu.categories}
            selectedCategoryId={menu.categoryId}
            onSelect={menu.setCategoryId}
          />

          <div className="space-y-4">
            {menu.filteredItems.length === 0 ? (
              <MenuEmptyState />
            ) : (
              <MenuItemsTable items={menu.filteredItems} onOpen={menu.openItem} />
            )}
          </div>
        </div>
      )}

      <RealtimeStatus status={menu.realtimeStatus} tables="menu_items · menu_categories" />

      <MenuItemDetailDrawer
        open={Boolean(menu.selectedItemId)}
        item={menu.selectedItem}
        onClose={menu.closeItem}
        onEdit={menu.openEditDialog}
      />

      <MenuItemEditDialog
        open={menu.editDialogOpen}
        item={menu.selectedItem}
        onClose={menu.closeEditDialog}
      />

      <MenuItemCreateDialog open={menu.createDialogOpen} onClose={menu.closeCreateDialog} />
    </div>
  );
}
