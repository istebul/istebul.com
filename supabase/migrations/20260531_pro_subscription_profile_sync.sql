-- Pro subscription denormalized fields on profiles (webhook sync; users cannot self-escalate).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;

COMMENT ON COLUMN public.profiles.plan IS 'free | pro — synced from Stripe webhook; not user-editable';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Stripe subscription status mirror';

CREATE OR REPLACE FUNCTION public.enforce_profile_billing_fields_unchanged()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND COALESCE(p.is_banned, false) = false) THEN
      RETURN NEW;
    END IF;

    NEW.plan := OLD.plan;
    NEW.subscription_status := OLD.subscription_status;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.subscription_current_period_end := OLD.subscription_current_period_end;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_billing_fields_guard ON public.profiles;
CREATE TRIGGER trg_profiles_billing_fields_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_billing_fields_unchanged();
