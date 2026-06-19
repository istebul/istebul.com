-- Sigorta V2 — events + leads

CREATE TABLE IF NOT EXISTS public.sigorta_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sigorta_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  full_name text,
  email text,
  phone text,
  interest_type text,
  insurance_type text,
  decision_score int,
  protection_score int,
  coverage_score int,
  cost_efficiency_score int,
  overall_risk text,
  ai_summary text,
  profile_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_option text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sigorta_events_created_at_idx ON public.sigorta_events (created_at DESC);
CREATE INDEX IF NOT EXISTS sigorta_events_session_idx ON public.sigorta_events (session_id);
CREATE INDEX IF NOT EXISTS sigorta_leads_created_at_idx ON public.sigorta_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS sigorta_leads_status_idx ON public.sigorta_leads (status);
CREATE INDEX IF NOT EXISTS sigorta_leads_interest_idx ON public.sigorta_leads (interest_type);

CREATE OR REPLACE FUNCTION public.set_sigorta_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sigorta_leads_updated_at ON public.sigorta_leads;
CREATE TRIGGER trg_sigorta_leads_updated_at
  BEFORE UPDATE ON public.sigorta_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_sigorta_updated_at();

ALTER TABLE public.sigorta_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sigorta_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sigorta_events anon insert" ON public.sigorta_events;
CREATE POLICY "sigorta_events anon insert" ON public.sigorta_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "sigorta_events deny client read" ON public.sigorta_events;
CREATE POLICY "sigorta_events deny client read" ON public.sigorta_events
  FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "sigorta_leads anon insert" ON public.sigorta_leads;
CREATE POLICY "sigorta_leads anon insert" ON public.sigorta_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "sigorta_leads deny client read" ON public.sigorta_leads;
CREATE POLICY "sigorta_leads deny client read" ON public.sigorta_leads
  FOR SELECT TO anon USING (false);

DROP POLICY IF EXISTS "Admins full sigorta_events" ON public.sigorta_events;
CREATE POLICY "Admins full sigorta_events" ON public.sigorta_events
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins full sigorta_leads" ON public.sigorta_leads;
CREATE POLICY "Admins full sigorta_leads" ON public.sigorta_leads
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
