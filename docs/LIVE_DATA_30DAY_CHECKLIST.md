# Canlı veri — 30 günlük geçiş planı

**Sürüm:** v2.2.17 hedefi · **Güncelleme:** 2026-06-01  
**Amaç:** Simülasyon modundan kontrollü “canlı veri” moduna geçiş — ödeme, operasyonel veri, 1. piyasa feed, partner pilot.

---

## Özet skor hedefi

| Hafta | Odak | Hedef puan (canlı veri genel) |
|-------|------|-------------------------------|
| 1 | Ödeme + prod doğrulama | %65 → %72 |
| 2 | Operasyonel veri + izleme | %72 → %78 |
| 3 | 1. canlı feed + admin bayrak | %78 → %85 |
| 4 | Partner pilot + metrik | %85 → %88 |

---

## Hafta 1 — Ödeme ve deploy güveni (Gün 1–7)

| # | Görev | Sahip | Bitti say |
|---|--------|-------|-----------|
| 1.1 | Supabase prod: tüm migration’lar (`supabase db push`) | Ops | ☐ |
| 1.2 | Edge secrets: `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL`, `IYZICO_WEBHOOK_SECRET` | Ops | ☐ |
| 1.3 | iyzico sandbox’ta 1 test ödemesi + webhook log (`signature_valid: true`) | Eng | ☐ |
| 1.4 | PayTR fallback anahtarları (opsiyonel) + test | Ops | ☐ |
| 1.5 | `npm run go-live:verify` CI yeşil | Eng | ☐ |
| 1.6 | Admin → Ödeme: sağlayıcı durumu `configured` görünüyor | Ops | ☐ |

**Çıkış kriteri:** En az bir gerçek (sandbox) ödeme → `orders` / abonelik satırı + profil Pro durumu.

---

## Hafta 2 — Operasyonel canlı veri (Gün 8–14)

| # | Görev | Sahip | Bitti say |
|---|--------|-------|-----------|
| 2.1 | Auto + 1 dikey (sigorta veya finans) uçtan uca lead → `auto_leads` / `vertical_leads` | QA | ☐ |
| 2.2 | KVKK onayı + partner paylaşım checkbox kayıt kontrolü | Legal/QA | ☐ |
| 2.3 | Analytics: çerez kabul sonrası `analytics-ingest` event | QA | ☐ |
| 2.4 | `analytics_clean_start_at` prod’da set | Ops | ☐ |
| 2.5 | Haftalık `npm run metrics:investor` export disiplini | Founder | ☐ |
| 2.6 | CEO alert / ops digest smoke | Ops | ☐ |

**Çıkış kriteri:** 7 gün kesintisiz lead + analytics, admin panelde görünür.

---

## Hafta 3 — İlk canlı piyasa feed (Gün 15–21)

| # | Görev | Sahip | Bitti say |
|---|--------|-------|-----------|
| 3.1 | Veri partneri seç (ör. Hangikredi faiz / katalog API / exclusive CSV) | Product | ☐ |
| 3.2 | `live_finance_feed_url` admin’de kaydet (gizli — public değil) | Ops | ☐ |
| 3.3 | Edge `finance-live-rates` veya mevcut motor feed tüketimi | Eng | ☐ |
| 3.4 | Admin → **Canlı veri modu** açık (`live_providers_enabled=true`) | Ops | ☐ |
| 3.5 | UI: “Canlı sağlayıcı modu” etiketi; simülasyon uyarısı kalkar | QA | ☐ |
| 3.6 | `npm run audit:live-data` yeşil | Eng | ☐ |

**Çıkış kriteri:** Finans veya Auto’da en az 1 kalem **canlı kaynaktan** güncelleniyor; pazarlama metni buna uygun.

---

## Hafta 4 — Partner pilot ve şeffaflık (Gün 22–30)

| # | Görev | Sahip | Bitti say |
|---|--------|-------|-----------|
| 4.1 | 1 partner: webhook URL + secret + test dispatch | Partner/Ops | ☐ |
| 4.2 | Outcome geri bildirimi (`outcome-capture`) 1 kapalı döngü | Ops | ☐ |
| 4.3 | Metodoloji + pitch: `liveProvidersEnabled` durumu güncel | Founder | ☐ |
| 4.4 | Hukuk: DPA / alt işleyen imza (Supabase, CF, iyzico) | Legal | ☐ |
| 4.5 | Pen-test checklist: checkout, admin-action, webhook SSRF | Sec | ☐ |
| 4.6 | Go/No-Go: “Canlı veri platformu” iddiası için marketing onayı | Founder | ☐ |

**Çıkış kriteri:** Partner lead + (opsiyonel) canlı feed + ödeme testi — üçlü kanıt.

---

## Teknik bayraklar (kod)

| Ayar | Konum | Public okuma |
|------|--------|--------------|
| `live_providers_enabled` | `site_settings` | Evet (UI modu) |
| `live_finance_feed_url` | `site_settings` | Hayır (admin only) |

Admin: **Ayarlar → Canlı veri** bölümü.

Doğrulama:

```bash
npm run audit:live-data
node scripts/live-data-readiness-audit.cjs
```

---

## Yapılmaması gerekenler (30 gün)

- `live_providers_enabled=true` iken canlı feed yok → **yanlış iddia**
- Production’da `build:corporate` ile canlı dikey `index.html` ezme
- iyzico webhook’u `verify` bypass
- Sahte kullanıcı sayısı / duyuru metni

---

## İlgili dokümanlar

- **`docs/OPS_SUPABASE_IYZICO_RUNBOOK.md`** — migration + iyzico sandbox (adım adım)
- `docs/payments-env.md`
- `docs/BUILD_CORPORATE_STATIC.md`
- `docs/COMPLIANCE_READINESS_AUDIT.md`
- `docs/investor/INVESTOR_READINESS.md`
- `CHANGELOG.md`
