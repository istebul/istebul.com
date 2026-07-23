# components

Platform Shell’e ait yeniden kullanılabilir **ortak** bileşen iskeleti.

## Durum

| Alan | Durum |
|------|--------|
| Bileşen klasör iskeleti | Hazır (PR-003) |
| PlatformHero | Çalışan bileşen (PR-004) — ekrana bağlı değil |
| PlatformÜrünKartı | Çalışan bileşen (PR-005) — ekrana bağlı değil |
| PlatformÜrünIzgarası | Çalışan bileşen (PR-550) — ekrana bağlı değil |
| Diğer bileşenler | İskelet (README) |
| Runtime / HTML import | **Yok** — dışarıdan import edilmemeli |

## Bileşen klasörleri

| Klasör | Görev | Durum |
|--------|--------|--------|
| `PlatformHero/` | Platform Landing kahraman alanı | Çalışan (PR-004) |
| `PlatformÜrünKartı/` | Tek ürün tanıtım kartı | Çalışan (PR-005) |
| `PlatformÜrünIzgarası/` | Ürün kartları ızgarası | Çalışan (PR-550) |
| `PlatformÜrünKartları/` | → `PlatformÜrünKartı` yönlendirme notu | Miras |
| `PlatformÜstBilgi/` | Platform üst bilgi / gezinme | İskelet |
| `PlatformAltBilgi/` | Platform alt bilgi | İskelet |

Giriş yüzeyi: `index.ts` → Hero + ÜrünKartı + ÜrünIzgarası (henüz hiçbir yerden import edilmemeli).

## Kurallar

- GarsonAI (`.gai-*`), Business veya İSTEBUL AI home bileşenleri buraya taşınmaz.
- Ortak UI ürün iş mantığı taşımaz.
- Yeni UI framework eklenmez.
- Kullanıcıya görünen metinler Türkçe olacaktır.
