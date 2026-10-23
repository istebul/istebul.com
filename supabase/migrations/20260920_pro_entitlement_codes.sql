-- Pro entitlement codes
-- Grants temporary or lifetime Pro access without mutating Stripe subscription state.
-- Existing public.user_entitlements remains the canonical user-facing entitlement table.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- ---------------------------------------------------------------------------
-- pro_entitlement_codes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pro_entitlement_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  code_prefix text NOT NULL,
  entitlement_code text NOT NULL DEFAULT 'pro_access',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  duration_days integer
    CHECK (duration_days IS NULL OR duration_days > 0),
  expires_at timestamptz,
  max_redemptions integer NOT NULL DEFAULT 1
    CHECK (max_redemptions > 0),
  redemption_count integer NOT NULL DEFAULT 0
    CHECK (redemption_count >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (redemption_count <= max_redemptions)
);
CREATE INDEX IF NOT EXISTS pro_entitlement_codes_status_idx
  ON public.pro_entitlement_codes (status, expires_at);
-- ---------------------------------------------------------------------------
-- pro_entitlement_code_redemptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pro_entitlement_code_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.pro_entitlement_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_entitlement_id uuid REFERENCES public.user_entitlements(id) ON DELETE SET NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);
CREATE INDEX IF NOT EXISTS pro_entitlement_code_redemptions_user_idx
  ON public.pro_entitlement_code_redemptions (user_id, redeemed_at DESC);
-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_pro_entitlement_code_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS pro_entitlement_codes_updated_at
  ON public.pro_entitlement_codes;
CREATE TRIGGER pro_entitlement_codes_updated_at
  BEFORE UPDATE ON public.pro_entitlement_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pro_entitlement_code_updated_at();
-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.pro_entitlement_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_entitlement_code_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pro_entitlement_codes_admin_select
  ON public.pro_entitlement_codes;
CREATE POLICY pro_entitlement_codes_admin_select
  ON public.pro_entitlement_codes
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
DROP POLICY IF EXISTS pro_entitlement_code_redemptions_select_own
  ON public.pro_entitlement_code_redemptions;
CREATE POLICY pro_entitlement_code_redemptions_select_own
  ON public.pro_entitlement_code_redemptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.pro_entitlement_codes FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pro_entitlement_code_redemptions FROM anon, authenticated;
-- ---------------------------------------------------------------------------
-- Admin: issue a new code
-- Returns the plaintext code once. Only its hash is stored.
-- duration_days = NULL means lifetime entitlement unless the code itself expires.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.issue_pro_entitlement_code(
  p_duration_days integer DEFAULT 30,
  p_max_redemptions integer DEFAULT 1,
  p_code_expires_at timestamptz DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_code text;
  v_hash text;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF p_duration_days IS NOT NULL AND p_duration_days <= 0 THEN
    RAISE EXCEPTION 'duration_days_must_be_positive';
  END IF;

  IF p_max_redemptions <= 0 THEN
    RAISE EXCEPTION 'max_redemptions_must_be_positive';
  END IF;

  LOOP
    v_code := upper(
      substring(encode(gen_random_bytes(16), 'hex') FROM 1 FOR 24)
    );
    v_hash := encode(digest(v_code, 'sha256'), 'hex');

    BEGIN
      INSERT INTO public.pro_entitlement_codes (
        code_hash,
        code_prefix,
        duration_days,
        expires_at,
        max_redemptions,
        created_by
      )
      VALUES (
        v_hash,
        substring(v_code FROM 1 FOR 8),
        p_duration_days,
        p_code_expires_at,
        p_max_redemptions,
        auth.uid()
      )
      RETURNING id INTO v_id;

      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        -- Extremely unlikely; regenerate the code and retry.
    END;
  END LOOP;

  RETURN v_code;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_pro_entitlement_code(integer, integer, timestamptz)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_pro_entitlement_code(integer, integer, timestamptz)
  TO authenticated;
-- ---------------------------------------------------------------------------
-- Authenticated user: redeem a Pro code
-- Idempotent for the same user/code pair.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_pro_entitlement_code(
  p_code text
)
RETURNS TABLE (
  entitlement_id uuid,
  entitlement_code text,
  status text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_hash text;
  v_code_row public.pro_entitlement_codes%ROWTYPE;
  v_existing public.pro_entitlement_code_redemptions%ROWTYPE;
  v_expires_at timestamptz;
  v_entitlement_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF v_code = '' THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  v_hash := encode(digest(v_code, 'sha256'), 'hex');

  SELECT *
    INTO v_code_row
    FROM public.pro_entitlement_codes
   WHERE code_hash = v_hash
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  -- Same user + same code is fully idempotent.
  SELECT *
    INTO v_existing
    FROM public.pro_entitlement_code_redemptions
   WHERE code_id = v_code_row.id
     AND user_id = v_user_id;

  IF FOUND THEN
    RETURN QUERY
    SELECT ue.id,
           ue.entitlement_code,
           ue.status,
           ue.expires_at
      FROM public.user_entitlements ue
     WHERE ue.id = v_existing.user_entitlement_id;
    RETURN;
  END IF;

  IF v_code_row.status <> 'active' THEN
    RAISE EXCEPTION 'code_not_active';
  END IF;

  IF v_code_row.expires_at IS NOT NULL
     AND v_code_row.expires_at <= now() THEN
    RAISE EXCEPTION 'code_expired';
  END IF;

  IF v_code_row.redemption_count >= v_code_row.max_redemptions THEN
    RAISE EXCEPTION 'code_fully_redeemed';
  END IF;

  IF v_code_row.duration_days IS NULL THEN
    v_expires_at := v_code_row.expires_at;
  ELSE
    v_expires_at := now() + make_interval(days => v_code_row.duration_days);
    IF v_code_row.expires_at IS NOT NULL
       AND v_expires_at > v_code_row.expires_at THEN
      v_expires_at := v_code_row.expires_at;
    END IF;
  END IF;

  INSERT INTO public.user_entitlements (
    user_id,
    entitlement_code,
    source_order_id,
    status,
    expires_at
  )
  VALUES (
    v_user_id,
    'pro_access',
    NULL,
    'active',
    v_expires_at
  )
  RETURNING id INTO v_entitlement_id;

  INSERT INTO public.pro_entitlement_code_redemptions (
    code_id,
    user_id,
    user_entitlement_id
  )
  VALUES (
    v_code_row.id,
    v_user_id,
    v_entitlement_id
  );

  UPDATE public.pro_entitlement_codes
     SET redemption_count = redemption_count + 1
   WHERE id = v_code_row.id;

  RETURN QUERY
  SELECT ue.id,
         ue.entitlement_code,
         ue.status,
         ue.expires_at
    FROM public.user_entitlements ue
   WHERE ue.id = v_entitlement_id;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_pro_entitlement_code(text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_pro_entitlement_code(text)
  TO authenticated;
