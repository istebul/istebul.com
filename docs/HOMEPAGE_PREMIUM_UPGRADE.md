# Ana Sayfa Premium Yükseltme (2026-05-25)

## Kritik düzeltme
- **CSS route surface hatası giderildi:** `#home` ve marketing bölümleri yanlışlıkla `display:none` alıyordu; yalnızca `home-tco-lens` gizli kaldı.
- `showHomeSections()` artık `display: block !important` ile inline CSS’i geçersiz kılar.

## Faz özeti

| Faz | Sonuç |
|-----|--------|
| 1 Link denetimi | `scripts/audit-homepage-links.cjs` + `data-home-anchor` scroll; `#switch-to-register` → button |
| 2 Hero | Yeni başlık/alt metin; CTA → `/karar-asistani` + `/auto/` |
| 3 IA | Hero → Problem → Nasıl çalışır → Kullanım alanları → AI motor → Fark → Örnek → Güven → Planlar → Partner → SSS → Final CTA |
| 4 Trust | Pilot metrikler; metodoloji; trust layer mount korundu |
| 5 AI fark | `home-ai-diff` grid (skor, TCO, risk, karşılaştırma, gerekçe) |
| 6 Örnek | Risk satırı + profil; CTA “Analizi dene” |
| 7 Conversion | İki ana funnel CTA; sticky → karar asistanı |
| 8 Görsel | `css/ai-decision-platform-home.css` genişletildi |
| 9 Routing | Router + marketing-shell anchor; `register-btn` nav |
| 10 Audit | npm test zincirine eklendi |
| 11 Test | `npm test` PASS |

## Test edilen rotalar
`/`, `/karar-asistani`, `/auto/`, `/metodoloji`, `/karsilastir/`, `/planlar`, `/#how-it-works`, `/#sample-preview`, `/#pricing`
