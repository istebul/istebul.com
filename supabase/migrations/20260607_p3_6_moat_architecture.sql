-- P3.6: Moat flywheel snapshot view (read via service role / admin)

CREATE OR REPLACE VIEW public.moat_flywheel_snapshot AS
SELECT
  (SELECT COUNT(*)::integer FROM public.auto_leads) AS leads_total,
  (SELECT COUNT(*)::integer FROM public.auto_leads WHERE decision_session_id IS NOT NULL) AS leads_with_session,
  (SELECT COUNT(*)::integer FROM public.auto_leads WHERE scoring_calibration_delta IS NOT NULL AND scoring_calibration_delta <> 0) AS leads_calibrated,
  (SELECT COUNT(*)::integer FROM public.outcome_signal_events WHERE created_at > now() - interval '90 days') AS outcome_signals_90d,
  (SELECT COUNT(*)::integer FROM public.product_feedback WHERE created_at > now() - interval '90 days') AS product_feedback_90d,
  (SELECT COUNT(*)::integer FROM public.decision_feedback WHERE created_at > now() - interval '90 days') AS decision_feedback_90d,
  (SELECT COUNT(*)::integer FROM public.lifecycle_enrollments WHERE enrolled_at > now() - interval '90 days') AS lifecycle_enrollments_90d,
  (SELECT COUNT(*)::integer FROM public.referral_attributions WHERE first_touch_at > now() - interval '90 days') AS referral_attributions_90d,
  (SELECT COUNT(*)::integer FROM public.referral_codes) AS referral_codes_total,
  (SELECT COUNT(*)::integer FROM public.partner_endpoints WHERE is_active IS TRUE) AS partner_endpoints_active,
  (SELECT COUNT(*)::integer FROM public.partner_applications) AS partner_applications_total,
  now() AS snapshot_at;

REVOKE ALL ON public.moat_flywheel_snapshot FROM PUBLIC;

COMMENT ON VIEW public.moat_flywheel_snapshot IS
  'P3.6 composite flywheel counts for moat-health / investor snapshots';
