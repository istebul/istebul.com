-- WarehouseIQ A8 Packing
-- Forward-only ACL hardening.
--
-- Security invariant:
-- authenticated / anon callers must never mutate Packing tables directly.
-- All Packing mutations must pass through the authenticated SECURITY DEFINER RPC layer.
--
-- Supabase/PostgreSQL default table privileges may grant privileges beyond
-- INSERT / UPDATE / DELETE (including TRUNCATE). Therefore this migration
-- resets the direct table ACL to an explicit fail-closed state:
--
--   anon          -> no direct table privileges
--   authenticated -> SELECT only
--
-- Existing SECURITY DEFINER Packing RPC execution grants are intentionally
-- unchanged.

revoke all on table public.warehouse_packings from anon;
revoke all on table public.warehouse_packings from authenticated;
grant select on table public.warehouse_packings to authenticated;

revoke all on table public.warehouse_packing_items from anon;
revoke all on table public.warehouse_packing_items from authenticated;
grant select on table public.warehouse_packing_items to authenticated;

revoke all on table public.warehouse_packing_containers from anon;
revoke all on table public.warehouse_packing_containers from authenticated;
grant select on table public.warehouse_packing_containers to authenticated;

revoke all on table public.warehouse_packing_packages from anon;
revoke all on table public.warehouse_packing_packages from authenticated;
grant select on table public.warehouse_packing_packages to authenticated;

revoke all on table public.warehouse_packing_package_items from anon;
revoke all on table public.warehouse_packing_package_items from authenticated;
grant select on table public.warehouse_packing_package_items to authenticated;

revoke all on table public.warehouse_packing_labels from anon;
revoke all on table public.warehouse_packing_labels from authenticated;
grant select on table public.warehouse_packing_labels to authenticated;

revoke all on table public.warehouse_packing_suggestions from anon;
revoke all on table public.warehouse_packing_suggestions from authenticated;
grant select on table public.warehouse_packing_suggestions to authenticated;

revoke all on table public.warehouse_packing_tasks from anon;
revoke all on table public.warehouse_packing_tasks from authenticated;
grant select on table public.warehouse_packing_tasks to authenticated;

revoke all on table public.warehouse_packing_exceptions from anon;
revoke all on table public.warehouse_packing_exceptions from authenticated;
grant select on table public.warehouse_packing_exceptions to authenticated;

revoke all on table public.warehouse_packing_write_requests from anon;
revoke all on table public.warehouse_packing_write_requests from authenticated;
grant select on table public.warehouse_packing_write_requests to authenticated;
