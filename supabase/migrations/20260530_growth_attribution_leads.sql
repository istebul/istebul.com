-- Growth attribution on CRM leads (partner routing + reporting)
ALTER TABLE public.auto_leads
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS growth_channel text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

CREATE INDEX IF NOT EXISTS idx_auto_leads_growth_channel
  ON public.auto_leads (growth_channel)
  WHERE growth_channel IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auto_leads_referral_code
  ON public.auto_leads (referral_code)
  WHERE referral_code IS NOT NULL;
