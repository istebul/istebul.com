# PlatformÜrünKartı — Örnek kullanım

> Bu belge yalnızca geliştirici referansıdır.  
> PR-005’te hiçbir sayfa bu örneği uygulamaz.

## Stil

```html
<link rel="stylesheet" href="/path/to/platform-urun-karti.css">
```

## Katalog ürününden kart

```ts
import { PLATFORM_PRODUCTS } from '../../constants/platform-products';
import { createPlatformUrunKartiElement } from './PlatformUrunKarti';

const product = PLATFORM_PRODUCTS[0];
const card = createPlatformUrunKartiElement({ product });
// mount?.append(card);  // henüz yapılmaz
```

## Tüm görünür ürünler

```ts
import { listVisiblePlatformProducts } from '../../constants/platform-products';
import { createPlatformUrunKartiElement } from './PlatformUrunKarti';

const cards = listVisiblePlatformProducts().map((product) =>
  createPlatformUrunKartiElement({ product, ctaLabel: 'İncele' })
);
```

## Durum override örneği (görsel test)

```ts
createPlatformUrunKartiElement({
  product: {
    ...PLATFORM_PRODUCTS[2],
    status: 'yakinda',
    statusLabel: 'Yakında'
  }
});
```

Desteklenen `status`: `canli` | `gelistirme` | `yakinda` | `beta` | `bakim` | `kapali`  
(`erken-erisim` görsel olarak Yakında tonuna bağlanır.)

## CTA

Buton yönlendirme yapmaz. `data-platform-product-url` ürün URL’sini taşır;
Landing cutover’ında bağlanabilir.
