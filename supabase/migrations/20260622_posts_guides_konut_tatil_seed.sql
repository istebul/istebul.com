-- Konut + Tatil karar rehberi taslakları (idempotent).

INSERT INTO public.posts (
  title, slug, content, excerpt, category, cover_image_url,
  is_published, is_featured, source_label
)
SELECT
  v.title,
  v.slug,
  v.content,
  v.excerpt,
  v.category,
  v.cover_image_url,
  false,
  v.is_featured,
  v.source_label
FROM (
  VALUES
    (
      '2026 konut kredisi faizleri — aylık taksit nasıl hesaplanır?',
      '2026-konut-kredisi-aylik-taksit',
      E'Konut kredisi faiz ve vade seçimi, aylık nakit akışınızı doğrudan belirler.\n\nBu rehber bilgilendirme amaçlıdır; bağlayıcı banka teklifi değildir.\n\n→ Konut karar asistanında peşinat ve taksit senaryosu oluşturun.',
      'Peşinat, vade ve faiz senaryolarında aylık yük tablosu — bilgilendirme amaçlı, banka teklifi değildir.',
      'konut',
      '/assets/images/demo/kadikoy-daire.svg',
      true,
      'BDDK / TCMB özeti'
    ),
    (
      'Tapu harcı ve masraflar 2026 — alıcı kontrol listesi',
      'tapu-harci-masraflar-2026',
      E'Harç, danışmanlık ve taşınma kalemleri liste fiyatının üzerine eklenir.\n\n→ Toplam sahip olma maliyeti görünümü için gizli kalemleri planlayın.',
      'Harç, danışmanlık ve taşınma kalemlerinin toplam bütçeye etkisi; sürpriz maliyetleri önleme.',
      'konut',
      '/assets/images/demo/kadikoy-daire.svg',
      false,
      'Tapu ve Kadastro'
    ),
    (
      'Kira mı satın alma mı? 2026 karar çerçevesi',
      'kira-mi-satin-alma-mi-2026',
      E'Aylık kira ile mortgage yükü aynı bütçede farklı risk profilleri üretir.\n\n→ isteBul Konut skorunda nakit akışı ve ulaşım faktörlerini birlikte okuyun.',
      'Aylık kira ile mortgage yükünü aynı bütçede kıyaslama — nakit akışı ve risk.',
      'konut',
      '/assets/images/demo/kadikoy-daire.svg',
      false,
      'isteBul Konut metodoloji'
    ),
    (
      'İstanbul''da ilçe seçimi: ulaşım ve yaşam maliyeti',
      'istanbul-ilce-secimi-maliyet',
      E'Ulaşım süresi ve aidat, konut karar skorunda ağırlıklı sinyallerdir.\n\n→ İlçe/district verisi ile yaşam maliyeti bandını karşılaştırın.',
      'Ulaşım süresi, aidat ve fiyat bandı — konut karar skoruna nasıl yansır.',
      'konut',
      '/assets/images/demo/kadikoy-daire.svg',
      false,
      'TÜİK / yerel veri'
    ),
    (
      'Konut alırken gizli maliyetler (aidat, depozito, taşınma)',
      'konut-alirken-gizli-maliyetler',
      E'İlk 12 ayda aidat, depozito ve taşınma toplam maliyeti şişirebilir.\n\n→ Bütçe planında bu kalemleri ayrı satır olarak tutun.',
      'Liste fiyatı dışında ilk 12 ayda çıkan kalemler — toplam sahip olma maliyeti görünümü.',
      'konut',
      '/assets/images/demo/kadikoy-daire.svg',
      false,
      'isteBul Konut'
    ),
    (
      '2026 erken rezervasyon vs son dakika — maliyet karşılaştırması',
      'erken-rezervasyon-son-dakika-2026',
      E'Rezervasyon zamanı, konaklama ve ulaşım kalemlerinde fark yaratabilir.\n\n→ Tatil karar asistanında erken/son dakika senaryosu oluşturun.',
      'Aynı destinasyonda iki rezervasyon zamanının toplam tatil bütçesine etkisi — varsayımlı tablo.',
      'tatil',
      '/assets/images/demo/lara-resort.svg',
      true,
      'Sektör özeti'
    ),
    (
      'Yurt içi tatil bütçesi: aile için 7 günlük plan',
      'yurt-ici-tatil-butcesi-aile-7-gun',
      E'Konaklama, ulaşım ve aktivite kalemleri aile bütçesini belirler.\n\n→ Çocuklu profilde risk ve konfor skorlarını birlikte okuyun.',
      'Konaklama, ulaşım ve aktivite kalemleri — çocuklu aile için risk ve konfor dengesi.',
      'tatil',
      '/assets/images/demo/urla-villa.svg',
      false,
      'isteBul Tatil'
    ),
    (
      'Döviz kuru tatil maliyetini nasıl etkiler?',
      'doviz-kuru-tatil-maliyeti',
      E'Yurt dışı ve döviz endeksli paketlerde kur şoku bütçe tamponu gerektirir.\n\n→ Senaryoda %10 kur artışı varsayımı ekleyin.',
      'Yurt dışı ve döviz endeksli paketlerde bütçe tamponu — bilgilendirme amaçlı senaryo.',
      'tatil',
      '/assets/images/demo/lara-resort.svg',
      false,
      'TCMB'
    ),
    (
      'Çocuklu tatil destinasyonu seçimi — risk ve konfor',
      'cocuklu-tatil-destinasyon-secimi',
      E'Sezon skoru, ulaşım ve sağlık riski destinasyon seçimini etkiler.\n\n→ Tatil skor kartında aile uyumunu kontrol edin.',
      'Sezon skoru, ulaşım ve sağlık riski — tatil karar asistanında nasıl okunur.',
      'tatil',
      '/assets/images/demo/karadeniz-yayla.svg',
      false,
      'isteBul Tatil metodoloji'
    ),
    (
      'Tatil sigortası ne zaman mantıklı?',
      'tatil-sigortasi-ne-zaman',
      E'İptal, sağlık ve bagaj teminatları toplam tatil maliyetine ek yük getirir.\n\n→ Poliçe primini tatil bütçesinde ayrı kalem olarak planlayın.',
      'İptal, sağlık ve bagaj teminatları — toplam tatil maliyetine ek yük analizi.',
      'tatil',
      '/assets/images/demo/lara-resort.svg',
      false,
      'Sigorta sektör özeti'
    )
) AS v(title, slug, content, excerpt, category, cover_image_url, is_featured, source_label)
ON CONFLICT (slug) DO NOTHING;
