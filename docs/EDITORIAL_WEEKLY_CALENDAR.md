# isteBul — Haftalık içerik takvimi (8 hafta pilot)

**Makine okunur kaynak:** `data/content/editorial-weekly-calendar.json`  
**Seed başlıklar:** `data/content/*-guide-seed-headlines.json`

---

## Ritim (her hafta)

| Gün | Dikey | Not |
|-----|--------|-----|
| **Pazartesi** | Auto | TCO, süreç, mevzuat |
| **Çarşamba** | Finans veya Sigorta | Kısa, tablo odaklı |
| **Cuma** | Konut veya Tatil | Bütçe / risk |

**Hedef:** Haftada en az **2 yayınlanmış** rehber (önce Auto, sonra konut/tatil).

---

## Hafta 1 — Auto lansman

| Gün | Slug | Kategori |
|-----|------|----------|
| Pzt | `2026-trafik-cezalari-tco-etkisi` | auto |
| Çar | `tasit-kredisi-faizleri-2026` | auto |
| Cum | `sifir-km-vs-ikinci-el-2026` | auto |

---

## Hafta 2 — Auto + konut giriş

| Gün | Slug | Kategori |
|-----|------|----------|
| Pzt | `ikinci-el-arac-alirken-ekspertiz` | auto |
| Çar | *(yeni)* Konut/taşıt kredi limitleri özeti | finans |
| Cum | `2026-konut-kredisi-aylik-taksit` | konut |

---

## Hafta 3 — Konut pilot

| Gün | Slug | Kategori |
|-----|------|----------|
| Pzt | `mtv-2026-segment-karsilastirma` | auto |
| Çar | *(yeni)* Kasko prim trendleri 2026 | sigorta |
| Cum | `kira-mi-satin-alma-mi-2026` | konut |

---

## Hafta 4 — Konut + tatil

| Gün | Slug | Kategori |
|-----|------|----------|
| Pzt | `elektrikli-arac-tco-turkiye` | auto |
| Çar | `tapu-harci-masraflar-2026` | konut |
| Cum | `erken-rezervasyon-son-dakika-2026` | tatil |

---

## Hafta 5 — Tatil pilot

| Gün | Slug | Kategori |
|-----|------|----------|
| Pzt | `kasko-primini-dusuren-faktorler` | auto |
| Çar | *(yeni)* Leasing vs kredi — taşıt | finans |
| Cum | `yurt-ici-tatil-butcesi-aile-7-gun` | tatil |

---

## Hafta 6 — Çapraz dikey

| Gün | Slug | Kategori |
|-----|------|----------|
| Pzt | `plaka-kaybi-calinti-2026-rehber` | auto |
| Çar | `istanbul-ilce-secimi-maliyet` | konut |
| Cum | `cocuklu-tatil-destinasyon-secimi` | tatil |

---

## Hafta 7 — Tamamlayıcı

| Gün | Slug | Kategori |
|-----|------|----------|
| Pzt | `ehliyet-yenileme-2026-maliyet` | auto |
| Çar | `doviz-kuru-tatil-maliyeti` | tatil |
| Cum | `konut-alirken-gizli-maliyetler` | konut |

---

## Hafta 8 — Kapanış

| Gün | Slug | Kategori |
|-----|------|----------|
| Pzt | `arac-satisinda-deger-kaybi` | auto |
| Çar | *(yeni)* DASK ve konut poliçesi | sigorta |
| Cum | `tatil-sigortasi-ne-zaman` | tatil |

---

## Yazı şablonu (kopyala-yapıştır)

```text
[Bağlam — 2 paragraf: ne değişti / neden önemli]

[Karar etkisi — tablo veya madde: aylık yük, risk, TCO]

Kaynak: …

→ Sonraki adım: [dikey CTA]
```

---

## Operasyon checklist (her yayın öncesi)

- [ ] `excerpt` ≤ 160 karakter
- [ ] `cover_image_url` dolu
- [ ] `source_label` (ve gerekiyorsa `source_url`)
- [ ] Kategori doğru (`auto` / `konut` / `tatil` / `finans` / `sigorta`)
- [ ] En fazla 1 `is_featured` / kategori
- [ ] Admin → Yayınla → ana sayfa hub’da kontrol

---

## Konut seed (5 başlık)

Dosya: `data/content/konut-guide-seed-headlines.json`  
Migration: `20260622_posts_guides_konut_tatil_seed.sql`

## Tatil seed (5 başlık)

Dosya: `data/content/tatil-guide-seed-headlines.json`
