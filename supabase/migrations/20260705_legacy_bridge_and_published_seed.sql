-- isteBul — legacy listings bridge + published decision options seed
-- Idempotent: safe to re-run on deploy.

-- ---------------------------------------------------------------------------
-- 1) Bridge active legacy `listings` rows → ai_listings (draft, QA required)
-- ---------------------------------------------------------------------------
DO $migrate_legacy$
BEGIN
  IF to_regclass('public.listings') IS NULL THEN
    RAISE NOTICE 'listings table not found — skipping legacy bridge';
    RETURN;
  END IF;

  INSERT INTO public.ai_listings (
    category,
    title,
    description,
    location,
    price,
    currency,
    images,
    attributes,
    status,
    source_type,
    source_url,
    owner_user_id,
    created_at,
    updated_at
  )
  SELECT
    CASE COALESCE(l.category, 'general')
      WHEN 'arac' THEN 'vehicle'
      WHEN 'ev' THEN 'housing'
      WHEN 'konut' THEN 'housing'
      WHEN 'tatil' THEN 'vacation'
      ELSE 'general'
    END,
    l.title,
    l.description,
    CASE
      WHEN l.location IS NOT NULL AND btrim(l.location) <> '' THEN jsonb_build_object('label', l.location)
      ELSE NULL
    END,
    l.price,
    COALESCE(l.currency, 'TRY'),
    COALESCE(to_jsonb(l.images), '[]'::jsonb),
    COALESCE(l.metadata, '{}'::jsonb)
      || jsonb_build_object('legacy_listing_id', l.id::text, 'legacy_status', l.status::text),
    'draft',
    'legacy_listings_bridge',
    l.external_url,
    CASE
      WHEN l.user_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = l.user_id) THEN l.user_id
      ELSE NULL
    END,
    COALESCE(l.created_at, now()),
    COALESCE(l.updated_at, now())
  FROM public.listings l
  WHERE COALESCE(l.status::text, '') IN ('active', 'pending')
    AND NOT EXISTS (
      SELECT 1
      FROM public.ai_listings a
      WHERE a.attributes->>'legacy_listing_id' = l.id::text
    );

  UPDATE public.listings
  SET status = 'archived', updated_at = now()
  WHERE COALESCE(status::text, '') IN ('active', 'pending');
END $migrate_legacy$;

-- ---------------------------------------------------------------------------
-- 2) Published manual_seed catalog (only when no published seed exists yet)
-- ---------------------------------------------------------------------------
DO $seed_published$
DECLARE
  v_listing_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.ai_listings
    WHERE source_type = 'manual_seed' AND status = 'published'
    LIMIT 1
  ) THEN
    RAISE NOTICE 'published manual_seed already present — skipping seed';
    RETURN;
  END IF;

  -- Vehicle 1
  IF NOT EXISTS (SELECT 1 FROM public.ai_listings WHERE attributes->>'seed_key' = 'vehicle-1') THEN
    INSERT INTO public.ai_listings (
      category, title, description, location, price, currency, images, attributes,
      status, source_type
    ) VALUES (
      'vehicle',
      '2022 Toyota Corolla 1.6 Dream',
      'Tek elden, yetkili servis bakımlı. Şehir içi ekonomik kullanım.',
      '{"label":"İstanbul, Kadıköy"}'::jsonb,
      1050000, 'TRY', '[]'::jsonb,
      '{"seed_key":"vehicle-1","brand":"Toyota","model":"Corolla","year":2022,"mileage":42000}'::jsonb,
      'published', 'manual_seed'
    )
    RETURNING id INTO v_listing_id;

    IF v_listing_id IS NOT NULL THEN
      INSERT INTO public.ai_listing_analyses (
        listing_id, ai_score, risk_score, market_score, price_score, confidence,
        summary, pros, cons, tags, analysis_version
      ) VALUES (
        v_listing_id, 82, 22, 78, 75, 0.88,
        'Bütçe-dostu segmentte düşük risk profili; bakım geçmişi güçlü sinyal.',
        '["Düşük km","Servis bakımlı","Hibrit alternatife göre erişilebilir"]'::jsonb,
        '["Şehir trafiğinde vergi yükü"]'::jsonb,
        '["vehicle","economy"]'::jsonb,
        'v1-seed-published'
      );
    END IF;
  END IF;

  -- Vehicle 2
  IF NOT EXISTS (SELECT 1 FROM public.ai_listings WHERE attributes->>'seed_key' = 'vehicle-2') THEN
    INSERT INTO public.ai_listings (
      category, title, description, location, price, currency, images, attributes,
      status, source_type
    ) VALUES (
      'vehicle',
      '2020 Volkswagen Passat 1.6 TDI',
      'Uzun yol için ideal, düzenli bakım kayıtlı.',
      '{"label":"Ankara, Çankaya"}'::jsonb,
      1280000, 'TRY', '[]'::jsonb,
      '{"seed_key":"vehicle-2","brand":"Volkswagen","model":"Passat","year":2020,"mileage":98000}'::jsonb,
      'published', 'manual_seed'
    )
    RETURNING id INTO v_listing_id;

    IF v_listing_id IS NOT NULL THEN
      INSERT INTO public.ai_listing_analyses (
        listing_id, ai_score, risk_score, market_score, price_score, confidence,
        summary, pros, cons, tags, analysis_version
      ) VALUES (
        v_listing_id, 79, 28, 74, 72, 0.86,
        'Uzun yol kullanımına uygun; dizel TCO avantajı potansiyeli.',
        '["Uzun yol konforu","Düzenli bakım"]'::jsonb,
        '["Dizel regülasyon riski"]'::jsonb,
        '["vehicle","diesel"]'::jsonb,
        'v1-seed-published'
      );
    END IF;
  END IF;

  -- Vehicle 3
  IF NOT EXISTS (SELECT 1 FROM public.ai_listings WHERE attributes->>'seed_key' = 'vehicle-3') THEN
    INSERT INTO public.ai_listings (
      category, title, description, location, price, currency, images, attributes,
      status, source_type
    ) VALUES (
      'vehicle',
      '2018 Renault Clio 1.0 TCe Touch',
      'Düşük yakıt tüketimi, şehir içi pratik hatchback.',
      '{"label":"İzmir, Bornova"}'::jsonb,
      620000, 'TRY', '[]'::jsonb,
      '{"seed_key":"vehicle-3","brand":"Renault","model":"Clio","year":2018,"mileage":118000}'::jsonb,
      'published', 'manual_seed'
    )
    RETURNING id INTO v_listing_id;

    IF v_listing_id IS NOT NULL THEN
      INSERT INTO public.ai_listing_analyses (
        listing_id, ai_score, risk_score, market_score, price_score, confidence,
        summary, pros, cons, tags, analysis_version
      ) VALUES (
        v_listing_id, 76, 32, 70, 80, 0.84,
        'Giriş segmentinde erişilebilir fiyat; şehir içi kullanım için uygun.',
        '["Düşük fiyat","Pratik boyut"]'::jsonb,
        '["Yüksek km"]'::jsonb,
        '["vehicle","city"]'::jsonb,
        'v1-seed-published'
      );
    END IF;
  END IF;

  -- Housing 1
  IF NOT EXISTS (SELECT 1 FROM public.ai_listings WHERE attributes->>'seed_key' = 'housing-1') THEN
    INSERT INTO public.ai_listings (
      category, title, description, location, price, currency, images, attributes,
      status, source_type
    ) VALUES (
      'housing',
      'Kadıköy Moda 3+1 Satılık Daire',
      'Deniz manzaralı, asansörlü binada, metro yürüme mesafesinde.',
      '{"label":"İstanbul, Kadıköy"}'::jsonb,
      6800000, 'TRY', '[]'::jsonb,
      '{"seed_key":"housing-1","sqm":125,"rooms":3,"building_age":12}'::jsonb,
      'published', 'manual_seed'
    )
    RETURNING id INTO v_listing_id;

    IF v_listing_id IS NOT NULL THEN
      INSERT INTO public.ai_listing_analyses (
        listing_id, ai_score, risk_score, market_score, price_score, confidence,
        summary, pros, cons, tags, analysis_version
      ) VALUES (
        v_listing_id, 81, 25, 77, 68, 0.87,
        'Lokasyon primi yüksek; ödeme yükü analizi ile birlikte değerlendirilmeli.',
        '["Merkezi konum","Ulaşım avantajı"]'::jsonb,
        '["Yüksek m² birim fiyatı"]'::jsonb,
        '["housing","istanbul"]'::jsonb,
        'v1-seed-published'
      );
    END IF;
  END IF;

  -- Housing 2
  IF NOT EXISTS (SELECT 1 FROM public.ai_listings WHERE attributes->>'seed_key' = 'housing-2') THEN
    INSERT INTO public.ai_listings (
      category, title, description, location, price, currency, images, attributes,
      status, source_type
    ) VALUES (
      'housing',
      'Çankaya Oran 2+1 Yatırım Dairesi',
      'Kiralık getirisi yüksek bölgede, site içi otopark ve güvenlik.',
      '{"label":"Ankara, Çankaya"}'::jsonb,
      3450000, 'TRY', '[]'::jsonb,
      '{"seed_key":"housing-2","sqm":95,"rooms":2,"building_age":6}'::jsonb,
      'published', 'manual_seed'
    )
    RETURNING id INTO v_listing_id;

    IF v_listing_id IS NOT NULL THEN
      INSERT INTO public.ai_listing_analyses (
        listing_id, ai_score, risk_score, market_score, price_score, confidence,
        summary, pros, cons, tags, analysis_version
      ) VALUES (
        v_listing_id, 78, 30, 75, 74, 0.85,
        'Yatırım odaklı profil; kira getirisi sinyali güçlü.',
        '["Kira potansiyeli","Site güvenliği"]'::jsonb,
        '["Likidite süresi"]'::jsonb,
        '["housing","investment"]'::jsonb,
        'v1-seed-published'
      );
    END IF;
  END IF;
END $seed_published$;
