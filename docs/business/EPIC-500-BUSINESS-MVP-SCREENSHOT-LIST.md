# EPIC-500 — Business MVP Screenshot Listesi

Manuel QA / ürün incelemesi için ekran görüntüsü listesi.

| # | Sayfa | URL | Beklenen |
|---|-------|-----|----------|
| 1 | Dashboard (desktop) | `/business/` | Sidebar + Topbar + Günlük Özet + 4 KPI + Aktiviteler + AI Önerileri + Hızlı İşlemler |
| 2 | Dashboard (mobile) | `/business/` | Hamburger menü, stacked KPI, açılır sidebar |
| 3 | Analizler | `/business/analizler/` | Empty state (“Henüz analiz yok”) |
| 4 | Raporlar | `/business/raporlar/` | Empty state (“Henüz rapor yok”) |
| 5 | Yapay Zekâ Danışmanı | `/business/danisman/` | Empty state (placeholder danışman) |
| 6 | Bildirimler | `/business/bildirimler/` | Empty state (“Bildirim bulunmuyor”) |
| 7 | Ayarlar | `/business/ayarlar/` | Empty state (ayar iskeleti) |
| 8 | Dark mode prep | `/business/` + `data-business-theme="dark"` | Token’ların koyu yüzeye geçmesi |

Notlar:

- Auth / tenant / API yok; Dashboard mock veri kullanır.
- Mevcut İSTEBUL AI / GarsonAI yüzeyleri etkilenmez.
