-- Finans Karar Asistanı tabloları + RLS

CREATE TABLE IF NOT EXISTS public.finance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  full_name text,
  email text,
  phone text,
  finance_purpose text,
  requested_amount numeric(14,2),
  down_payment numeric(14,2),
  loan_amount numeric(14,2),
  term_months int,
  monthly_rate numeric(8,4),
  monthly_income numeric(14,2),
  existing_debt numeric(14,2),
  fixed_expenses numeric(14,2),
  priorities text,
  decision_score int,
  risk_level text,
  ai_summary text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name text NOT NULL,
  product_type text NOT NULL,
  min_amount numeric(14,2) NOT NULL DEFAULT 0,
  max_amount numeric(14,2) NOT NULL DEFAULT 0,
  min_term int NOT NULL DEFAULT 1,
  max_term int NOT NULL DEFAULT 120,
  rate_range text,
  affiliate_link text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.finance_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_events_created_at_idx ON public.finance_events (created_at DESC);
CREATE INDEX IF NOT EXISTS finance_events_session_idx ON public.finance_events (session_id);
CREATE INDEX IF NOT EXISTS finance_leads_created_at_idx ON public.finance_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS finance_leads_status_idx ON public.finance_leads (status);
CREATE INDEX IF NOT EXISTS finance_partners_active_idx ON public.finance_partners (is_active, institution_name);

CREATE OR REPLACE FUNCTION public.set_finance_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finance_leads_updated_at ON public.finance_leads;
CREATE TRIGGER trg_finance_leads_updated_at
  BEFORE UPDATE ON public.finance_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_finance_updated_at();

DROP TRIGGER IF EXISTS trg_finance_partners_updated_at ON public.finance_partners;
CREATE TRIGGER trg_finance_partners_updated_at
  BEFORE UPDATE ON public.finance_partners
  FOR EACH ROW EXECUTE FUNCTION public.set_finance_updated_at();

ALTER TABLE public.finance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_events anon insert" ON public.finance_events;
CREATE POLICY "finance_events anon insert" ON public.finance_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "finance_events deny client read" ON public.finance_events;
CREATE POLICY "finance_events deny client read" ON public.finance_events
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "finance_leads anon insert" ON public.finance_leads;
CREATE POLICY "finance_leads anon insert" ON public.finance_leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "finance_leads deny client read" ON public.finance_leads;
CREATE POLICY "finance_leads deny client read" ON public.finance_leads
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "finance_partners deny client read" ON public.finance_partners;
CREATE POLICY "finance_partners deny client read" ON public.finance_partners
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "finance_settings deny client read" ON public.finance_settings;
CREATE POLICY "finance_settings deny client read" ON public.finance_settings
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "Admins full finance_events" ON public.finance_events;
CREATE POLICY "Admins full finance_events" ON public.finance_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false));

DROP POLICY IF EXISTS "Admins full finance_leads" ON public.finance_leads;
CREATE POLICY "Admins full finance_leads" ON public.finance_leads
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false));

DROP POLICY IF EXISTS "Admins full finance_partners" ON public.finance_partners;
CREATE POLICY "Admins full finance_partners" ON public.finance_partners
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false));

DROP POLICY IF EXISTS "Admins full finance_settings" ON public.finance_settings;
CREATE POLICY "Admins full finance_settings" ON public.finance_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false));

INSERT INTO public.finance_settings (key, value)
VALUES
  ('finance_payment_comfort_weight', '0.30'),
  ('finance_total_cost_weight', '0.23'),
  ('finance_risk_factor', '0.20'),
  ('finance_cashflow_weight', '0.27'),
  ('finance_ai_prompt_template', 'Tahmini analiz dilinde finans karar yorumu üret.')
ON CONFLICT (key) DO NOTHING;
