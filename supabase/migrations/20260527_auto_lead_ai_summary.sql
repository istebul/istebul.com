-- Optional short AI commentary snapshot on lead (nullable, backward compatible).

ALTER TABLE public.auto_leads
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_confidence text;

COMMENT ON COLUMN public.auto_leads.ai_summary IS 'Truncated executive summary from /auto AI commentary (no PII)';
COMMENT ON COLUMN public.auto_leads.ai_confidence IS 'AI commentary confidence band: yüksek|orta|düşük';
