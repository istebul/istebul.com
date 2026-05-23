-- Production security hardening: lock down sensitive tables via RLS.
-- Service role (edge functions) bypasses RLS; anon/authenticated clients cannot read leads directly.

ALTER TABLE IF EXISTS public.auto_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auto_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auto_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Deny direct client access to operational tables (no permissive policies).
DROP POLICY IF EXISTS "Deny direct auto_leads access" ON public.auto_leads;
CREATE POLICY "Deny direct auto_leads access"
  ON public.auto_leads
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct auto_events access" ON public.auto_events;
CREATE POLICY "Deny direct auto_events access"
  ON public.auto_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct auto_rate_limits access" ON public.auto_rate_limits;
CREATE POLICY "Deny direct auto_rate_limits access"
  ON public.auto_rate_limits
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny direct stripe_webhook_events access" ON public.stripe_webhook_events;
CREATE POLICY "Deny direct stripe_webhook_events access"
  ON public.stripe_webhook_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Subscriptions: users may read their own row only.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users read own subscription" ON public.subscriptions;
    CREATE POLICY "Users read own subscription"
      ON public.subscriptions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Profiles: prevent self-service role / ban escalation via API.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
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

-- Storage: restrict uploads to user's own folder.
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
