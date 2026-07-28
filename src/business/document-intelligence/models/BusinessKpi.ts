export interface BusinessKpi {
  id: string;
  label: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}
