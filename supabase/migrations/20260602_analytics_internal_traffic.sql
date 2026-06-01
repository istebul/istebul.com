-- Internal Traffic Exclusion (ITE) — analytics metadata + exclusion rules

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS internal_reason text,
  ADD COLUMN IF NOT EXISTS traffic_type text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS device_hash text,
  ADD COLUMN IF NOT EXISTS user_agent_hash text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS landing_page text;

ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_traffic_type_check;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_traffic_type_check
  CHECK (traffic_type IN ('real_user', 'internal', 'bot', 'unknown'));

ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_internal_reason_check;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_internal_reason_check
  CHECK (
    internal_reason IS NULL OR internal_reason IN (
      'admin_user',
      'known_ip',
      'known_device',
      'localhost',
      'preview_domain',
      'internal_param',
      'unknown'
    )
  );

CREATE INDEX IF NOT EXISTS analytics_events_internal_time_idx
  ON public.analytics_events (is_internal, traffic_type, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_utm_source_idx
  ON public.analytics_events (utm_source, created_at DESC)
  WHERE utm_source IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.analytics_exclusion_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('ip_hash', 'device_hash', 'user_id', 'domain', 'param')),
  value_hash text NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS analytics_exclusion_rules_type_value_idx
  ON public.analytics_exclusion_rules (type, value_hash)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS analytics_exclusion_rules_active_idx
  ON public.analytics_exclusion_rules (is_active, type);

ALTER TABLE public.analytics_exclusion_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin manage analytics exclusion rules" ON public.analytics_exclusion_rules;
CREATE POLICY "admin manage analytics exclusion rules"
ON public.analytics_exclusion_rules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND COALESCE(profiles.is_banned, false) = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND COALESCE(profiles.is_banned, false) = false
  )
);

INSERT INTO public.site_settings (key, value, updated_at)
VALUES ('analytics_clean_start_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), now())
ON CONFLICT (key) DO NOTHING;
