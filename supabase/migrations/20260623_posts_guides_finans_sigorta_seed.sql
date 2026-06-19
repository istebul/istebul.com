-- Finansman + Sigorta karar rehberi taslakları (idempotent).

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
      '2026 konut ve taşıt kredi limitleri — özet tablo',
      '2026-kredi-limitleri-konut-tasit',
      E'BDDK çerçevesi ve banka uygulamaları limit ve vade kararınızı etkiler.\n\nBu rehber bilgilendirme amaçlıdır; bağlayıcı teklif değildir.\n\n→ Finansman karar asistanında limit ve taksit senaryosu oluşturun.',
      'BDDK çerçevesi ve banka uygulamalarında limit mantığı — bilgilendirme amaçlı, teklif değildir.',
      'finans',
      '/assets/images/og-image.svg',
      true,
      'BDDK / TCMB özeti'
    ),
    (
      'Leasing vs kredi — taşıt finansmanı 2026 karar çerçevesi',
      'leasing-vs-kredi-tasit-2026',
      E'Leasing ve kredi aynı aracı farklı nakit akışı profilleriyle finanse eder.\n\n→ Auto TCO ile aylık yükü yan yana kıyaslayın.',
      'Aylık yük, mülkiyet ve erken çıkış maliyeti — aynı araç için iki senaryo.',
      'finans',
      '/assets/images/og-image.svg',
      false,
      'isteBul Finansman'
    ),
    (
      'Faiz oranı değişince aylık taksit nasıl hesaplanır?',
      'faiz-degisimi-aylik-taksit',
      E'Sabit ve değişken faiz senaryoları aylık taksiti doğrudan değiştirir.\n\n→ Konut ve taşıt için aynı hesap mantığını simülasyonda kullanın.',
      'Sabit ve değişken faiz senaryolarında nakit akışı — konut ve taşıt için ortak mantık.',
      'finans',
      '/assets/images/og-image.svg',
      false,
      'isteBul metodoloji'
    ),
    (
      'Erken kapama ve yapılandırma — gizli maliyetler',
      'erken-kapama-yapilandirma-maliyet',
      E'Kapama cezası ve vade uzatma toplam finansman maliyetini artırabilir.\n\n→ Erken kapama öncesi ceza kalemini teklifte ayrı sorun.',
      'Kapama cezası ve vade uzatma kalemleri toplam finansman maliyetini nasıl etkiler.',
      'finans',
      '/assets/images/og-image.svg',
      false,
      'Bankacılık mevzuatı özeti'
    ),
    (
      'Kredi notu ve onay süreci — gerçekçi beklenti',
      'kredi-notu-onay-sureci',
      E'Skor, gelir belgesi ve kefil süreci onay süresini belirler.\n\n→ Başvuru öncesi kontrol listesi ile reddedilme riskini azaltın.',
      'Skor, gelir belgesi ve kefil — başvuru öncesi kontrol listesi.',
      'finans',
      '/assets/images/og-image.svg',
      false,
      'Kredi kayıt bürosu özeti'
    ),
    (
      '2026 kasko prim trendleri — TCO payı',
      '2026-kasko-prim-trendleri',
      E'Segment ve hasar geçmişi prim bandını belirler.\n\n→ Auto TCO tablosunda sigorta kalemini ayrı izleyin.',
      'Segment, hasar geçmişi ve park profilinin prim bandına etkisi — bilgilendirme amaçlı.',
      'sigorta',
      '/assets/images/auto-hero.jpg',
      true,
      'Sektör özeti'
    ),
    (
      'DASK ve konut poliçesi — karar çerçevesi 2026',
      'dask-konut-policesi-karar',
      E'Zorunlu DASK ile ihtiyari konut teminatı farklı riskleri kapsar.\n\n→ Konut TCO içinde sigorta satırını planlayın.',
      'Zorunlu DASK ile ihtiyari konut teminatı — konut TCO içinde sigorta kalemi.',
      'sigorta',
      '/assets/images/demo/kadikoy-daire.svg',
      false,
      'Sigorta ve Reasürans'
    ),
    (
      'Trafik sigortası zorunluluğu ve TCO payı',
      'trafik-sigortasi-tco-payi',
      E'Yıllık trafik poliçesi araç sahipliği bütçesinin sabit kalemlerindendir.\n\n→ 36 ay TCO projeksiyonuna trafik sigortasını ekleyin.',
      'Yıllık trafik poliçesi maliyetinin araç sahipliği bütçesindeki yeri.',
      'sigorta',
      '/assets/images/auto-hero.jpg',
      false,
      'Resmi düzenleme özeti'
    ),
    (
      'Tamamlayıcı sağlık ve araç sigortası birlikte planlanmalı mı?',
      'tamamlayici-saglik-arac-sigortasi',
      E'Aile bütçesinde çift poliçe yükü önceliklendirme gerektirir.\n\n→ Aylık toplam prim tavanı belirleyin.',
      'Aile bütçesinde çift poliçe yükü — önceliklendirme matrisi.',
      'sigorta',
      '/assets/images/og-image.svg',
      false,
      'isteBul Sigorta'
    ),
    (
      'Hasarsızlık indirimi nasıl korunur?',
      'hasarsizlik-indirimi-koruma',
      E'Kısmi hasar ve mini onarım kararları uzun vadeli primi etkiler.\n\n→ Hasar öncesi prim artış senaryosunu hesaplayın.',
      'Kısmi hasar, mini onarım ve prim artışı — uzun vadeli TCO etkisi.',
      'sigorta',
      '/assets/images/auto-hero.jpg',
      false,
      'isteBul metodoloji'
    )
) AS v(title, slug, content, excerpt, category, cover_image_url, is_featured, source_label)
ON CONFLICT (slug) DO NOTHING;
