-- Referral growth loop: codes, first-touch attribution, rewards (anti-stacking)

CREATE TABLE IF NOT EXISTS public.referral_codes (
  code text PRIMARY KEY,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_email text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_code_format CHECK (code ~ '^[a-z0-9]{4,16}$')
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_owner_user
  ON public.referral_codes (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_owner_email_active
  ON public.referral_codes (lower(owner_email))
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL REFERENCES public.referral_codes(code) ON DELETE RESTRICT,
  referrer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referee_email text,
  session_id text,
  first_touch_at timestamptz NOT NULL DEFAULT now(),
  signed_up_at timestamptz,
  converted_at timestamptz,
  conversion_type text CHECK (conversion_type IN ('lead', 'subscription')),
  click_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT referral_attributions_referee_identity CHECK (
    referee_user_id IS NOT NULL OR referee_email IS NOT NULL OR session_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS referral_attributions_referee_user_unique
  ON public.referral_attributions (referee_user_id)
  WHERE referee_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS referral_attributions_referee_email_unique
  ON public.referral_attributions (lower(referee_email))
  WHERE referee_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_attributions_code
  ON public.referral_attributions (referral_code, first_touch_at DESC);

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  referral_code text NOT NULL REFERENCES public.referral_codes(code) ON DELETE RESTRICT,
  beneficiary_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_beneficiary
  ON public.referral_rewards (beneficiary_user_id, created_at DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_entitlements jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY referral_codes_deny_client ON public.referral_codes
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY referral_attributions_deny_client ON public.referral_attributions
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY referral_rewards_deny_client ON public.referral_rewards
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
