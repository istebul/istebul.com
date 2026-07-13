import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { InventoryItemRow } from '@/data/inventory-api';
import { formatDateTimeTr } from '@/lib/format-datetime';

interface InventoryItemsTableProps {
  items: InventoryItemRow[];
  onOpen: (itemId: string) => void;
}

export function InventoryItemsTable({ items, onOpen }: InventoryItemsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stok Kalemleri</CardTitle>
        <CardDescription>
          inventory_items · restaurant_id filtreli canlı listeleme
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 pr-4 font-medium">Ürün adı</th>
              <th className="pb-3 pr-4 font-medium">Kategori</th>
              <th className="pb-3 pr-4 font-medium">Mevcut stok</th>
              <th className="pb-3 pr-4 font-medium">Minimum</th>
              <th className="pb-3 pr-4 font-medium">Kritik</th>
              <th className="pb-3 pr-4 font-medium">Birim</th>
              <th className="pb-3 pr-4 font-medium">Son alış</th>
              <th className="pb-3 pr-4 font-medium">Ort. maliyet</th>
              <th className="pb-3 pr-4 font-medium">Güncelleme</th>
              <th className="pb-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/60 last:border-0">
                <td className="py-3 pr-4 font-medium">{item.name}</td>
                <td className="py-3 pr-4">{item.categoryName}</td>
                <td className="py-3 pr-4">{item.currentStock}</td>
                <td className="py-3 pr-4">{item.minStock}</td>
                <td className="py-3 pr-4">
                  <Badge variant={item.isCritical ? 'warning' : 'success'}>
                    {item.isCritical ? 'Kritik' : 'Normal'}
                  </Badge>
                </td>
                <td className="py-3 pr-4">{item.unit}</td>
                <td className="py-3 pr-4">{item.lastPurchasePriceLabel}</td>
                <td className="py-3 pr-4">{item.averageCostLabel}</td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {formatDateTimeTr(item.updatedAt)}
                </td>
                <td className="py-3">
                  <Button variant="outline" size="sm" onClick={() => onOpen(item.id)}>
                    <Eye className="h-4 w-4" />
                    Detay
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
