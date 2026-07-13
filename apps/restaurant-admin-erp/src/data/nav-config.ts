/** ERP navigation config — Dashboard → Orders → Reservations → Menu → Inventory (P7-F). */

export const ERP_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { id: 'orders', label: 'Orders', href: '/orders', icon: 'ShoppingBag' },
  { id: 'reservations', label: 'Reservations', href: '/reservations', icon: 'CalendarDays' },
  { id: 'menu', label: 'Menu', href: '/menu', icon: 'UtensilsCrossed' },
  { id: 'inventory', label: 'Inventory', href: '/inventory', icon: 'Package' },
  { id: 'staff', label: 'Personel', href: '#', icon: 'Users', disabled: true },
  { id: 'finance', label: 'Finans', href: '#', icon: 'Wallet', disabled: true },
  { id: 'reports', label: 'Raporlar', href: '#', icon: 'BarChart3', disabled: true },
  { id: 'settings', label: 'Ayarlar', href: '#', icon: 'Settings', disabled: true },
] as const;
