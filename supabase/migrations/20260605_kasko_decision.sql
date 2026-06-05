-- Kasko decision funnel — events + leads

CREATE TABLE IF NOT EXISTS public.kasko_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kasko_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  full_name text,
  email text,
  phone text,
  interest_type text,
  decision_score int,
  ai_summary text,
  profile_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_option text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kasko_events_created_at_idx ON public.kasko_events (created_at DESC);
CREATE INDEX IF NOT EXISTS kasko_events_session_idx ON public.kasko_events (session_id);
CREATE INDEX IF NOT EXISTS kasko_leads_created_at_idx ON public.kasko_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS kasko_leads_status_idx ON public.kasko_leads (status);

CREATE OR REPLACE FUNCTION public.set_kasko_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kasko_leads_updated_at ON public.kasko_leads;
CREATE TRIGGER trg_kasko_leads_updated_at
  BEFORE UPDATE ON public.kasko_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_kasko_updated_at();

ALTER TABLE public.kasko_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kasko_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kasko_events anon insert" ON public.kasko_events;
CREATE POLICY "kasko_events anon insert" ON public.kasko_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "kasko_events deny client read" ON public.kasko_events;
CREATE POLICY "kasko_events deny client read" ON public.kasko_events
  FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "kasko_leads anon insert" ON public.kasko_leads;
CREATE POLICY "kasko_leads anon insert" ON public.kasko_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "kasko_leads deny client read" ON public.kasko_leads;
CREATE POLICY "kasko_leads deny client read" ON public.kasko_leads
  FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "Admins full kasko_events" ON public.kasko_events;
CREATE POLICY "Admins full kasko_events" ON public.kasko_events
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins full kasko_leads" ON public.kasko_leads;
CREATE POLICY "Admins full kasko_leads" ON public.kasko_leads
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
