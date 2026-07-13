/** ERP navigation config — no mock dashboard data. */

export const ERP_NAV_ITEMS = [
  { id: 'dashboard', label: 'Özet', href: '/garson/erp/', icon: 'LayoutDashboard' },
  { id: 'orders', label: 'Siparişler', href: '#', icon: 'ShoppingBag', disabled: true },
  { id: 'inventory', label: 'Stok', href: '#', icon: 'Package', disabled: true },
  { id: 'staff', label: 'Personel', href: '#', icon: 'Users', disabled: true },
  { id: 'finance', label: 'Finans', href: '#', icon: 'Wallet', disabled: true },
  { id: 'reports', label: 'Raporlar', href: '#', icon: 'BarChart3', disabled: true },
  { id: 'settings', label: 'Ayarlar', href: '#', icon: 'Settings', disabled: true },
] as const;
