# components

Platform Shell’e ait yeniden kullanılabilir **ortak** bileşen iskeleti.

## Durum

| Alan | Durum |
|------|--------|
| Bileşen klasör iskeleti | Hazır (PR-003) |
| PlatformHero | Çalışan bileşen (PR-004) — ekrana bağlı değil |
| PlatformÜrünKartı | Çalışan bileşen (PR-005) — ekrana bağlı değil |
| Diğer bileşenler | İskelet (README) |
| Runtime / HTML import | **Yok** — dışarıdan import edilmemeli |

## Bileşen klasörleri

| Klasör | Görev | Durum |
|--------|--------|--------|
| `PlatformHero/` | Platform Landing kahraman alanı | Çalışan (PR-004) |
| `PlatformÜrünKartı/` | Tek ürün tanıtım kartı | Çalışan (PR-005) |
| `PlatformÜrünKartları/` | → `PlatformÜrünKartı` yönlendirme notu | Miras |
| `PlatformÜstBilgi/` | Platform üst bilgi / gezinme | İskelet |
| `PlatformAltBilgi/` | Platform alt bilgi | İskelet |
| `PlatformÜrünIzgarası/` | Ürün kartları düzeni | İskelet |

Giriş yüzeyi: `index.ts` → Hero + ÜrünKartı (henüz hiçbir yerden import edilmemeli).

## Kurallar

- GarsonAI (`.gai-*`), Business veya İSTEBUL AI home bileşenleri buraya taşınmaz.
- Ortak UI ürün iş mantığı taşımaz.
- Yeni UI framework eklenmez.
- Kullanıcıya görünen metinler Türkçe olacaktır.
