-- WarehouseIQ: align legacy RPC role allowlists with the Admin role model.
-- Idempotent: accepts the recognized legacy list or the intended final list.
-- Unexpected definitions fail closed.
--
-- packer: Packing RPCs
-- dispatcher: Shipping RPCs
-- driver: proof-of-delivery capture only
-- Module permissions and warehouse assignments are checked by DB triggers.

DO $migration$
DECLARE
  v_packing_names text[] := ARRAY[
    'warehouse_packing_write',
    'warehouse_packing_create_from_picking',
    'warehouse_packing_confirm_item_write',
    'warehouse_packing_seal_package_write',
    'warehouse_packing_generate_package_label_write',
    'warehouse_packing_label_write',
    'warehouse_packing_resolve_exception_write',
    'warehouse_packing_complete_write',
    'warehouse_packing_mark_shipping_ready_write',
    'warehouse_packing_cancel_write',
    'warehouse_packing_add_package_item_write',
    'warehouse_packing_generate_suggestions_write'
  ];

  v_shipping_names text[] := ARRAY[
    'warehouse_shipping_create_from_packing_write',
    'warehouse_shipping_start_loading_write',
    'warehouse_shipping_confirm_item_load_write',
    'warehouse_shipping_load_package_write',
    'warehouse_shipping_complete_loading_write',
    'warehouse_shipping_create_manifest_write',
    'warehouse_shipping_generate_manifest_write',
    'warehouse_shipping_approve_manifest_write',
    'warehouse_shipping_submit_manifest_write',
    'warehouse_shipping_create_asn_write',
    'warehouse_shipping_generate_asn_write',
    'warehouse_shipping_send_asn_write',
    'warehouse_shipping_acknowledge_asn_write',
    'warehouse_shipping_reject_asn_write',
    'warehouse_shipping_cancel_asn_write',
    'warehouse_shipping_dispatch_write',
    'warehouse_shipping_prepare_loading_write',
    'warehouse_shipping_accept_manifest_write',
    'warehouse_shipping_release_write',
    'warehouse_shipping_create_task_write',
    'warehouse_shipping_assign_carrier_vehicle_write',
    'warehouse_shipping_record_proof_of_delivery_write',
    'warehouse_shipping_create_exception_write',
    'warehouse_shipping_resolve_exception_write'
  ];

  v_legacy_roles_pattern text :=
    $pattern$'inventory_controller'\s*,\s*'picker'\s*,\s*'operator'$pattern$;

  v_packing_roles_pattern text :=
    $pattern$'inventory_controller'\s*,\s*'packer'\s*,\s*'picker'\s*,\s*'operator'$pattern$;

  v_dispatcher_roles_pattern text :=
    $pattern$'inventory_controller'\s*,\s*'dispatcher'\s*,\s*'picker'\s*,\s*'operator'$pattern$;

  v_driver_roles_pattern text :=
    $pattern$'inventory_controller'\s*,\s*'dispatcher'\s*,\s*'driver'\s*,\s*'picker'\s*,\s*'operator'$pattern$;

  v_function record;
  v_definition text;
  v_rewritten text;
  v_seen integer;
BEGIN
  -- Packing
  v_seen := 0;

  FOR v_function IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY(v_packing_names)
  LOOP
    v_definition := pg_get_functiondef(v_function.oid);

    IF v_definition ~* v_packing_roles_pattern THEN
      -- Already aligned; safe on repeated deployment.
      NULL;
    ELSIF v_definition ~* v_legacy_roles_pattern THEN
      v_rewritten := regexp_replace(
        v_definition,
        v_legacy_roles_pattern,
        '''inventory_controller'', ''packer'', ''picker'', ''operator''',
        'gi'
      );

      IF v_rewritten = v_definition
         OR v_rewritten !~* v_packing_roles_pattern THEN
        RAISE EXCEPTION
          'warehouse_rpc_role_alignment_no_packing_change: %',
          v_function.proname
          USING ERRCODE = '55000';
      END IF;

      EXECUTE v_rewritten;
    ELSE
      RAISE EXCEPTION
        'warehouse_rpc_role_alignment_expected_role_list_missing: %',
        v_function.proname
        USING ERRCODE = '55000';
    END IF;

    v_seen := v_seen + 1;
  END LOOP;

  IF v_seen <> cardinality(v_packing_names) THEN
    RAISE EXCEPTION
      'warehouse_rpc_role_alignment_packing_function_count_mismatch: expected %, found %',
      cardinality(v_packing_names), v_seen
      USING ERRCODE = '55000';
  END IF;

  -- Shipping. Drivers are added to proof-of-delivery only.
  v_seen := 0;

  FOR v_function IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname = ANY(v_shipping_names)
  LOOP
    v_definition := pg_get_functiondef(v_function.oid);

    IF v_function.proname = 'warehouse_shipping_record_proof_of_delivery_write' THEN
      IF v_definition ~* v_driver_roles_pattern THEN
        -- Already aligned.
        NULL;
      ELSIF v_definition ~* v_dispatcher_roles_pattern THEN
        v_rewritten := regexp_replace(
          v_definition,
          v_dispatcher_roles_pattern,
          '''inventory_controller'', ''dispatcher'', ''driver'', ''picker'', ''operator''',
          'gi'
        );

        IF v_rewritten = v_definition
           OR v_rewritten !~* v_driver_roles_pattern THEN
          RAISE EXCEPTION
            'warehouse_rpc_role_alignment_driver_anchor_missing: %',
            v_function.proname
            USING ERRCODE = '55000';
        END IF;

        EXECUTE v_rewritten;
      ELSIF v_definition ~* v_legacy_roles_pattern THEN
        v_rewritten := regexp_replace(
          v_definition,
          v_legacy_roles_pattern,
          '''inventory_controller'', ''dispatcher'', ''picker'', ''operator''',
          'gi'
        );

        IF v_rewritten = v_definition
           OR v_rewritten !~* v_dispatcher_roles_pattern THEN
          RAISE EXCEPTION
            'warehouse_rpc_role_alignment_no_shipping_change: %',
            v_function.proname
            USING ERRCODE = '55000';
        END IF;

        v_rewritten := regexp_replace(
          v_rewritten,
          v_dispatcher_roles_pattern,
          '''inventory_controller'', ''dispatcher'', ''driver'', ''picker'', ''operator''',
          'gi'
        );

        IF v_rewritten !~* v_driver_roles_pattern THEN
          RAISE EXCEPTION
            'warehouse_rpc_role_alignment_driver_anchor_missing: %',
            v_function.proname
            USING ERRCODE = '55000';
        END IF;

        EXECUTE v_rewritten;
      ELSE
        RAISE EXCEPTION
          'warehouse_rpc_role_alignment_expected_role_list_missing: %',
          v_function.proname
          USING ERRCODE = '55000';
      END IF;
    ELSE
      IF v_definition ~* v_dispatcher_roles_pattern THEN
        -- Already aligned.
        NULL;
      ELSIF v_definition ~* v_legacy_roles_pattern THEN
        v_rewritten := regexp_replace(
          v_definition,
          v_legacy_roles_pattern,
          '''inventory_controller'', ''dispatcher'', ''picker'', ''operator''',
          'gi'
        );

        IF v_rewritten = v_definition
           OR v_rewritten !~* v_dispatcher_roles_pattern THEN
          RAISE EXCEPTION
            'warehouse_rpc_role_alignment_no_shipping_change: %',
            v_function.proname
            USING ERRCODE = '55000';
        END IF;

        EXECUTE v_rewritten;
      ELSE
        RAISE EXCEPTION
          'warehouse_rpc_role_alignment_expected_role_list_missing: %',
          v_function.proname
          USING ERRCODE = '55000';
      END IF;
    END IF;

    v_seen := v_seen + 1;
  END LOOP;

  IF v_seen <> cardinality(v_shipping_names) THEN
    RAISE EXCEPTION
      'warehouse_rpc_role_alignment_shipping_function_count_mismatch: expected %, found %',
      cardinality(v_shipping_names), v_seen
      USING ERRCODE = '55000';
  END IF;
END;
$migration$;
