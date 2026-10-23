-- Harden Pro entitlement RPC execute grants.
-- Keep issue/redeem SECURITY DEFINER functions callable through the
-- authenticated role only; anonymous clients must never be able to execute them.

REVOKE ALL ON FUNCTION public.issue_pro_entitlement_code(integer, integer, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_pro_entitlement_code(integer, integer, timestamptz)
  TO authenticated;
REVOKE ALL ON FUNCTION public.redeem_pro_entitlement_code(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_pro_entitlement_code(text)
  TO authenticated;
