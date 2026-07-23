# PlatformÜrünIzgarası

Platform ürün kartlarını düzenli bir ızgara olarak sunan **üretim kalitesinde** bileşen.

## Durum (PR-550)

| Alan | Durum |
|------|--------|
| DOM üreticisi | `PlatformUrunIzgarasi.ts` — `createPlatformUrunIzgarasiElement` |
| Stil | `platform-urun-izgarasi.css` |
| Örnek kullanım | [`ÖRNEK_KULLANIM.md`](./ÖRNEK_KULLANIM.md) |
| HTML / route / home bağlantısı | **Yok** |

## Sorumluluk

- `PlatformProduct[]` listesini kabul etmek
- Her ürün için `createPlatformUrunKartiElement` çağırmak
- Responsive 1 / 2 / 3 sütun düzeni
- Yükleme ve boş durum görünümü
- Kendi iş kuralı / yönlendirme taşımamak

## Görünüm durumları

| Durum | Tetikleyici | Çıktı |
|-------|-------------|--------|
| `ready` | `loading !== true` ve `products.length > 0` | Kart ızgarası |
| `loading` | `loading === true` | Skeleton + “Ürünler yükleniyor.” |
| `empty` | Liste boş ve yükleme yok | Boş durum metni |

## Platform Kimliği

`products` alanı PR-002 `PlatformProduct` modeli ile birebir uyumludur.  
Varsayılan olarak `order` artan sıralanır (`sortByOrder`).

## PlatformÜrünKartı

Her liste öğesi `../PlatformÜrünKartı` bileşenini kullanır; CTA yönlendirmesi kartta kapalıdır.

## Kurallar

- Mevcut home `#home-vertical-focus` ızgarasının yerine geçmez.
- İSTEBUL AI karar dikeyleri buraya eklenmez.
- `src/platform` dışından henüz import edilmemelidir.
