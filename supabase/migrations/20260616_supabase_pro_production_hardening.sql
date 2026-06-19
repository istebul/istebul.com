-- Supabase Pro production hardening (idempotent, non-breaking).
-- site_settings RLS, vertical_leads write lockdown, listings admin read, profiles guard.

-- ---------------------------------------------------------------------------
-- site_settings (bootstrap if missing + RLS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read allowlisted site_settings" ON public.site_settings;
CREATE POLICY "Public read allowlisted site_settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (
    key IN (
      'public_campaigns',
      'auto_whatsapp_phone',
      'maintenance',
      'site-name',
      'site-subtitle',
      'hero-eyebrow',
      'hero-title',
      'hero-desc',
      'title',
      'description',
      'phone',
      'email',
      'address',
      'instagram',
      'twitter',
      'facebook',
      'linkedin',
      'youtube',
      'tiktok',
      'home_category_auto_enabled',
      'home_category_konut_enabled',
      'home_category_tatil_enabled',
      'home_category_finans_enabled',
      'home_category_sigorta_enabled',
      'home_category_kasko_enabled',
      'vacation_enabled',
      'vacation_ai_enabled',
      'vacation_partner_cta_enabled',
      'vacation_default_budget_note',
      'vacation_disclaimer_text'
    )
  );

DROP POLICY IF EXISTS "Admins read all site_settings" ON public.site_settings;
CREATE POLICY "Admins read all site_settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'moderator')
        AND COALESCE(p.is_banned, false) = false
    )
  );

DROP POLICY IF EXISTS "Deny client write site_settings" ON public.site_settings;
CREATE POLICY "Deny client write site_settings"
  ON public.site_settings
  FOR INSERT, UPDATE, DELETE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- vertical_leads: remove permissive anon UPDATE (writes via edge functions)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "vertical_leads anon update own session" ON public.vertical_leads;
DROP POLICY IF EXISTS "vertical_leads deny client update" ON public.vertical_leads;
CREATE POLICY "vertical_leads deny client update"
  ON public.vertical_leads
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- listings: admin CRM read for draft/non-active rows
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listings'
  ) THEN
    ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins read all listings" ON public.listings;
    EXECUTE $policy$
      CREATE POLICY "Admins read all listings"
        ON public.listings
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'moderator')
              AND COALESCE(p.is_banned, false) = false
          )
        )
    $policy$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- profiles: ensure RLS + block self-insert with elevated role
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    CREATE POLICY "Users can insert their own profile"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = id
        AND COALESCE(role, 'user') = 'user'
        AND COALESCE(is_banned, false) = false
      );
  END IF;
END $$;

-- Revoke broad table grants if they exist (defense in depth)
REVOKE ALL ON public.site_settings FROM PUBLIC;
GRANT SELECT ON public.site_settings TO anon, authenticated;
