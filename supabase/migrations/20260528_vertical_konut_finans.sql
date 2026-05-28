-- Konut & Finans vertical events/leads (additive, safe)
CREATE TABLE IF NOT EXISTS public.vertical_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL CHECK (vertical IN ('konut', 'finans')),
  session_id text NOT NULL DEFAULT 'anonymous',
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vertical_events_vertical_created_idx
  ON public.vertical_events (vertical, created_at DESC);

CREATE INDEX IF NOT EXISTS vertical_events_session_idx
  ON public.vertical_events (session_id);

CREATE TABLE IF NOT EXISTS public.vertical_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL CHECK (vertical IN ('konut', 'finans')),
  session_id text NOT NULL DEFAULT 'anonymous',
  full_name text,
  email text,
  phone text,
  profile_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  selected_option text,
  decision_score smallint CHECK (decision_score IS NULL OR (decision_score >= 0 AND decision_score <= 100)),
  result_summary text,
  ai_summary text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vertical_leads_vertical_created_idx
  ON public.vertical_leads (vertical, created_at DESC);

CREATE INDEX IF NOT EXISTS vertical_leads_status_idx
  ON public.vertical_leads (status);

ALTER TABLE public.vertical_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vertical_events anon insert" ON public.vertical_events;
CREATE POLICY "vertical_events anon insert"
  ON public.vertical_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "vertical_events deny client read" ON public.vertical_events;
CREATE POLICY "vertical_events deny client read"
  ON public.vertical_events FOR SELECT TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Admins read vertical_events" ON public.vertical_events;
CREATE POLICY "Admins read vertical_events"
  ON public.vertical_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "vertical_leads anon insert" ON public.vertical_leads;
CREATE POLICY "vertical_leads anon insert"
  ON public.vertical_leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "vertical_leads anon update own session" ON public.vertical_leads;
CREATE POLICY "vertical_leads anon update own session"
  ON public.vertical_leads FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "vertical_leads deny client read" ON public.vertical_leads;
CREATE POLICY "vertical_leads deny client read"
  ON public.vertical_leads FOR SELECT TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Admins read vertical_leads" ON public.vertical_leads;
CREATE POLICY "Admins read vertical_leads"
  ON public.vertical_leads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins update vertical_leads" ON public.vertical_leads;
CREATE POLICY "Admins update vertical_leads"
  ON public.vertical_leads FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
