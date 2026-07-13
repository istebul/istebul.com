/** ERP navigation config */

export const ERP_NAV_ITEMS = [
  { id: 'dashboard', label: 'Özet', href: '/', icon: 'LayoutDashboard' },
  { id: 'orders', label: 'Siparişler', href: '/orders', icon: 'ShoppingBag' },
  { id: 'menu', label: 'Menü', href: '/menu', icon: 'UtensilsCrossed' },
  { id: 'inventory', label: 'Stok', href: '/inventory', icon: 'Package' },
  { id: 'staff', label: 'Personel', href: '#', icon: 'Users', disabled: true },
  { id: 'finance', label: 'Finans', href: '#', icon: 'Wallet', disabled: true },
  { id: 'reports', label: 'Raporlar', href: '#', icon: 'BarChart3', disabled: true },
  { id: 'settings', label: 'Ayarlar', href: '#', icon: 'Settings', disabled: true },
] as const;
