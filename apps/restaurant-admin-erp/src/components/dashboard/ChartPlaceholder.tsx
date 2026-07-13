import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChartSeriesPoint } from '@/data/mock-data';

interface RevenueChartPlaceholderProps {
  data: ChartSeriesPoint[];
  title?: string;
  description?: string;
}

export function RevenueChartPlaceholder({
  data,
  title = 'Saatlik Ciro',
  description = 'Mock veri — gerçek API bağlantısı henüz yok',
}: RevenueChartPlaceholderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => [`₺${value.toLocaleString('tr-TR')}`, 'Ciro']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fill="url(#revenueFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface CategoryChartPlaceholderProps {
  data: { name: string; value: number }[];
  title?: string;
  description?: string;
}

export function CategoryChartPlaceholder({
  data,
  title = 'Kategori Dağılımı',
  description = 'Mock veri — placeholder grafik',
}: CategoryChartPlaceholderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => [`%${value}`, 'Pay']}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
