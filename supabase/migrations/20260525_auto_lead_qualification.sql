-- Non-breaking lead qualification columns for CRM (nullable).
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
