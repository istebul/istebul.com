-- Live data feature flags (site_settings)
-- live_providers_enabled: public read for UI mode labels
-- live_finance_feed_url: admin-only (edge functions use service role)

INSERT INTO public.site_settings (key, value, updated_at)
VALUES
  ('live_providers_enabled', 'false', now()),
  ('live_finance_feed_url', '', now())
ON CONFLICT (key) DO NOTHING;

-- Extend public CMS allowlist (idempotent policy rebuild pattern)
DROP POLICY IF EXISTS "Public read allowlisted site_settings" ON public.site_settings;

CREATE POLICY "Public read allowlisted site_settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (
    key IN (
      'site-name',
      'site-subtitle',
      'hero-eyebrow',
      'hero-title',
      'hero-desc',
      'title',
      'description',
      'phone',
      'email',
      'address',
      'instagram',
      'twitter',
      'facebook',
      'linkedin',
      'youtube',
      'tiktok',
      'home_category_auto_enabled',
      'home_category_konut_enabled',
      'home_category_tatil_enabled',
      'home_category_finans_enabled',
      'home_category_sigorta_enabled',
      'home_category_kasko_enabled',
      'vacation_enabled',
      'vacation_ai_enabled',
      'vacation_partner_cta_enabled',
      'vacation_default_budget_note',
      'vacation_disclaimer_text',
      'live_providers_enabled'
    )
  );
