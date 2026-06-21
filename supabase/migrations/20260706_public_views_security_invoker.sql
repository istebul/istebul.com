-- Security Advisor: persist security_invoker on public aggregate views (non-destructive).
-- Aligns repo with manual production SQL Editor fix; idempotent if already set.

ALTER VIEW IF EXISTS public.moat_segment_benchmarks SET (security_invoker = true);
ALTER VIEW IF EXISTS public.lifecycle_flow_daily SET (security_invoker = true);
ALTER VIEW IF EXISTS public.analytics_funnel_daily SET (security_invoker = true);
