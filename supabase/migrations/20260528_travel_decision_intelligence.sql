-- Travel decision intelligence extensions for tatil category.
-- Keeps existing vacation_* tables intact and adds admin-operable modules.

ALTER TABLE IF EXISTS public.vacation_leads
  ADD COLUMN IF NOT EXISTS travelers_count int,
  ADD COLUMN IF NOT EXISTS children_ages text,
  ADD COLUMN IF NOT EXISTS expectations text;

CREATE TABLE IF NOT EXISTS public.vacation_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  country text NOT NULL,
  vacation_type text,
  season_score int NOT NULL DEFAULT 60,
  risk_score int NOT NULL DEFAULT 35,
  avg_cost numeric(12,2) NOT NULL DEFAULT 0,
  family_fit_score int NOT NULL DEFAULT 70,
  child_friendly boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vacation_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  partner_type text NOT NULL,
  affiliate_link text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vacation_scoring_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_factor numeric(6,2) NOT NULL DEFAULT 1,
  cost_factor numeric(6,2) NOT NULL DEFAULT 1,
  family_weight numeric(6,2) NOT NULL DEFAULT 1,
  prompt_template text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vacation_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_scoring_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vacation_destinations public read active" ON public.vacation_destinations;
CREATE POLICY "vacation_destinations public read active"
  ON public.vacation_destinations
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "vacation_partners public read active" ON public.vacation_partners;
CREATE POLICY "vacation_partners public read active"
  ON public.vacation_partners
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "vacation_scoring deny client read" ON public.vacation_scoring_configs;
CREATE POLICY "vacation_scoring deny client read"
  ON public.vacation_scoring_configs
  FOR SELECT
  TO anon, authenticated
  USING (false);

DROP POLICY IF EXISTS "Admins manage vacation_destinations" ON public.vacation_destinations;
CREATE POLICY "Admins manage vacation_destinations"
  ON public.vacation_destinations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND COALESCE(p.is_banned, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND COALESCE(p.is_banned, false) = false
    )
  );

DROP POLICY IF EXISTS "Admins manage vacation_partners" ON public.vacation_partners;
CREATE POLICY "Admins manage vacation_partners"
  ON public.vacation_partners
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND COALESCE(p.is_banned, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND COALESCE(p.is_banned, false) = false
    )
  );

DROP POLICY IF EXISTS "Admins manage vacation_scoring" ON public.vacation_scoring_configs;
CREATE POLICY "Admins manage vacation_scoring"
  ON public.vacation_scoring_configs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND COALESCE(p.is_banned, false) = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND COALESCE(p.is_banned, false) = false
    )
  );
