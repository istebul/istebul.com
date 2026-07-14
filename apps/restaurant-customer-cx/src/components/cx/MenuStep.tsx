import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CxEmpty } from '@/components/cx/CxStates';
import type { CxMenuCategory, CxMenuItem } from '@/data/cx-api';
import { cn } from '@/lib/utils';

interface MenuStepProps {
  categories: CxMenuCategory[];
  items: CxMenuItem[];
  favorites: string[];
  onFavorite: (id: string) => void;
  onAdd: (item: CxMenuItem) => void;
  onContinue: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function MenuStep({
  categories,
  items,
  favorites,
  onFavorite,
  onAdd,
  onContinue,
  onBack,
  onSkip,
}: MenuStepProps) {
  const groups =
    categories.length > 0
      ? categories.map((category) => ({
          id: category.id,
          name: category.name,
          items: items.filter((item) => item.categoryId === category.id),
        }))
      : [
          {
            id: 'all',
            name: 'Menü',
            items,
          },
        ];

  const visibleGroups = groups.filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dijital Menü</CardTitle>
          <CardDescription>Kategori · ürün · fiyat · favori hazırlığı</CardDescription>
        </CardHeader>
      </Card>

      {visibleGroups.length === 0 ? (
        <CxEmpty title="Menü boş" description="Aktif menü ürünü bulunamadı." />
      ) : (
        visibleGroups.map((group) => (
          <section key={group.id} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.name}
            </h2>
            <div className="grid gap-3">
              {group.items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex gap-3 p-3">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-secondary to-accent text-xs text-muted-foreground">
                      Görsel
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {item.description || 'Açıklama yakında'}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Favorilere ekle"
                          onClick={() => onFavorite(item.id)}
                          className="rounded-full p-1"
                        >
                          <Heart
                            className={cn(
                              'h-4 w-4',
                              favorites.includes(item.id)
                                ? 'fill-primary text-primary'
                                : 'text-muted-foreground',
                            )}
                          />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold">{item.priceLabel}</span>
                        <Button size="sm" onClick={() => onAdd(item)}>
                          Sepete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Geri
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onSkip}>
          Menüsüz devam
        </Button>
        <Button className="flex-1" onClick={onContinue}>
          Ön sipariş
        </Button>
      </div>
    </div>
  );
}
