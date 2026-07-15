# PlatformÜrünIzgarası — Örnek kullanım

> Bu belge yalnızca geliştirici referansıdır.  
> PR-550’de hiçbir sayfa bu örneği uygulamaz.

## Stiller

```html
<link rel="stylesheet" href="/path/to/platform-urun-karti.css">
<link rel="stylesheet" href="/path/to/platform-urun-izgarasi.css">
```

*(Kart stili ızgara içinde kartlar için gereklidir; üretim yolu ayrı PR.)*

## Katalogdan hazır ızgara

```ts
import { listVisiblePlatformProducts } from '../../constants/platform-products';
import { createPlatformUrunIzgarasiElement } from './PlatformUrunIzgarasi';

const grid = createPlatformUrunIzgarasiElement({
  products: listVisiblePlatformProducts(),
  columns: 3,
  ctaLabel: 'İncele'
});
// mount?.append(grid);  // henüz yapılmaz
```

## Yükleme durumu

```ts
createPlatformUrunIzgarasiElement({
  products: [],
  loading: true,
  columns: 3,
  loadingPlaceholderCount: 3
});
```

## Boş durum

```ts
createPlatformUrunIzgarasiElement({
  products: [],
  emptyTitle: 'Henüz ürün bulunmuyor',
  emptyDescription: 'Platform ürünleri yakında bu listede görünecek.'
});
```

## Sütun üst sınırları

| `columns` | Davranış |
|-----------|----------|
| `1` | Her kırılımda tek sütun |
| `2` | ≥640px iki sütun |
| `3` | ≥640px iki, ≥1024px üç sütun |

## Erişilebilirlik

- Kök: `section` + `aria-label` veya `labelledBy`
- Hazır liste: `ul` / `li` (`role="list"` / `listitem`)
- Yükleme: `aria-busy="true"` + gizli durum metni
- Boş: `role="status"`
