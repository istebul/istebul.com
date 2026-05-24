-- P4.7 — Analytics scale indexes (time-range scans, admin dashboards)

-- BRIN: efficient for append-only time series at 100K+ MAU event volume
CREATE INDEX IF NOT EXISTS analytics_events_created_at_brin_idx
  ON public.analytics_events USING brin (created_at);

-- Hot path: recent funnel / admin queries (last 14–30 days)
CREATE INDEX IF NOT EXISTS analytics_events_recent_name_idx
  ON public.analytics_events (created_at DESC, event_name)
  WHERE created_at >= (now() - interval '90 days');

COMMENT ON INDEX analytics_events_created_at_brin_idx IS
  'P4.7 scale: BRIN for large analytics_events time scans';
