-- Allow admins to read the full Pro entitlement redemption history.
DROP POLICY IF EXISTS pro_entitlement_code_redemptions_admin_select
  ON public.pro_entitlement_code_redemptions;
CREATE POLICY pro_entitlement_code_redemptions_admin_select
  ON public.pro_entitlement_code_redemptions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
