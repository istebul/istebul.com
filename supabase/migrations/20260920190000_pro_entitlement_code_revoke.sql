-- Pro entitlement code lifecycle hardening.
-- Admin-only revoke: blocks future redemption without removing already-issued user entitlements.

CREATE OR REPLACE FUNCTION public.revoke_pro_entitlement_code(
  p_code_id uuid
)
RETURNS TABLE (
  id uuid,
  code_prefix text,
  status text,
  redemption_count integer,
  max_redemptions integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  RETURN QUERY
  UPDATE public.pro_entitlement_codes
     SET status = 'revoked',
         updated_at = now()
   WHERE pro_entitlement_codes.id = p_code_id
     AND pro_entitlement_codes.status = 'active'
  RETURNING
    pro_entitlement_codes.id,
    pro_entitlement_codes.code_prefix,
    pro_entitlement_codes.status,
    pro_entitlement_codes.redemption_count,
    pro_entitlement_codes.max_redemptions,
    pro_entitlement_codes.updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'code_not_found_or_already_revoked';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_pro_entitlement_code(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_pro_entitlement_code(uuid)
  TO authenticated;
