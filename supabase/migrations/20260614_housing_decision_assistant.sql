-- Konut Karar Asistanı — events, leads, locations, partners, settings

CREATE TABLE IF NOT EXISTS public.housing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.housing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  full_name text,
  email text,
  phone text,
  housing_purpose text,
  housing_type text,
  total_budget numeric(14,2),
  down_payment numeric(14,2),
  loan_amount numeric(14,2),
  monthly_income numeric(14,2),
  term_months int,
  location_text text,
  priorities text,
  ai_summary text,
  decision_score int,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.housing_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  district text NOT NULL,
  avg_price_level numeric(14,2) NOT NULL DEFAULT 0,
  transport_score int NOT NULL DEFAULT 0,
  life_quality_score int NOT NULL DEFAULT 0,
  investment_score int NOT NULL DEFAULT 0,
  risk_score int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.housing_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name text NOT NULL,
  partner_type text NOT NULL,
  city text,
  district text,
  contact_link text,
  commission_note text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.housing_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS housing_events_created_at_idx ON public.housing_events (created_at DESC);
CREATE INDEX IF NOT EXISTS housing_events_session_idx ON public.housing_events (session_id);
CREATE INDEX IF NOT EXISTS housing_leads_created_at_idx ON public.housing_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS housing_leads_status_idx ON public.housing_leads (status);
CREATE INDEX IF NOT EXISTS housing_locations_active_city_idx ON public.housing_locations (is_active, city);
CREATE INDEX IF NOT EXISTS housing_partners_active_city_idx ON public.housing_partners (is_active, city);

CREATE OR REPLACE FUNCTION public.set_housing_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_housing_leads_updated_at ON public.housing_leads;
CREATE TRIGGER trg_housing_leads_updated_at
  BEFORE UPDATE ON public.housing_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_housing_updated_at();

DROP TRIGGER IF EXISTS trg_housing_locations_updated_at ON public.housing_locations;
CREATE TRIGGER trg_housing_locations_updated_at
  BEFORE UPDATE ON public.housing_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_housing_updated_at();

DROP TRIGGER IF EXISTS trg_housing_partners_updated_at ON public.housing_partners;
CREATE TRIGGER trg_housing_partners_updated_at
  BEFORE UPDATE ON public.housing_partners
  FOR EACH ROW EXECUTE FUNCTION public.set_housing_updated_at();

ALTER TABLE public.housing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "housing_events anon insert" ON public.housing_events;
CREATE POLICY "housing_events anon insert" ON public.housing_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "housing_events deny client read" ON public.housing_events;
CREATE POLICY "housing_events deny client read" ON public.housing_events
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "housing_leads anon insert" ON public.housing_leads;
CREATE POLICY "housing_leads anon insert" ON public.housing_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "housing_leads deny client read" ON public.housing_leads;
CREATE POLICY "housing_leads deny client read" ON public.housing_leads
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "housing_locations deny client read" ON public.housing_locations;
CREATE POLICY "housing_locations deny client read" ON public.housing_locations
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "housing_partners deny client read" ON public.housing_partners;
CREATE POLICY "housing_partners deny client read" ON public.housing_partners
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "housing_settings deny client read" ON public.housing_settings;
CREATE POLICY "housing_settings deny client read" ON public.housing_settings
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "Admins full housing_events" ON public.housing_events;
CREATE POLICY "Admins full housing_events" ON public.housing_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false));

DROP POLICY IF EXISTS "Admins full housing_leads" ON public.housing_leads;
CREATE POLICY "Admins full housing_leads" ON public.housing_leads
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false));

DROP POLICY IF EXISTS "Admins full housing_locations" ON public.housing_locations;
CREATE POLICY "Admins full housing_locations" ON public.housing_locations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false));

DROP POLICY IF EXISTS "Admins full housing_partners" ON public.housing_partners;
CREATE POLICY "Admins full housing_partners" ON public.housing_partners
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false));

DROP POLICY IF EXISTS "Admins full housing_settings" ON public.housing_settings;
CREATE POLICY "Admins full housing_settings" ON public.housing_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false));

INSERT INTO public.housing_settings (key, value)
VALUES
  ('housing_payment_weight', '0.25'),
  ('housing_location_weight', '0.20'),
  ('housing_risk_factor', '0.25'),
  ('housing_investment_weight', '0.15'),
  ('housing_total_cost_weight', '0.15'),
  ('housing_ai_prompt_template', 'Tahmini analiz diliyle konut karar yorumu üret.')
ON CONFLICT (key) DO NOTHING;
