-- Karar rehberleri: posts tablosu genişletmesi + Auto pilot seed (idempotent).

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  slug text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false
);

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'auto';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS excerpt text NOT NULL DEFAULT '';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS source_label text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS source_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_slug_key'
  ) THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_category_check'
  ) THEN
    ALTER TABLE public.posts ADD CONSTRAINT posts_category_check
      CHECK (category IN ('auto', 'konut', 'tatil', 'finans', 'sigorta'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS posts_category_published_idx
  ON public.posts (category, is_published, is_featured DESC, created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published posts" ON public.posts;
CREATE POLICY "Public read published posts"
  ON public.posts
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "Admins manage posts" ON public.posts;
CREATE POLICY "Admins manage posts"
  ON public.posts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.posts TO anon, authenticated;

-- Auto pilot rehberleri (taslak — admin panelden yayınlanır)
INSERT INTO public.posts (
  title, slug, content, excerpt, category, cover_image_url,
  is_published, is_featured, source_label
)
SELECT
  v.title,
  v.slug,
  v.content,
  v.excerpt,
  'auto',
  v.cover_image_url,
  false,
  v.is_featured,
  v.source_label
FROM (
  VALUES
    (
      '2026 trafik cezaları TCO''yu nasıl etkiler?',
      '2026-trafik-cezalari-tco-etkisi',
      E'2026 yılı trafik ceza tarifeleri, yıllık MTV ile birlikte toplam sahip olma maliyetinin (TCO) önemli bir parçasını oluşturur.\n\nBu rehber bilgilendirme amaçlıdır; resmi tutarlar Resmi Gazete ve ilgili kurum duyurularından doğrulanmalıdır.\n\n→ Sonraki adım: bütçenize göre Auto analizi ile 36 ay TCO projeksiyonu alın.',
      'Ceza ve MTV kalemlerinin 36 aylık toplam sahip olma maliyetine yansıması — varsayımlarla örnek tablo.',
      '/assets/images/auto-hero.jpg',
      true,
      'Resmi Gazete / Ulaştırma'
    ),
    (
      'Plakanın kaybolması veya çalınması — 2026 rehberi',
      'plaka-kaybi-calinti-2026-rehber',
      E'Plaka kaybı veya çalınması durumunda yenileme süreci, geçici plaka ve sigorta bildirimi adımlarını planlamak gizli maliyetleri azaltır.\n\n→ Auto analizinde sigorta ve kullanım profilinizi birlikte değerlendirin.',
      'Yenileme süreci, maliyet ve sigorta bildirimi; araç kullanımına devam ederken dikkat edilecekler.',
      '/assets/images/auto-hero.jpg',
      false,
      'Nüfus ve Vatandaşlık'
    ),
    (
      'Ehliyet yenileme rehberi 2026 — maliyet ve süre',
      'ehliyet-yenileme-2026-maliyet',
      E'Randevu, sağlık raporu ve harç kalemleri ehliyet yenilemede toplam maliyeti belirler.\n\n→ Filo veya bireysel kullanım senaryonuz için Auto TCO''ya bakım ve vergi kalemlerini ekleyin.',
      'Randevu, harç ve sağlık raporu adımları; filo ve bireysel sürücü için kontrol listesi.',
      '/assets/images/auto-hero.jpg',
      false,
      'e-Devlet'
    ),
    (
      'İkinci el araç alırken ekspertiz ne kadar kritik?',
      'ikinci-el-arac-alirken-ekspertiz',
      E'Gizli hasar ve mekanik risk, yeniden satış değerini ve sigorta primini doğrudan etkiler.\n\n→ isteBul skor katmanında ekspertiz sonucu manuel doğrulama önerilir.',
      'Gizli hasar riskinin TCO ve yeniden satış değerine etkisi — skor katmanında nasıl kullanılır.',
      '/assets/images/auto-hero.jpg',
      false,
      'isteBul metodoloji'
    ),
    (
      '2026 taşıt kredisi faizleri — aylık yük tablosu',
      'tasit-kredisi-faizleri-2026',
      E'Peşinat ve vade senaryolarında aylık ödeme simülasyonu bilgilendirme amaçlıdır; banka teklifi değildir.\n\n→ Auto akışında finansman etkisini TCO ile birlikte görün.',
      'Peşinat ve vade senaryolarında aylık ödeme simülasyonu; bilgilendirme amaçlı, teklif değildir.',
      '/assets/images/auto-hero.jpg',
      false,
      'BDDK / piyasa özeti'
    ),
    (
      '2026 MTV: segment bazında yıllık maliyet karşılaştırması',
      'mtv-2026-segment-karsilastirma',
      E'Binek, SUV ve hibrit gruplarında MTV farkı yıllık bütçeyi değiştirir.\n\n→ Segment seçiminde 3 yıllık TCO projeksiyonu alın.',
      'Binek, SUV ve hibrit gruplarında vergi farkı — bütçe planına nasıl yansır.',
      '/assets/images/auto-hero.jpg',
      false,
      'Gelir İdaresi'
    ),
    (
      'Elektrikli araç TCO Türkiye 2026 — gerçekçi senaryo',
      'elektrikli-arac-tco-turkiye',
      E'Şarj maliyeti, batarya amortismanı ve teşvik varsayımları benzinli alternatifle kıyaslanmalıdır.\n\n→ Auto''da yakıt/enerji profilinizi girerek senaryo oluşturun.',
      'Şarj, batarya amortismanı ve teşvik varsayımları; benzinli alternatifle kıyas çerçevesi.',
      '/assets/images/auto-hero.jpg',
      false,
      'isteBul Auto'
    ),
    (
      'Kasko primini düşüren 5 karar faktörü',
      'kasko-primini-dusuren-faktorler',
      E'Hasarsızlık, park ortamı ve kullanım tipi prim bandını etkiler.\n\n→ Sigorta kalemini TCO tablosunda ayrı görün.',
      'Hasarsızlık, park profili ve kullanım tipi — sigorta kaleminin TCO payını nasıl azaltır.',
      '/assets/images/auto-hero.jpg',
      false,
      'Sigorta sektör özeti'
    ),
    (
      'Sıfır km mi ikinci el mi? 2026 karar çerçevesi',
      'sifir-km-vs-ikinci-el-2026',
      E'Değer kaybı, garanti ve finansman koşulları aynı bütçede farklı TCO üretir.\n\n→ İki senaryoyu Auto karşılaştırma matrisinde yan yana koyun.',
      'Değer kaybı, garanti ve finansman farkı — aynı bütçede iki senaryo tablosu.',
      '/assets/images/auto-hero.jpg',
      false,
      'isteBul Auto'
    ),
    (
      'Araç satışında değer kaybını öngörmek',
      'arac-satisinda-deger-kaybi',
      E'Kilometre, model yılı ve segment likiditesi 3 yıl sonraki elden çıkarma maliyetini belirler.\n\n→ Likidite skorunu Auto sonuç panelinde inceleyin.',
      'Segment, kilometre ve model yılı — 3 yıl sonra elden çıkarma maliyetini planlama.',
      '/assets/images/auto-hero.jpg',
      false,
      'TÜİK / piyasa'
    )
) AS v(title, slug, content, excerpt, cover_image_url, is_featured, source_label)
ON CONFLICT (slug) DO NOTHING;
