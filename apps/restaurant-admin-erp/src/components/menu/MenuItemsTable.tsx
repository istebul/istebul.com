import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { MenuItemRow } from '@/data/menu-api';
import { formatDateTimeTr } from '@/lib/format-datetime';

interface MenuItemsTableProps {
  items: MenuItemRow[];
  onOpen: (itemId: string) => void;
}

export function MenuItemsTable({ items, onOpen }: MenuItemsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ürün Listesi</CardTitle>
        <CardDescription>menu_items tablosundan restaurant_id filtreli canlı veri</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 pr-4 font-medium">İsim</th>
              <th className="pb-3 pr-4 font-medium">Fiyat</th>
              <th className="pb-3 pr-4 font-medium">Kategori</th>
              <th className="pb-3 pr-4 font-medium">Durum</th>
              <th className="pb-3 pr-4 font-medium">Son güncelleme</th>
              <th className="pb-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/60 last:border-0">
                <td className="py-3 pr-4 font-medium">{item.name}</td>
                <td className="py-3 pr-4">{item.priceLabel}</td>
                <td className="py-3 pr-4">{item.categoryName}</td>
                <td className="py-3 pr-4">
                  <Badge variant={item.active ? 'success' : 'secondary'}>
                    {item.active ? 'Aktif' : 'Pasif'}
                  </Badge>
                </td>
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
