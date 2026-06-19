-- Launch security hardening (idempotent, additive only).
-- Destructive DDL intentionally omitted; service_role bypass unchanged.
--
-- Lead/event intake: auto-intake & analytics use service_role (not direct anon REST).
-- Admin CRM: authenticated admin JWT + policies below.

-- ---------------------------------------------------------------------------
-- Admin helpers (reuse if already present via CREATE OR REPLACE)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND COALESCE(p.is_banned, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_admin_or_moderator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'moderator')
      AND COALESCE(p.is_banned, false) = false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_admin_or_moderator() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_admin_or_moderator() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. profiles — RLS + self access + admin read + role escalation guard
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
        AND policyname = 'Users can view own profile'
    ) THEN
      CREATE POLICY "Users can view own profile"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
        AND policyname = 'Admins can view profiles'
    ) THEN
      CREATE POLICY "Admins can view profiles"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (public.is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
        AND policyname = 'Users can insert their own profile'
    ) THEN
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

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
        AND policyname = 'Users can update own profile'
    ) THEN
      CREATE POLICY "Users can update own profile"
        ON public.profiles
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (
          auth.uid() = id
          AND role = (SELECT p.role FROM public.profiles AS p WHERE p.id = auth.uid())
          AND COALESCE(is_banned, false) = COALESCE(
            (SELECT p.is_banned FROM public.profiles AS p WHERE p.id = auth.uid()),
            false
          )
        );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles'
        AND policyname = 'Launch deny anon profiles direct access'
    ) THEN
      CREATE POLICY "Launch deny anon profiles direct access"
        ON public.profiles
        FOR ALL
        TO anon
        USING (false)
        WITH CHECK (false);
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_profile_insert_safe_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.role, 'user') <> 'user' THEN
    NEW.role := 'user';
  END IF;
  NEW.is_banned := COALESCE(NEW.is_banned, false);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_minimum_admin_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'admin' AND (NEW.role IS DISTINCT FROM 'admin' OR COALESCE(NEW.is_banned, false) = true) THEN
      SELECT count(*)::integer INTO admin_count
      FROM public.profiles
      WHERE role = 'admin'
        AND COALESCE(is_banned, false) = false
        AND id <> OLD.id;

      IF admin_count < 1 THEN
        RAISE EXCEPTION 'At least one active admin account must remain';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_profile_insert_safe_defaults'
    ) THEN
      CREATE TRIGGER trg_enforce_profile_insert_safe_defaults
        BEFORE INSERT ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.enforce_profile_insert_safe_defaults();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_minimum_admin'
    ) THEN
      CREATE TRIGGER trg_enforce_minimum_admin
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.enforce_minimum_admin_count();
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. auto_leads — no public SELECT (PII); admin read/update; intake via service_role
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'auto_leads'
  ) THEN
    ALTER TABLE public.auto_leads ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'auto_leads'
        AND policyname = 'Deny direct auto_leads access'
    ) THEN
      CREATE POLICY "Deny direct auto_leads access"
        ON public.auto_leads
        FOR ALL
        TO anon, authenticated
        USING (false)
        WITH CHECK (false);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'auto_leads'
        AND policyname = 'Admins read auto_leads'
    ) THEN
      CREATE POLICY "Admins read auto_leads"
        ON public.auto_leads
        FOR SELECT
        TO authenticated
        USING (public.is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'auto_leads'
        AND policyname = 'Admins update auto_leads'
    ) THEN
      CREATE POLICY "Admins update auto_leads"
        ON public.auto_leads
        FOR UPDATE
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. auto_events — no public SELECT; admin read; insert via service_role
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'auto_events'
  ) THEN
    ALTER TABLE public.auto_events ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'auto_events'
        AND policyname = 'Deny direct auto_events access'
    ) THEN
      CREATE POLICY "Deny direct auto_events access"
        ON public.auto_events
        FOR ALL
        TO anon, authenticated
        USING (false)
        WITH CHECK (false);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'auto_events'
        AND policyname = 'Admins read auto_events'
    ) THEN
      CREATE POLICY "Admins read auto_events"
        ON public.auto_events
        FOR SELECT
        TO authenticated
        USING (public.is_admin());
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. site_settings — public allowlist read; admin read/write; anon write denied
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_settings'
      AND policyname = 'Launch public read allowlisted site_settings'
  ) THEN
    CREATE POLICY "Launch public read allowlisted site_settings"
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_settings'
      AND policyname = 'Launch admins read all site_settings'
  ) THEN
    CREATE POLICY "Launch admins read all site_settings"
      ON public.site_settings
      FOR SELECT
      TO authenticated
      USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_settings'
      AND policyname = 'Launch admins write site_settings'
  ) THEN
    CREATE POLICY "Launch admins write site_settings"
      ON public.site_settings
      FOR INSERT, UPDATE, DELETE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_settings'
      AND policyname = 'Launch deny client write site_settings'
  ) THEN
    CREATE POLICY "Launch deny client write site_settings"
      ON public.site_settings
      FOR INSERT, UPDATE, DELETE
      TO anon
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. listings — public active read; owner write; admin full access
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'listings'
  ) THEN
    ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'listings'
        AND policyname = 'Listings are viewable by everyone'
    ) THEN
      CREATE POLICY "Listings are viewable by everyone"
        ON public.listings
        FOR SELECT
        TO anon, authenticated
        USING (status = 'active' OR auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'listings'
        AND policyname = 'Authenticated users can create listings'
    ) THEN
      CREATE POLICY "Authenticated users can create listings"
        ON public.listings
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'listings'
        AND policyname = 'Users can update own listings'
    ) THEN
      CREATE POLICY "Users can update own listings"
        ON public.listings
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'listings'
        AND policyname = 'Users can delete own listings'
    ) THEN
      CREATE POLICY "Users can delete own listings"
        ON public.listings
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'listings'
        AND policyname = 'Launch admins read all listings'
    ) THEN
      CREATE POLICY "Launch admins read all listings"
        ON public.listings
        FOR SELECT
        TO authenticated
        USING (public.is_admin());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'listings'
        AND policyname = 'Launch admins manage all listings'
    ) THEN
      CREATE POLICY "Launch admins manage all listings"
        ON public.listings
        FOR UPDATE, DELETE
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- analytics_funnel_daily — revoke client access (non-destructive grant change)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'analytics_funnel_daily'
  ) THEN
    REVOKE ALL ON public.analytics_funnel_daily FROM authenticated;
    REVOKE ALL ON public.analytics_funnel_daily FROM anon;
    GRANT SELECT ON public.analytics_funnel_daily TO service_role;
  END IF;
END $$;
