# PlatformHero

Platform Landing ilk görünüm alanı (kahraman / hero) için **çalışan** ortak bileşen.

## Durum (PR-004)

| Alan | Durum |
|------|--------|
| DOM üreticisi | `PlatformHero.ts` — `createPlatformHeroElement` |
| Stil | `platform-hero.css` (scoped `.ib-platform-hero`) |
| Örnek kullanım | [`ÖRNEK_KULLANIM.md`](./ÖRNEK_KULLANIM.md) |
| HTML / route / home bağlantısı | **Yok** — hiçbir ekran import etmez |

## Sorumluluk

- Platform markasını kahraman düzeyinde göstermek
- Tek başlık + kısa destek cümlesi + CTA yer tutucusu
- İSTEBUL AI / GarsonAI / Business iş mantığı taşımamak
- Gelecekte `PLATFORM_IDENTITY` / katalog ile props üzerinden hizalanmak

## Varsayılan içerik (Türkçe)

| Alan | Metin |
|------|--------|
| Marka | İSTEBUL |
| Başlık | Yapay zekâ destekli dijital platform |
| Açıklama | İSTEBUL; bireyler ve işletmeler için geliştirilen yapay zekâ destekli dijital ürünleri tek çatı altında sunar. |
| CTA | Ürünleri keşfet *(yönlendirme yok)* |

## Tasarım

- Minimal, kurumsal, Design System v4 token uyumu
- Responsive; `prefers-reduced-motion` destekli
- Erişilebilir: `aria-labelledby`, odak halkası, anlamlı grup etiketi

## Kurallar

- Mevcut `index.html` hero’sunun yerine geçmez (ayrı cutover PR).
- `homepage.bundle` / Garson DS import edilmez.
- `src/platform` dışından henüz import edilmemelidir.
