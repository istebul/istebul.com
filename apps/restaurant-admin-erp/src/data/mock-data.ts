import {
  Banknote,
  ShoppingBag,
  Star,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { RestaurantTenant } from '@/contexts/TenantContext';

export const MOCK_TENANTS: RestaurantTenant[] = [
  {
    restaurant_id: 'rst_ankara_meyhane',
    name: 'Ankara Meyhane',
    slug: 'ankara-meyhane',
    city: 'Ankara',
    plan: 'pro',
  },
  {
    restaurant_id: 'rst_istanbul_bistro',
    name: 'İstanbul Bistro',
    slug: 'istanbul-bistro',
    city: 'İstanbul',
    plan: 'enterprise',
  },
  {
    restaurant_id: 'rst_izmir_sahil',
    name: 'İzmir Sahil',
    slug: 'izmir-sahil',
    city: 'İzmir',
    plan: 'starter',
  },
];

export interface KpiMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  hint?: string;
}

export interface ChartSeriesPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface RealtimeEvent {
  id: string;
  type: 'order' | 'reservation' | 'kitchen' | 'payment';
  title: string;
  detail: string;
  time: string;
  status: 'active' | 'completed' | 'warning';
}

export interface DashboardMockData {
  kpis: KpiMetric[];
  revenueSeries: ChartSeriesPoint[];
  categoryBreakdown: { name: string; value: number }[];
  realtimeEvents: RealtimeEvent[];
}

const TENANT_DATA: Record<string, DashboardMockData> = {
  rst_ankara_meyhane: {
    kpis: [
      {
        id: 'revenue',
        label: 'Günlük Ciro',
        value: '₺48.250',
        change: '+12.4%',
        trend: 'up',
        icon: Banknote,
        hint: 'Dünle kıyasla',
      },
      {
        id: 'orders',
        label: 'Aktif Sipariş',
        value: '37',
        change: '+5',
        trend: 'up',
        icon: ShoppingBag,
        hint: 'Son 1 saat',
      },
      {
        id: 'tables',
        label: 'Doluluk',
        value: '%78',
        change: '-3%',
        trend: 'down',
        icon: UtensilsCrossed,
        hint: '24 masa',
      },
      {
        id: 'satisfaction',
        label: 'Memnuniyet',
        value: '4.8',
        change: '+0.2',
        trend: 'up',
        icon: Star,
        hint: 'Son 7 gün',
      },
    ],
    revenueSeries: [
      { label: '09:00', revenue: 4200, orders: 8 },
      { label: '11:00', revenue: 6800, orders: 14 },
      { label: '13:00', revenue: 12400, orders: 26 },
      { label: '15:00', revenue: 9100, orders: 18 },
      { label: '17:00', revenue: 7600, orders: 15 },
      { label: '19:00', revenue: 15200, orders: 31 },
      { label: '21:00', revenue: 11800, orders: 22 },
    ],
    categoryBreakdown: [
      { name: 'Ana Yemek', value: 42 },
      { name: 'İçecek', value: 24 },
      { name: 'Tatlı', value: 14 },
      { name: 'Meze', value: 20 },
    ],
    realtimeEvents: [
      {
        id: 'evt-1',
        type: 'order',
        title: 'Masa 12 — yeni sipariş',
        detail: '2x Adana, 1x Ayran',
        time: 'Az önce',
        status: 'active',
      },
      {
        id: 'evt-2',
        type: 'kitchen',
        title: 'Mutfak — hazır',
        detail: 'Masa 7 siparişi servise hazır',
        time: '2 dk',
        status: 'completed',
      },
      {
        id: 'evt-3',
        type: 'reservation',
        title: 'Rezervasyon onayı',
        detail: '19:30 — 4 kişi, teras',
        time: '5 dk',
        status: 'active',
      },
      {
        id: 'evt-4',
        type: 'payment',
        title: 'Ödeme alındı',
        detail: 'Masa 3 — ₺1.240',
        time: '8 dk',
        status: 'completed',
      },
    ],
  },
  rst_istanbul_bistro: {
    kpis: [
      {
        id: 'revenue',
        label: 'Günlük Ciro',
        value: '₺92.800',
        change: '+8.1%',
        trend: 'up',
        icon: Banknote,
      },
      {
        id: 'orders',
        label: 'Aktif Sipariş',
        value: '64',
        change: '+11',
        trend: 'up',
        icon: ShoppingBag,
      },
      {
        id: 'tables',
        label: 'Doluluk',
        value: '%91',
        change: '+6%',
        trend: 'up',
        icon: UtensilsCrossed,
      },
      {
        id: 'satisfaction',
        label: 'Memnuniyet',
        value: '4.6',
        change: '-0.1',
        trend: 'down',
        icon: Star,
      },
    ],
    revenueSeries: [
      { label: '09:00', revenue: 8200, orders: 12 },
      { label: '11:00', revenue: 11400, orders: 19 },
      { label: '13:00', revenue: 18600, orders: 34 },
      { label: '15:00', revenue: 14200, orders: 24 },
      { label: '17:00', revenue: 12800, orders: 21 },
      { label: '19:00', revenue: 22400, orders: 42 },
      { label: '21:00', revenue: 19800, orders: 36 },
    ],
    categoryBreakdown: [
      { name: 'Ana Yemek', value: 38 },
      { name: 'İçecek', value: 28 },
      { name: 'Tatlı', value: 18 },
      { name: 'Meze', value: 16 },
    ],
    realtimeEvents: [
      {
        id: 'evt-b1',
        type: 'order',
        title: 'Paket sipariş — #1842',
        detail: 'Teslimat hazırlanıyor',
        time: 'Az önce',
        status: 'active',
      },
      {
        id: 'evt-b2',
        type: 'kitchen',
        title: 'Mutfak gecikmesi',
        detail: 'Izgara istasyonu — 12 dk',
        time: '3 dk',
        status: 'warning',
      },
    ],
  },
  rst_izmir_sahil: {
    kpis: [
      {
        id: 'revenue',
        label: 'Günlük Ciro',
        value: '₺31.400',
        change: '+3.2%',
        trend: 'up',
        icon: Banknote,
      },
      {
        id: 'orders',
        label: 'Aktif Sipariş',
        value: '19',
        change: '0',
        trend: 'neutral',
        icon: ShoppingBag,
      },
      {
        id: 'tables',
        label: 'Doluluk',
        value: '%62',
        change: '+4%',
        trend: 'up',
        icon: UtensilsCrossed,
      },
      {
        id: 'satisfaction',
        label: 'Memnuniyet',
        value: '4.9',
        change: '+0.3',
        trend: 'up',
        icon: Star,
      },
    ],
    revenueSeries: [
      { label: '09:00', revenue: 2800, orders: 5 },
      { label: '11:00', revenue: 4200, orders: 8 },
      { label: '13:00', revenue: 7600, orders: 14 },
      { label: '15:00', revenue: 5400, orders: 10 },
      { label: '17:00', revenue: 4800, orders: 9 },
      { label: '19:00', revenue: 8200, orders: 16 },
      { label: '21:00', revenue: 6400, orders: 12 },
    ],
    categoryBreakdown: [
      { name: 'Ana Yemek', value: 35 },
      { name: 'İçecek', value: 30 },
      { name: 'Tatlı', value: 20 },
      { name: 'Meze', value: 15 },
    ],
    realtimeEvents: [
      {
        id: 'evt-i1',
        type: 'reservation',
        title: 'Walk-in — 2 kişi',
        detail: 'Deniz manzarası masa',
        time: 'Az önce',
        status: 'active',
      },
    ],
  },
};

export function getDashboardMockData(restaurantId: string): DashboardMockData {
  return TENANT_DATA[restaurantId] ?? TENANT_DATA.rst_ankara_meyhane;
}

export const ERP_NAV_ITEMS = [
  { id: 'dashboard', label: 'Özet', href: '/garson/erp/', icon: 'LayoutDashboard' },
  { id: 'orders', label: 'Siparişler', href: '#', icon: 'ShoppingBag', disabled: true },
  { id: 'inventory', label: 'Stok', href: '#', icon: 'Package', disabled: true },
  { id: 'staff', label: 'Personel', href: '#', icon: 'Users', disabled: true },
  { id: 'finance', label: 'Finans', href: '#', icon: 'Wallet', disabled: true },
  { id: 'reports', label: 'Raporlar', href: '#', icon: 'BarChart3', disabled: true },
  { id: 'settings', label: 'Ayarlar', href: '#', icon: 'Settings', disabled: true },
] as const;
