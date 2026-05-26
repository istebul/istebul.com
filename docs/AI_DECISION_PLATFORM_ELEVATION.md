# AI Karar Platformu — Yükseltme Denetimi (2026-05-25)

## Değiştirilen dosyalar

| Dosya | Değişiklik özeti |
|-------|------------------|
| `index.html` | Hero/CTA, pilot metrikler, yeni bölümler, trust sırası, sahte metrik kaldırma, CTA birleştirme |
| `auto/index.html` | Auto landing hero hizalama |
| `css/ai-decision-platform-home.css` | Yeni — homepage premium blok stilleri |
| `css/style.css` | Yeni CSS import |
| `css/auto.css` | Karar insight + trust grid stilleri |
| `js/core/brand-voice.js` | Hero, lead, pilot trust metrikleri, CTA metinleri |
| `js/core/router.js` | Homepage section sırası |
| `js/runtime/route-surface.js` | Marketing surface sırası |
| `js/runtime/brand-consistency.js` | Tüm primary CTA’lara tutarlı etiket |
| `js/features/moat/decision-insight-panels.js` | Yeni — deterministik AI perception blokları |
| `js/auto/auto-app.js` | Sonuç kartlarına insight + trust; yumuşak üyelik kapısı |
| `js/app.js` | Homepage trust layer mount |
| `js/features/monetization/plans.js` | Fiyatlandırma gerekçesi ve plan açıklamaları |
| `scripts/smoke-test.cjs`, `p4-*-audit.cjs`, `live-deploy-smoke.cjs` | CTA metin beklentileri |
| `scripts/lib/inject-premium-prerender.cjs` | Prerender CTA |
| `tests/unit/router.test.mjs` | Yeni homepage section stub’ları |
| `tests/unit/decision-insight-panels.test.mjs` | Yeni — insight panel unit testleri |

## UX / copy iyileştirmeleri

1. **Positioning:** Hero “yapay zeka ile gerçek maliyeti görün”; tek primary CTA **Ücretsiz analiz başlat**, secondary **Metodolojiyi gör**.
2. **Automotive-first:** Dikey odak bandı; konut/tatil/finans “yakında”; aktif ürün Auto.
3. **Homepage akışı:** Hero → Problem → AI motor → TCO merceği → Örnek kart → Güven & metodoloji → Planlar → Partner → Footer (`#how-it-works` ana sayfada gizli, hash ile erişilebilir).
4. **Pricing:** “Yanlış seçim pahalı” çerçevesi; ücretsiz / Pro / Enterprise değer önerileri.
5. **Conversion:** Pilot notu “üyelik zorunlu değil”; CTA hiyerarşisi sadeleştirildi.

## Kaldırılan placeholder / sahte metrikler

- `12.400+ kullanıcı`, `3.100+ analiz`, `50+ partner` vb. kaldırıldı.
- Yerine: **Pilot aşama**, **İzmir odaklı partner ağı**, **Erken erişim**, **Altyapı hazır** (canlı veri entegrasyonu).

## AI perception blokları (deterministik)

Auto sonuç kartlarında `buildDecisionInsightPanels` / `renderDecisionInsightPanels`:

- Neden bu öneri?
- Riskler
- Alternatif senaryo
- Bütçe baskısı
- Güven seviyesi
- Bu araç kimler için uygun değil?

`renderTrustLayerCompact`: skor metodolojisi, AI skoru değiştirmez, KVKK, şeffaf TCO, partner şeffaflığı, finansal tavsiye değildir.

## Test / build

```
npm test   → PASS
npm run build → PASS (dist/ 322 files)
```

## Önerilen commit mesajı

```
Elevate AI decision platform positioning
```

## Korunan yapılar (dokunulmadı)

Supabase, admin panel, Auto akışı, Stripe/checkout, partner webhook, CSP/headers/env, service worker, rotalar: `/`, `/auto`, `/admin-panel.html`, `/karar-asistani`, `/ilanlar`, `/karsilastir`, `/profil`.
