# components

Platform Shell’e ait yeniden kullanılabilir **ortak** bileşen iskeleti.

## Gelecek adaylar (henüz yok)

| Aday | Türkçe UI karşılığı | Not |
|------|---------------------|-----|
| Platform gezinmesi | Gezinme / Üst menü | Ürün panellerine gömülmez |
| Platform alt bilgisi | Alt bilgi | İnce legal + ürün linkleri |
| Ürün kartı | Ürün kartı | Yalnızca yönlendirme; iş kuralı yok |
| Ortak banner | Duyuru bandı | Platform geneli |
| Ortak duyurular | Duyurular | Ürün içi duyuru motoru değil |
| Ortak bildirimler | Bildirimler | İleride opsiyonel altyapı |

## Kurallar

- Bu klasörde **çalışan bileşen kodu yoktur** (PR-001).
- GarsonAI (`.gai-*`), Business veya İSTEBUL AI home bileşenleri buraya taşınmaz.
- Ortak UI, ürün iş mantığı taşımaz.
- Yeni UI framework eklenmez; bağlanacağı zaman platform / marka diline uyulur.
