# isteBul — Karar Rehberleri (Güncel İçerik) Playbook

**Amaç:** Ekrandaki “Haberler” kartı hissini **karar rehberi** olarak kullanmak — trafik, güven ve Auto/kategori dönüşümü.

**Teknik:** `posts` tablosu · `category-guides-ui.js` · admin Blog/Haberler · `/blog?kategori=auto`

---

## 1) Konumlandırma

| Kullanın | Kullanmayın |
|----------|-------------|
| “Güncel rehberler”, “Karar rehberi” | “Son dakika”, “Flaş haber” |
| TCO / bütçe / süreç odaklı başlık | Clickbait, garanti tasarruf |
| Kaynak: Resmi Gazete, BDDK, TÜİK | Başka sitelerden tam metin kopyası |
| Her yazıda `/auto/` veya dikey CTA | Sadece dış link |

---

## 2) UI yerleşimi

| Yüzey | Bileşen |
|-------|---------|
| Ana sayfa | Kategori sekmeli hub (`#home-guides-hub`) |
| `/auto/` | Sadece `auto` kategorisi widget |
| `/blog` | `?kategori=` filtresi |

---

## 3) Auto pilot — ilk 10 başlık

Seed: `supabase/migrations/20260621_posts_guides_category.sql` + `data/content/auto-guide-seed-headlines.json`

1. 2026 trafik cezaları TCO'yu nasıl etkiler? *(öne çıkan)*
2. Plakanın kaybolması veya çalınması — 2026 rehberi
3. Ehliyet yenileme rehberi 2026 — maliyet ve süre
4. İkinci el araç alırken ekspertiz ne kadar kritik?
5. 2026 taşıt kredisi faizleri — aylık yük tablosu
6. 2026 MTV: segment bazında yıllık maliyet karşılaştırması
7. Elektrikli araç TCO Türkiye 2026 — gerçekçi senaryo
8. Kasko primini düşüren 5 karar faktörü
9. Sıfır km mi ikinci el mi? 2026 karar çerçevesi
10. Araç satışında değer kaybını öngörmek

**Yayın:** Migration taslak (`is_published = false`) ekler. Admin → Blog/Haberler → içeriği gözden geçir → “Yayınla”.

---

## 4) Haftalık editoryal ritim

| Gün | İş |
|-----|-----|
| Pazartesi | 1 Auto rehberi (mevcut taslaktan veya yeni) |
| Çarşamba | 1 finans/sigorta kısa rehber |
| Cuma | Konut veya tatil (dikey açıldıkça) |

Her yazı şablonu:

1. **Bağlam** (2 paragraf — ne değişti?)
2. **Karar etkisi** (TCO / aylık yük / risk)
3. **Kaynak** (`source_label` + isteğe bağlı `source_url`)
4. **CTA** — “Ücretsiz analiz başlat”

---

## 5) Supabase alanları

| Alan | Açıklama |
|------|----------|
| `category` | `auto` · `konut` · `tatil` · `finans` · `sigorta` |
| `excerpt` | Liste / kart özeti (max ~160 karakter) |
| `cover_image_url` | Hero görseli |
| `is_featured` | Kategori hub’da büyük kart |
| `source_label` | “Kaynak: …” satırı |
| `source_url` | Opsiyonel dış link |

Deploy: `supabase db push`

---

## 6) KPI

- Rehber → Auto tıklama oranı
- Organik oturum `/blog/*`
- Ortalama süre + bounce (Analytics)
- Yayınlanan yazı / hafta (operasyon)
