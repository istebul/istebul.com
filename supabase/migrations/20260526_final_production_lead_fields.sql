-- Final production lead qualification columns (idempotent).
-- Safe to run when 20260525_auto_lead_qualification.sql was skipped on remote.
-- Does not alter RLS, NOT NULL constraints, or existing rows.

ALTER TABLE public.auto_leads
  ADD COLUMN IF NOT EXISTS purchase_timeline text,
  ADD COLUMN IF NOT EXISTS financing_intent text,
  ADD COLUMN IF NOT EXISTS trade_in text,
  ADD COLUMN IF NOT EXISTS urgency text,
  ADD COLUMN IF NOT EXISTS contact_preference text;

COMMENT ON COLUMN public.auto_leads.purchase_timeline IS 'Lead: expected purchase window (0-30, 1-3, 3-6, 6+)';
COMMENT ON COLUMN public.auto_leads.financing_intent IS 'Lead: financing intent (yes/no or detail)';
COMMENT ON COLUMN public.auto_leads.trade_in IS 'Lead: trade-in yes/no';
COMMENT ON COLUMN public.auto_leads.urgency IS 'Lead: urgency low|medium|high';
COMMENT ON COLUMN public.auto_leads.contact_preference IS 'Lead: phone|whatsapp|email';

-- Optional filter for CRM (admin service role only; no RLS change)
CREATE INDEX IF NOT EXISTS idx_auto_leads_purchase_timeline
  ON public.auto_leads (purchase_timeline)
  WHERE purchase_timeline IS NOT NULL;
