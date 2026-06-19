-- Konut lead admin follow-up and risk metadata

ALTER TABLE public.housing_leads
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS monthly_capacity numeric(14,2),
  ADD COLUMN IF NOT EXISTS financing_needed boolean;
