# PlatformHero — Örnek kullanım

> Bu belge yalnızca geliştirici referansıdır.  
> PR-004’te hiçbir sayfa bu örneği uygulamaz; HTML / route / build bağlanmaz.

## 1. Stil

```html
<link rel="stylesheet" href="/path/to/src/platform/components/PlatformHero/platform-hero.css">
```

*(Üretim yolu ve bundle ayrı PR’da tanımlanır.)*

## 2. Varsayılan içerik

```ts
import { createPlatformHeroElement } from './PlatformHero';

const hero = createPlatformHeroElement();
// document.querySelector('#mount')?.append(hero);  // henüz yapılmaz
```

## 3. Platform kimliği ile (PR-002 uyumu)

```ts
import { PLATFORM_IDENTITY } from '../../config/platform-identity';
import { createPlatformHeroElement } from './PlatformHero';

const hero = createPlatformHeroElement({
  identity: PLATFORM_IDENTITY
  // Başlık / açıklama varsayılan Platform Landing metinlerinde kalır;
  // marka adı identity.name üzerinden gelir.
});
```

## 4. Metin override

```ts
createPlatformHeroElement({
  brandName: 'İSTEBUL',
  title: 'Yapay zekâ destekli dijital platform',
  description:
    'İSTEBUL; bireyler ve işletmeler için geliştirilen yapay zekâ destekli dijital ürünleri tek çatı altında sunar.',
  ctaLabel: 'Ürünleri keşfet'
});
```

## 5. CTA notu

CTA bir `button` öğesidir; `click` üzerinde gezinme yoktur.  
Gelecekte Platform Landing, ürün ızgarasına kaydırma veya ürün kaydı URL’leri bağlanabilir.
