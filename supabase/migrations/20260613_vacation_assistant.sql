-- Tatil Karar Asistanı — Auto'dan bağımsız tablolar (events, leads, scenarios)

CREATE TABLE IF NOT EXISTS public.vacation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vacation_events_session_id_idx ON public.vacation_events (session_id);
CREATE INDEX IF NOT EXISTS vacation_events_event_type_idx ON public.vacation_events (event_type);
CREATE INDEX IF NOT EXISTS vacation_events_created_at_idx ON public.vacation_events (created_at DESC);

CREATE TABLE IF NOT EXISTS public.vacation_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  full_name text,
  email text,
  phone text,
  vacation_goal text,
  budget_range text,
  people_type text,
  vacation_type text,
  date_range text,
  duration text,
  user_note text,
  selected_option text,
  decision_score int,
  estimated_cost_range text,
  ai_summary text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  follow_up_at timestamptz,
  follow_up_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vacation_leads_session_id_idx ON public.vacation_leads (session_id);
CREATE INDEX IF NOT EXISTS vacation_leads_status_idx ON public.vacation_leads (status);
CREATE INDEX IF NOT EXISTS vacation_leads_created_at_idx ON public.vacation_leads (created_at DESC);

CREATE TABLE IF NOT EXISTS public.vacation_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vacation_scenarios_active_sort_idx
  ON public.vacation_scenarios (is_active, sort_order);

CREATE OR REPLACE FUNCTION public.set_vacation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vacation_leads_updated_at ON public.vacation_leads;
CREATE TRIGGER trg_vacation_leads_updated_at
  BEFORE UPDATE ON public.vacation_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_vacation_updated_at();

DROP TRIGGER IF EXISTS trg_vacation_scenarios_updated_at ON public.vacation_scenarios;
CREATE TRIGGER trg_vacation_scenarios_updated_at
  BEFORE UPDATE ON public.vacation_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.set_vacation_updated_at();

ALTER TABLE public.vacation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_scenarios ENABLE ROW LEVEL SECURITY;

-- vacation_events: anon insert only; admin read
DROP POLICY IF EXISTS "vacation_events anon insert" ON public.vacation_events;
CREATE POLICY "vacation_events anon insert"
  ON public.vacation_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "vacation_events deny client read" ON public.vacation_events;
CREATE POLICY "vacation_events deny client read"
  ON public.vacation_events
  FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Admins read vacation_events" ON public.vacation_events;
CREATE POLICY "Admins read vacation_events"
  ON public.vacation_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND COALESCE(p.is_banned, false) = false
    )
  );

-- vacation_leads: anon insert only; admin read
DROP POLICY IF EXISTS "vacation_leads anon insert" ON public.vacation_leads;
CREATE POLICY "vacation_leads anon insert"
  ON public.vacation_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "vacation_leads deny client read" ON public.vacation_leads;
CREATE POLICY "vacation_leads deny client read"
  ON public.vacation_leads
  FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Admins read vacation_leads" ON public.vacation_leads;
CREATE POLICY "Admins read vacation_leads"
  ON public.vacation_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND COALESCE(p.is_banned, false) = false
    )
  );

-- vacation_scenarios: public read active; admin read all
DROP POLICY IF EXISTS "vacation_scenarios public read active" ON public.vacation_scenarios;
CREATE POLICY "vacation_scenarios public read active"
  ON public.vacation_scenarios
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins read vacation_scenarios" ON public.vacation_scenarios;
CREATE POLICY "Admins read vacation_scenarios"
  ON public.vacation_scenarios
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND COALESCE(p.is_banned, false) = false
    )
  );

INSERT INTO public.vacation_scenarios (title, slug, description, image_url, is_active, sort_order, config)
VALUES
  (
    'Antalya — Belek',
    'antalya-belek',
    'Aile dostu her şey dahil otel seçenekleri; uçuş + transfer paketleriyle uyumlu.',
    '/assets/images/placeholder.svg',
    true,
    10,
    '{"badge":"logical","region":"Akdeniz","fit":["family","allInclusive"]}'::jsonb
  ),
  (
    'Kuşadası — Didim',
    'kusadasi-didim',
    'Ekonomik sahil tatili; kısa mesafe ve esnek konaklama alternatifleri.',
    '/assets/images/placeholder.svg',
    true,
    20,
    '{"badge":"economic","region":"Ege","fit":["budget","sea"]}'::jsonb
  ),
  (
    'Bodrum — Torba',
    'bodrum-torba',
    'Konfor odaklı butik ve villa seçenekleri; sakin koy profili.',
    '/assets/images/placeholder.svg',
    true,
    30,
    '{"badge":"comfort","region":"Ege","fit":["luxury","couple"]}'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;
