-- Lifecycle CRM automation: contacts, enrollments, message queue

CREATE TABLE IF NOT EXISTS public.lifecycle_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id uuid,
  email text,
  phone text,
  display_name text,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lifecycle_contacts_has_channel CHECK (
    email IS NOT NULL OR phone IS NOT NULL OR user_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_contacts_email_unique
  ON public.lifecycle_contacts (lower(email))
  WHERE email IS NOT NULL AND unsubscribed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_contacts_user_unique
  ON public.lifecycle_contacts (user_id)
  WHERE user_id IS NOT NULL AND unsubscribed_at IS NULL;

CREATE INDEX IF NOT EXISTS lifecycle_contacts_last_active_idx
  ON public.lifecycle_contacts (last_active_at DESC);

CREATE TABLE IF NOT EXISTS public.lifecycle_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.lifecycle_contacts(id) ON DELETE CASCADE,
  flow_id text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled', 'paused')),
  current_step_index integer NOT NULL DEFAULT 0,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  trigger_source text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_enrollments_active_flow_unique
  ON public.lifecycle_enrollments (contact_id, flow_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS lifecycle_enrollments_flow_status_idx
  ON public.lifecycle_enrollments (flow_id, status, enrolled_at DESC);

CREATE TABLE IF NOT EXISTS public.lifecycle_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.lifecycle_enrollments(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.lifecycle_contacts(id) ON DELETE CASCADE,
  flow_id text NOT NULL,
  step_id text NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  subject text NOT NULL,
  template_id text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'cancelled')),
  provider_message_id text,
  error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lifecycle_messages_step_unique
  ON public.lifecycle_messages (enrollment_id, step_id);

CREATE INDEX IF NOT EXISTS lifecycle_messages_pending_idx
  ON public.lifecycle_messages (status, scheduled_at)
  WHERE status = 'pending';

ALTER TABLE public.lifecycle_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny lifecycle_contacts" ON public.lifecycle_contacts;
CREATE POLICY "deny lifecycle_contacts"
  ON public.lifecycle_contacts FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny lifecycle_enrollments" ON public.lifecycle_enrollments;
CREATE POLICY "deny lifecycle_enrollments"
  ON public.lifecycle_enrollments FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "deny lifecycle_messages" ON public.lifecycle_messages;
CREATE POLICY "deny lifecycle_messages"
  ON public.lifecycle_messages FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "admin read lifecycle_contacts" ON public.lifecycle_contacts;
CREATE POLICY "admin read lifecycle_contacts"
  ON public.lifecycle_contacts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator')
        AND COALESCE(profiles.is_banned, false) = false
    )
  );

DROP POLICY IF EXISTS "admin read lifecycle_enrollments" ON public.lifecycle_enrollments;
CREATE POLICY "admin read lifecycle_enrollments"
  ON public.lifecycle_enrollments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator')
        AND COALESCE(profiles.is_banned, false) = false
    )
  );

DROP POLICY IF EXISTS "admin read lifecycle_messages" ON public.lifecycle_messages;
CREATE POLICY "admin read lifecycle_messages"
  ON public.lifecycle_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'moderator')
        AND COALESCE(profiles.is_banned, false) = false
    )
  );

-- Admin lifecycle funnel summary
CREATE OR REPLACE VIEW public.lifecycle_flow_daily AS
SELECT
  date_trunc('day', COALESCE(sent_at, scheduled_at)) AS day,
  flow_id,
  status,
  COUNT(*)::bigint AS messages
FROM public.lifecycle_messages
GROUP BY 1, 2, 3;

GRANT SELECT ON public.lifecycle_flow_daily TO authenticated;

-- Extend analytics category for lifecycle events
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analytics_events_category_check'
      AND conrelid = 'public.analytics_events'::regclass
  ) THEN
    ALTER TABLE public.analytics_events
      DROP CONSTRAINT analytics_events_category_check;
  END IF;
END $$;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_category_check
  CHECK (event_category IN (
    'page', 'cta', 'auth', 'subscription', 'lead', 'auto', 'finance',
    'partner', 'admin', 'revenue', 'growth', 'lifecycle'
  ));
