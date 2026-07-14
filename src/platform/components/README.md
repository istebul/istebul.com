# components

Platform Shell’e ait yeniden kullanılabilir **ortak** bileşen iskeleti.

## Durum

| Alan | Durum |
|------|--------|
| Bileşen klasör iskeleti | Hazır (PR-003) |
| Çalışan UI kodu | **Yok** |
| Runtime / HTML import | **Yok** — `index.ts` bilinçli olarak boş dışa aktarım |

## Bileşen klasörleri

| Klasör | Gelecekteki görev |
|--------|------------------|
| `PlatformHero/` | Platform Landing kahraman alanı |
| `PlatformÜstBilgi/` | Platform üst bilgi / gezinme |
| `PlatformAltBilgi/` | Platform alt bilgi |
| `PlatformÜrünKartları/` | Tek ürün tanıtım kartı |
| `PlatformÜrünIzgarası/` | Ürün kartları düzeni |

Giriş yüzeyi: `index.ts` (henüz hiçbir yerden import edilmemeli).

## Kurallar

- GarsonAI (`.gai-*`), Business veya İSTEBUL AI home bileşenleri buraya taşınmaz.
- Ortak UI ürün iş mantığı taşımaz.
- Yeni UI framework eklenmez.
- Kullanıcıya görünen metinler Türkçe olacaktır.
