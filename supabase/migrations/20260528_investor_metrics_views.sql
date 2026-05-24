-- Investor metrics views (service-role / admin analytics only)
-- Safe no-op if subscriptions table missing.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscriptions'
  ) THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.investor_subscription_summary AS
      SELECT
        COUNT(*) FILTER (WHERE status IN ('active', 'trialing')) AS billable_subscriptions,
        COUNT(*) FILTER (WHERE status = 'active') AS active_subscriptions,
        COUNT(*) FILTER (WHERE status = 'trialing') AS trialing_subscriptions,
        COUNT(*) FILTER (WHERE cancel_at_period_end IS TRUE) AS cancel_at_period_end_count
      FROM public.subscriptions
    $view$;

    EXECUTE $view$
      CREATE OR REPLACE VIEW public.investor_lead_pipeline_summary AS
      SELECT
        COUNT(*) AS lead_count,
        COALESCE(SUM(estimated_revenue), 0) AS pipeline_estimated_try,
        COALESCE(SUM(actual_revenue), 0) AS pipeline_actual_try,
        COUNT(*) FILTER (
          WHERE partner_status IN ('paid', 'closed', 'won', 'delivered', 'funded', 'purchased')
        ) AS partner_wins
      FROM public.auto_leads
    $view$;

    REVOKE ALL ON public.investor_subscription_summary FROM PUBLIC;
    REVOKE ALL ON public.investor_lead_pipeline_summary FROM PUBLIC;
  END IF;
END $$;
