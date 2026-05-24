-- Launch security: admin CRM read access, analytics funnel lockdown, last-admin guard

-- Admin CRM: allow SELECT on operational tables (writes still via admin-action / service role)
DROP POLICY IF EXISTS "Admins read auto_leads" ON public.auto_leads;
CREATE POLICY "Admins read auto_leads"
  ON public.auto_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND COALESCE(p.is_banned, false) = false
    )
  );

DROP POLICY IF EXISTS "Admins read auto_events" ON public.auto_events;
CREATE POLICY "Admins read auto_events"
  ON public.auto_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND COALESCE(p.is_banned, false) = false
    )
  );

-- Funnel aggregate view: not exposed to all authenticated users
REVOKE ALL ON public.analytics_funnel_daily FROM authenticated;
REVOKE ALL ON public.analytics_funnel_daily FROM anon;
GRANT SELECT ON public.analytics_funnel_daily TO service_role;

-- Prevent removing the last active admin via direct profile UPDATE
CREATE OR REPLACE FUNCTION public.enforce_minimum_admin_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'admin' AND (NEW.role IS DISTINCT FROM 'admin' OR COALESCE(NEW.is_banned, false) = true) THEN
      SELECT count(*)::integer INTO admin_count
      FROM public.profiles
      WHERE role = 'admin' AND COALESCE(is_banned, false) = false AND id <> OLD.id;

      IF admin_count < 1 THEN
        RAISE EXCEPTION 'At least one active admin account must remain';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_minimum_admin ON public.profiles;
CREATE TRIGGER trg_enforce_minimum_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_minimum_admin_count();
