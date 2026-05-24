-- Phase A: data retention helpers + audit log (scale roadmap)

CREATE TABLE IF NOT EXISTS public.data_retention_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  job_name text NOT NULL,
  deleted_count bigint NOT NULL DEFAULT 0,
  retention_days integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS data_retention_runs_job_time_idx
  ON public.data_retention_runs (job_name, created_at DESC);

ALTER TABLE public.data_retention_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny data_retention_runs client" ON public.data_retention_runs;
CREATE POLICY "deny data_retention_runs client"
  ON public.data_retention_runs FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- Hot operational purge (90d default) — legal archive may use longer window separately
CREATE OR REPLACE FUNCTION public.purge_analytics_events_older_than(days integer DEFAULT 90)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted bigint;
BEGIN
  IF days IS NULL OR days < 30 THEN
    RAISE EXCEPTION 'retention days must be >= 30';
  END IF;

  WITH d AS (
    DELETE FROM public.analytics_events
    WHERE created_at < now() - make_interval(days => days)
    RETURNING 1
  )
  SELECT COUNT(*)::bigint INTO deleted FROM d;

  RETURN COALESCE(deleted, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_operational_events_older_than(days integer DEFAULT 90)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted bigint;
BEGIN
  IF days IS NULL OR days < 14 THEN
    RAISE EXCEPTION 'retention days must be >= 14';
  END IF;

  WITH d AS (
    DELETE FROM public.operational_events
    WHERE created_at < now() - make_interval(days => days)
    RETURNING 1
  )
  SELECT COUNT(*)::bigint INTO deleted FROM d;

  RETURN COALESCE(deleted, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.purge_analytics_events_older_than(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_operational_events_older_than(integer) FROM PUBLIC;
