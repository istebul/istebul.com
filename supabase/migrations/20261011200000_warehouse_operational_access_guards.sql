-- WarehouseIQ operational write guard (phase 2).
-- Requires 20261011190000_warehouse_admin_user_access.sql first.
-- Adds DB-level guard rails to operational row writes, including writes made
-- inside SECURITY DEFINER RPCs. This migration does not alter live data rows.

CREATE OR REPLACE FUNCTION public.warehouse_has_warehouse_permission(
  requested_account_id uuid,
  requested_warehouse_id uuid,
  required_permissions text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT COALESCE(
    auth.uid() IS NOT NULL
    AND requested_account_id IS NOT NULL
    AND requested_warehouse_id IS NOT NULL
    AND cardinality(COALESCE(required_permissions, ARRAY[]::text[])) > 0
    AND EXISTS (
      SELECT 1
      FROM public.warehouse_users membership
      JOIN public.warehouses warehouse
        ON warehouse.account_id = membership.account_id
       AND warehouse.id = requested_warehouse_id
      WHERE membership.account_id = requested_account_id
        AND membership.user_id = auth.uid()
        AND membership.status = 'active'
        AND (
          -- `owner` is retained only for legacy compatibility. It is not an
          -- assignable role in the Admin API; use the own-account conversion.
          membership.role IN ('admin', 'owner')
          OR (
            EXISTS (
              SELECT 1
              FROM public.warehouse_user_warehouse_assignments assignment
              WHERE assignment.account_id = membership.account_id
                AND assignment.warehouse_user_id = membership.id
                AND assignment.warehouse_id = requested_warehouse_id
            )
            AND EXISTS (
              SELECT 1
              FROM public.warehouse_user_permissions permission
              WHERE permission.warehouse_user_id = membership.id
                AND permission.permission = ANY(required_permissions)
            )
          )
        )
    ),
    false
  );
$function$;

REVOKE ALL ON FUNCTION public.warehouse_has_warehouse_permission(uuid, uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.warehouse_has_warehouse_permission(uuid, uuid, text[]) TO authenticated, service_role;

-- Resolve the owning warehouse for child records whose schema intentionally
-- stores only a parent operation id rather than duplicating warehouse_id.

CREATE OR REPLACE FUNCTION public.warehouse_resolve_operational_warehouse(
  requested_account_id uuid,
  source_table text,
  source_row jsonb
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_warehouse_id uuid;
  v_parent_warehouse_id uuid;
  v_parent_id uuid;
  v_parent_keys text[] := ARRAY[]::text[];
  v_parent_tables text[] := ARRAY[]::text[];
  v_location_keys text[] := ARRAY[
    'location_id',
    'source_location_id',
    'destination_location_id',
    'receiving_location_id',
    'target_location_id',
    'start_location_id',
    'end_location_id',
    'packing_location_id',
    'shipping_location_id'
  ]::text[];
  v_key text;
  v_i integer;
  v_item jsonb;
  v_picking_id uuid;
BEGIN
  IF requested_account_id IS NULL OR source_row IS NULL THEN
    RETURN NULL;
  END IF;

  v_warehouse_id :=
    NULLIF(BTRIM(source_row ->> 'warehouse_id'), '')::uuid;

  -- Ana kayıtların ilişkili olduğu üst kayıtlar.
  IF source_table = 'warehouse_putaways' THEN
    v_parent_keys := ARRAY['receiving_id', 'quality_inspection_id'];
    v_parent_tables := ARRAY[
      'warehouse_receivings', 'warehouse_quality_inspections'
    ];
  ELSIF source_table = 'warehouse_quality_inspections' THEN
    v_parent_keys := ARRAY['receiving_id'];
    v_parent_tables := ARRAY['warehouse_receivings'];
  ELSIF source_table = 'warehouse_pickings' THEN
    v_parent_keys := ARRAY['wave_id', 'batch_id'];
    v_parent_tables := ARRAY[
      'warehouse_picking_waves', 'warehouse_picking_batches'
    ];
  ELSIF source_table = 'warehouse_packings' THEN
    v_parent_keys := ARRAY['picking_id'];
    v_parent_tables := ARRAY['warehouse_pickings'];
  ELSIF source_table = 'warehouse_shippings' THEN
    v_parent_keys := ARRAY['packing_id'];
    v_parent_tables := ARRAY['warehouse_packings'];

  -- Depo kimliğini üst işlemden alan alt kayıtlar.
  ELSIF source_table LIKE 'warehouse_receiving_%' THEN
    v_parent_keys := ARRAY['receiving_id'];
    v_parent_tables := ARRAY['warehouse_receivings'];
  ELSIF source_table LIKE 'warehouse_putaway_%' THEN
    v_parent_keys := ARRAY['putaway_id'];
    v_parent_tables := ARRAY['warehouse_putaways'];
  ELSIF source_table LIKE 'warehouse_picking_%' THEN
    v_parent_keys := ARRAY['picking_id'];
    v_parent_tables := ARRAY['warehouse_pickings'];
  ELSIF source_table LIKE 'warehouse_packing_%' THEN
    v_parent_keys := ARRAY['packing_id'];
    v_parent_tables := ARRAY['warehouse_packings'];
  ELSIF source_table LIKE 'warehouse_shipping_%' THEN
    v_parent_keys := ARRAY['shipping_id'];
    v_parent_tables := ARRAY['warehouse_shippings'];
  ELSIF source_table LIKE 'warehouse_cycle_count_%' THEN
    v_parent_keys := ARRAY['cycle_count_id'];
    v_parent_tables := ARRAY['warehouse_cycle_counts'];
  ELSIF source_table LIKE 'warehouse_quality_%' THEN
    v_parent_keys := ARRAY['inspection_id'];
    v_parent_tables := ARRAY['warehouse_quality_inspections'];
  END IF;

  -- Alt paketleme kayıtlarında ayrıca varsa picking ilişkisini denetle.
  IF source_table LIKE 'warehouse_packing_%'
     AND NULLIF(BTRIM(source_row ->> 'picking_id'), '') IS NOT NULL THEN
    v_parent_keys := v_parent_keys || ARRAY['picking_id'];
    v_parent_tables := v_parent_tables || ARRAY['warehouse_pickings'];
  END IF;

  -- Sevkiyat alt kaydında ayrıca varsa packing ilişkisini denetle.
  IF source_table LIKE 'warehouse_shipping_%'
     AND NULLIF(BTRIM(source_row ->> 'packing_id'), '') IS NOT NULL THEN
    v_parent_keys := v_parent_keys || ARRAY['packing_id'];
    v_parent_tables := v_parent_tables || ARRAY['warehouse_packings'];
  END IF;

  -- Kalite alt kaydında ayrıca varsa receiving ilişkisini denetle.
  IF source_table LIKE 'warehouse_quality_%'
     AND source_table <> 'warehouse_quality_inspections'
     AND NULLIF(BTRIM(source_row ->> 'receiving_id'), '') IS NOT NULL THEN
    v_parent_keys := v_parent_keys || ARRAY['receiving_id'];
    v_parent_tables := v_parent_tables || ARRAY['warehouse_receivings'];
  END IF;

  -- Doğrudan warehouse_id olsa bile üst kayıtla karşılaştır.
  IF COALESCE(array_length(v_parent_keys, 1), 0) > 0 THEN
    FOR v_i IN 1..array_length(v_parent_keys, 1) LOOP
      v_parent_id :=
        NULLIF(BTRIM(source_row ->> v_parent_keys[v_i]), '')::uuid;

      IF v_parent_id IS NULL THEN
        CONTINUE;
      END IF;

      v_parent_warehouse_id := NULL;

      EXECUTE format(
        'SELECT warehouse_id
           FROM public.%I
          WHERE account_id = $1
            AND id = $2',
        v_parent_tables[v_i]
      )
      INTO v_parent_warehouse_id
      USING requested_account_id, v_parent_id;

      -- Üst kayıt bulunamazsa veya depo uyuşmazsa işlemi reddet.
      IF v_parent_warehouse_id IS NULL THEN
        RETURN NULL;
      END IF;

      IF v_warehouse_id IS NOT NULL
         AND v_warehouse_id IS DISTINCT FROM v_parent_warehouse_id THEN
        RETURN NULL;
      END IF;

      v_warehouse_id := COALESCE(v_warehouse_id, v_parent_warehouse_id);
    END LOOP;
  END IF;


  -- Approval adjustments must match the same account, count, and warehouse.
  IF source_table = 'warehouse_cycle_count_approvals' THEN
    v_parent_id :=
      NULLIF(BTRIM(source_row ->> 'adjustment_id'), '')::uuid;

    IF v_parent_id IS NOT NULL THEN
      IF NULLIF(BTRIM(source_row ->> 'cycle_count_id'), '') IS NULL THEN
        RETURN NULL;
      END IF;

      v_parent_warehouse_id := NULL;

      SELECT adjustment.warehouse_id
        INTO v_parent_warehouse_id
      FROM public.warehouse_cycle_count_adjustments adjustment
      WHERE adjustment.account_id = requested_account_id
        AND adjustment.id = v_parent_id
        AND adjustment.cycle_count_id =
          NULLIF(BTRIM(source_row ->> 'cycle_count_id'), '')::uuid;

      IF v_parent_warehouse_id IS NULL
         OR v_parent_warehouse_id IS DISTINCT FROM v_warehouse_id THEN
        RETURN NULL;
      END IF;
    END IF;
  END IF;

  -- Dalga ve parti içindeki her picking aynı depo/firma kapsamında olmalı.
  IF source_table IN (
    'warehouse_picking_waves',
    'warehouse_picking_batches'
  ) THEN
    IF COALESCE(jsonb_typeof(source_row -> 'picking_ids'), '') <> 'array'
       OR v_warehouse_id IS NULL THEN
      RETURN NULL;
    END IF;

    FOR v_item IN
      SELECT value
      FROM jsonb_array_elements(source_row -> 'picking_ids') AS item(value)
    LOOP
      v_picking_id := NULLIF(v_item #>> '{}', '')::uuid;

      IF v_picking_id IS NULL THEN
        RETURN NULL;
      END IF;

      v_parent_warehouse_id := NULL;

      SELECT picking.warehouse_id
        INTO v_parent_warehouse_id
      FROM public.warehouse_pickings picking
      WHERE picking.account_id = requested_account_id
        AND picking.id = v_picking_id;

      IF v_parent_warehouse_id IS NULL
         OR v_parent_warehouse_id IS DISTINCT FROM v_warehouse_id THEN
        RETURN NULL;
      END IF;
    END LOOP;
  END IF;

  -- Konum referansları da aynı depoya ait olmalı.
  FOREACH v_key IN ARRAY v_location_keys LOOP
    v_parent_id := NULLIF(BTRIM(source_row ->> v_key), '')::uuid;

    IF v_parent_id IS NULL THEN
      CONTINUE;
    END IF;

    v_parent_warehouse_id := NULL;

    SELECT location.warehouse_id
      INTO v_parent_warehouse_id
    FROM public.warehouse_locations location
    WHERE location.account_id = requested_account_id
      AND location.id = v_parent_id;

    IF v_parent_warehouse_id IS NULL
       OR v_parent_warehouse_id IS DISTINCT FROM v_warehouse_id THEN
      RETURN NULL;
    END IF;
  END LOOP;


  -- Rıhtım referansları da aynı firma ve depoya ait olmalı.
  v_parent_id := NULLIF(BTRIM(source_row ->> 'dock_id'), '')::uuid;

  IF v_parent_id IS NOT NULL THEN
    v_parent_warehouse_id := NULL;

    SELECT dock.warehouse_id
      INTO v_parent_warehouse_id
    FROM public.warehouse_shipping_docks dock
    WHERE dock.account_id = requested_account_id
      AND dock.id = v_parent_id;

    IF v_parent_warehouse_id IS NULL
       OR v_parent_warehouse_id IS DISTINCT FROM v_warehouse_id THEN
      RETURN NULL;
    END IF;
  END IF;

  RETURN v_warehouse_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.warehouse_resolve_operational_warehouse(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.warehouse_operational_permissions_for_table(
  source_table text
)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT CASE
    WHEN source_table = 'warehouse_receivings'
      OR source_table LIKE 'warehouse_receiving_%'
      THEN ARRAY['receiving']::text[]

    WHEN source_table = 'warehouse_putaways'
      OR source_table LIKE 'warehouse_putaway_%'
      THEN ARRAY['putaway']::text[]

    WHEN source_table = 'warehouse_pickings'
      OR source_table LIKE 'warehouse_picking_%'
      THEN ARRAY['picking']::text[]

    WHEN source_table = 'warehouse_packings'
      OR source_table LIKE 'warehouse_packing_%'
      THEN ARRAY['packing']::text[]

    WHEN source_table = 'warehouse_shippings'
      OR source_table LIKE 'warehouse_shipping_%'
      THEN ARRAY['shipping']::text[]

    WHEN source_table = 'warehouse_cycle_counts'
      OR source_table LIKE 'warehouse_cycle_count_%'
      THEN ARRAY['cycle_count']::text[]

    WHEN source_table LIKE 'warehouse_quality_%'
      THEN ARRAY['quality_control']::text[]

    ELSE ARRAY[]::text[]
  END;
$function$;

REVOKE ALL ON FUNCTION public.warehouse_operational_permissions_for_table(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.warehouse_enforce_operational_write_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_old_row jsonb;
  v_new_row jsonb;
  v_old_account_id uuid;
  v_new_account_id uuid;
  v_old_warehouse_id uuid;
  v_new_warehouse_id uuid;
  v_permissions text[];
BEGIN
  -- Trusted server-side integration jobs may use the service-role JWT. The
  -- service key must never be sent to a browser or handheld device.
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  v_permissions := public.warehouse_operational_permissions_for_table(TG_TABLE_NAME);
  IF cardinality(COALESCE(v_permissions, ARRAY[]::text[])) = 0 THEN
    RAISE EXCEPTION 'warehouse_access_guard_unmapped_table'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_row := to_jsonb(OLD);
    v_old_account_id := NULLIF(BTRIM(v_old_row ->> 'account_id'), '')::uuid;
    v_old_warehouse_id := public.warehouse_resolve_operational_warehouse(
      v_old_account_id, TG_TABLE_NAME, v_old_row
    );

    IF v_old_account_id IS NULL OR v_old_warehouse_id IS NULL
       OR NOT public.warehouse_has_warehouse_permission(
         v_old_account_id, v_old_warehouse_id, v_permissions
       ) THEN
      RAISE EXCEPTION 'warehouse_assignment_or_module_permission_required'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new_row := to_jsonb(NEW);
    v_new_account_id := NULLIF(BTRIM(v_new_row ->> 'account_id'), '')::uuid;
    v_new_warehouse_id := public.warehouse_resolve_operational_warehouse(
      v_new_account_id, TG_TABLE_NAME, v_new_row
    );

    IF v_new_account_id IS NULL OR v_new_warehouse_id IS NULL
       OR NOT public.warehouse_has_warehouse_permission(
         v_new_account_id, v_new_warehouse_id, v_permissions
       ) THEN
      RAISE EXCEPTION 'warehouse_assignment_or_module_permission_required'
        USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'UPDATE'
       AND (v_old_account_id IS DISTINCT FROM v_new_account_id
         OR v_old_warehouse_id IS DISTINCT FROM v_new_warehouse_id) THEN
      RAISE EXCEPTION 'warehouse_operational_scope_immutable'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.warehouse_enforce_operational_write_access() FROM PUBLIC, anon, authenticated;

-- Core operational records and their warehouse-scoped children. Internal
-- idempotency/write-request tables and account-wide catalogs are deliberately
-- excluded; the operation transaction is rolled back if its guarded data write
-- fails. Scheduled runtime tables are excluded to avoid blocking service jobs.
DO $function$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'warehouse_receivings', 'warehouse_receiving_items',
    'warehouse_receiving_documents', 'warehouse_receiving_tasks',
    'warehouse_putaways', 'warehouse_putaway_items',
    'warehouse_putaway_suggestions', 'warehouse_putaway_exceptions', 'warehouse_putaway_tasks',
    'warehouse_pickings', 'warehouse_picking_items', 'warehouse_picking_tasks',
    'warehouse_picking_waves', 'warehouse_picking_batches', 'warehouse_picking_routes',
    'warehouse_picking_exceptions', 'warehouse_picking_suggestions',
    'warehouse_packings', 'warehouse_packing_items', 'warehouse_packing_tasks',
    'warehouse_packing_exceptions', 'warehouse_packing_packages',
    'warehouse_packing_package_items', 'warehouse_packing_labels', 'warehouse_packing_suggestions',
    'warehouse_shippings', 'warehouse_shipping_items', 'warehouse_shipping_tasks',
    'warehouse_shipping_docks', 'warehouse_shipping_exceptions', 'warehouse_shipping_manifests',
    'warehouse_shipping_packages', 'warehouse_shipping_asns',
    'warehouse_shipping_proofs_of_delivery', 'warehouse_shipping_suggestions',
    'warehouse_shipping_tracking_events',
    'warehouse_cycle_counts', 'warehouse_cycle_count_items', 'warehouse_cycle_count_tasks',
    'warehouse_cycle_count_exceptions', 'warehouse_cycle_count_adjustments',
    'warehouse_cycle_count_results', 'warehouse_cycle_count_approvals', 'warehouse_cycle_count_reports',
    'warehouse_quality_inspections', 'warehouse_quality_inspection_items',
    'warehouse_quality_documents', 'warehouse_quality_exceptions',
    'warehouse_quality_samples', 'warehouse_quality_tasks'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      RAISE NOTICE 'WarehouseIQ access guard skipped missing table: %', v_table;
      CONTINUE;
    END IF;

    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_warehouse_operational_access_guard ON public.%I',
      v_table
    );
    EXECUTE format(
      'CREATE TRIGGER trg_warehouse_operational_access_guard '
      'BEFORE INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.warehouse_enforce_operational_write_access()',
      v_table
    );
  END LOOP;
END;
$function$;
