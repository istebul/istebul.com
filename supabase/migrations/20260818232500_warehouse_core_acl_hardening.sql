-- WarehouseIQ core / operations ACL hardening.
--
-- Forward-only security hardening.
--
-- Production audit demonstrated that these seven legacy WarehouseIQ
-- tables inherited direct privileges beyond their RLS-backed contract,
-- including TRUNCATE / REFERENCES / TRIGGER.
--
-- RLS does not protect TRUNCATE.
--
-- Security target:
--
--   anon
--     -> no direct table privileges
--
--   authenticated
--     -> only the DML operations already protected by explicit
--        authenticated RLS policies
--
-- No policy is changed here.
-- No application data is changed here.
-- No SECURITY DEFINER function grant is changed here.
-- No service-role privilege is introduced here.
--
-- ============================================================
-- warehouse_accounts
-- RLS contract: SELECT + UPDATE
-- ============================================================

revoke all on table public.warehouse_accounts from anon;
revoke all on table public.warehouse_accounts from authenticated;

grant select, update
  on table public.warehouse_accounts
  to authenticated;


-- ============================================================
-- warehouse_users
-- RLS contract: SELECT + INSERT + UPDATE + DELETE
-- ============================================================

revoke all on table public.warehouse_users from anon;
revoke all on table public.warehouse_users from authenticated;

grant select, insert, update, delete
  on table public.warehouse_users
  to authenticated;


-- ============================================================
-- warehouses
-- RLS contract: SELECT + INSERT + UPDATE + DELETE
-- ============================================================

revoke all on table public.warehouses from anon;
revoke all on table public.warehouses from authenticated;

grant select, insert, update, delete
  on table public.warehouses
  to authenticated;


-- ============================================================
-- warehouse_locations
-- RLS contract: SELECT + INSERT + UPDATE + DELETE
-- ============================================================

revoke all on table public.warehouse_locations from anon;
revoke all on table public.warehouse_locations from authenticated;

grant select, insert, update, delete
  on table public.warehouse_locations
  to authenticated;


-- ============================================================
-- warehouse_operations_dashboard_snapshots
-- RLS contract: SELECT + INSERT + DELETE
-- ============================================================

revoke all
  on table public.warehouse_operations_dashboard_snapshots
  from anon;

revoke all
  on table public.warehouse_operations_dashboard_snapshots
  from authenticated;

grant select, insert, delete
  on table public.warehouse_operations_dashboard_snapshots
  to authenticated;


-- ============================================================
-- warehouse_operations_exceptions
-- RLS contract: SELECT + INSERT + UPDATE + DELETE
-- ============================================================

revoke all
  on table public.warehouse_operations_exceptions
  from anon;

revoke all
  on table public.warehouse_operations_exceptions
  from authenticated;

grant select, insert, update, delete
  on table public.warehouse_operations_exceptions
  to authenticated;


-- ============================================================
-- warehouse_operations_process_volumes
-- RLS contract: SELECT + INSERT + UPDATE + DELETE
-- ============================================================

revoke all
  on table public.warehouse_operations_process_volumes
  from anon;

revoke all
  on table public.warehouse_operations_process_volumes
  from authenticated;

grant select, insert, update, delete
  on table public.warehouse_operations_process_volumes
  to authenticated;
