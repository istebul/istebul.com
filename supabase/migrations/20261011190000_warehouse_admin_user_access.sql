-- WarehouseIQ Admin: membership management, module permissions, warehouse assignments.
-- The three prerequisite migrations (audit/permissions/auth_email) are already
-- recorded in the target project's migration history and are intentionally not replayed.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.warehouse_users'::regclass
      AND conname = 'warehouse_users_account_id_id_unique'
  ) THEN
    ALTER TABLE public.warehouse_users
      ADD CONSTRAINT warehouse_users_account_id_id_unique UNIQUE (account_id, id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.warehouse_user_warehouse_assignments (
  account_id uuid NOT NULL,
  warehouse_user_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  assigned_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT warehouse_user_warehouse_assignments_pk
    PRIMARY KEY (account_id, warehouse_user_id, warehouse_id),
  CONSTRAINT warehouse_user_warehouse_assignments_membership_fk
    FOREIGN KEY (account_id, warehouse_user_id)
    REFERENCES public.warehouse_users(account_id, id) ON DELETE CASCADE,
  CONSTRAINT warehouse_user_warehouse_assignments_warehouse_fk
    FOREIGN KEY (account_id, warehouse_id)
    REFERENCES public.warehouses(account_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS warehouse_user_warehouse_assignments_user_idx
  ON public.warehouse_user_warehouse_assignments(account_id, warehouse_user_id);
CREATE INDEX IF NOT EXISTS warehouse_user_warehouse_assignments_warehouse_idx
  ON public.warehouse_user_warehouse_assignments(account_id, warehouse_id);
ALTER TABLE public.warehouse_user_warehouse_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.warehouse_user_warehouse_assignments FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.warehouse_user_warehouse_assignments TO authenticated;

DROP POLICY IF EXISTS warehouse_user_warehouse_assignments_select ON public.warehouse_user_warehouse_assignments;
CREATE POLICY warehouse_user_warehouse_assignments_select
  ON public.warehouse_user_warehouse_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.warehouse_users membership
      WHERE membership.id = warehouse_user_warehouse_assignments.warehouse_user_id
        AND membership.account_id = warehouse_user_warehouse_assignments.account_id
        AND membership.user_id = auth.uid()
        AND membership.status = 'active'
    )
    OR public.warehouse_has_account_role(
      warehouse_user_warehouse_assignments.account_id,
      ARRAY['admin'::text]
    )
  );
DROP POLICY IF EXISTS warehouse_user_warehouse_assignments_admin_insert ON public.warehouse_user_warehouse_assignments;
CREATE POLICY warehouse_user_warehouse_assignments_admin_insert
  ON public.warehouse_user_warehouse_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.warehouse_has_account_role(account_id, ARRAY['admin'::text])
  );
DROP POLICY IF EXISTS warehouse_user_warehouse_assignments_admin_delete ON public.warehouse_user_warehouse_assignments;
CREATE POLICY warehouse_user_warehouse_assignments_admin_delete
  ON public.warehouse_user_warehouse_assignments FOR DELETE TO authenticated
  USING (
    public.warehouse_has_account_role(account_id, ARRAY['admin'::text])
  );

-- Preserve current scope for every active membership at deployment time.
-- Admins can narrow this set later from the Admin UI.
INSERT INTO public.warehouse_user_warehouse_assignments
  (account_id, warehouse_user_id, warehouse_id, assigned_by)
SELECT membership.account_id, membership.id, warehouse.id, NULL
FROM public.warehouse_users membership
JOIN public.warehouses warehouse ON warehouse.account_id = membership.account_id
WHERE membership.status = 'active'
ON CONFLICT (account_id, warehouse_user_id, warehouse_id) DO NOTHING;

-- Seed reasonable least-privilege module access for existing active memberships.
-- Admins remain implicitly full-access through warehouse_has_account_permission().
INSERT INTO public.warehouse_user_permissions (warehouse_user_id, permission, created_by)
SELECT membership.id, mapped.permission, NULL
FROM public.warehouse_users membership
CROSS JOIN LATERAL unnest(
  CASE membership.role
    WHEN 'warehouse_manager' THEN ARRAY['receiving','putaway','picking','packing','shipping','cycle_count','quality_control']::text[]
    WHEN 'supervisor' THEN ARRAY['receiving','putaway','picking','packing','shipping','cycle_count','quality_control']::text[]
    WHEN 'inventory_controller' THEN ARRAY['receiving','putaway','picking','packing','shipping','cycle_count','quality_control']::text[]
    WHEN 'operator' THEN ARRAY['receiving','putaway','picking','packing','shipping','cycle_count','quality_control']::text[]
    WHEN 'receiver' THEN ARRAY['receiving']::text[]
    WHEN 'quality_controller' THEN ARRAY['quality_control']::text[]
    WHEN 'forklift_operator' THEN ARRAY['putaway']::text[]
    WHEN 'picker' THEN ARRAY['picking']::text[]
    WHEN 'packer' THEN ARRAY['packing']::text[]
    WHEN 'dispatcher' THEN ARRAY['shipping']::text[]
    WHEN 'driver' THEN ARRAY['shipping']::text[]
    ELSE ARRAY[]::text[]
  END
) AS mapped(permission)
WHERE membership.status = 'active'
  AND membership.role NOT IN ('admin', 'owner', 'viewer')
ON CONFLICT (warehouse_user_id, permission) DO NOTHING;

CREATE OR REPLACE FUNCTION public.warehouse_admin_validate_user_request(
  requested_account_id uuid,
  target_user_id uuid,
  target_role text,
  target_status text,
  requested_permissions text[],
  requested_warehouse_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_old_role text;
  v_old_status text;
  v_count integer;
  v_warehouse_ids uuid[] := coalesce(requested_warehouse_ids, ARRAY[]::uuid[]);
  v_permissions text[] := coalesce(requested_permissions, ARRAY[]::text[]);
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.warehouse_users membership
    WHERE membership.account_id = requested_account_id
      AND membership.user_id = auth.uid()
      AND membership.status = 'active'
      AND membership.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'warehouse_admin_required' USING ERRCODE = '42501';
  END IF;

  IF target_role IS NULL OR target_role NOT IN (
    'admin', 'warehouse_manager', 'supervisor', 'inventory_controller',
    'receiver', 'quality_controller', 'forklift_operator', 'picker',
    'packer', 'dispatcher', 'driver', 'operator', 'viewer'
  ) THEN
    RAISE EXCEPTION 'warehouse_user_role_invalid' USING ERRCODE = '22023';
  END IF;
  -- `owner` is deliberately omitted from the assignable role list.
  IF target_status IS NULL OR target_status NOT IN ('invited', 'active', 'suspended', 'inactive') THEN
    RAISE EXCEPTION 'warehouse_user_status_invalid' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_permissions) AS item(permission)
    WHERE item.permission IS NULL OR item.permission NOT IN (
      'receiving', 'putaway', 'picking', 'packing', 'shipping', 'cycle_count', 'quality_control'
    )
  ) THEN
    RAISE EXCEPTION 'warehouse_user_permission_invalid' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_permissions) <> (SELECT count(DISTINCT item.permission) FROM unnest(v_permissions) AS item(permission)) THEN
    RAISE EXCEPTION 'warehouse_user_permission_duplicate' USING ERRCODE = '22023';
  END IF;
  IF cardinality(v_warehouse_ids) <> (SELECT count(DISTINCT item.warehouse_id) FROM unnest(v_warehouse_ids) AS item(warehouse_id)) THEN
    RAISE EXCEPTION 'warehouse_assignment_duplicate' USING ERRCODE = '22023';
  END IF;
  SELECT count(DISTINCT warehouse.id) INTO v_count
  FROM public.warehouses warehouse
  WHERE warehouse.account_id = requested_account_id
    AND warehouse.id = ANY(v_warehouse_ids);
  IF v_count <> cardinality(v_warehouse_ids) THEN
    RAISE EXCEPTION 'warehouse_assignment_out_of_account' USING ERRCODE = '22023';
  END IF;

  IF target_user_id IS NOT NULL THEN
    SELECT membership.role, membership.status
      INTO v_old_role, v_old_status
    FROM public.warehouse_users membership
    WHERE membership.account_id = requested_account_id
      AND membership.user_id = target_user_id;

    IF NOT FOUND AND target_status <> 'invited' THEN
      RAISE EXCEPTION 'warehouse_user_not_found' USING ERRCODE = 'P0002';
    END IF;

    IF FOUND AND target_user_id = auth.uid()
       AND (target_role <> 'admin' OR target_status <> 'active') THEN
      RAISE EXCEPTION 'warehouse_admin_cannot_disable_self' USING ERRCODE = '42501';
    END IF;

    IF FOUND AND v_old_role = 'admin' AND v_old_status = 'active'
       AND (target_role <> 'admin' OR target_status <> 'active') THEN
      SELECT count(*) INTO v_count
      FROM public.warehouse_users other_admin
      WHERE other_admin.account_id = requested_account_id
        AND other_admin.status = 'active'
        AND other_admin.role = 'admin'
        AND other_admin.user_id <> target_user_id;
      IF v_count = 0 THEN
        RAISE EXCEPTION 'warehouse_last_active_admin' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.warehouse_admin_list_users(
  requested_account_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_users jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.warehouse_users membership
    WHERE membership.account_id = requested_account_id
      AND membership.user_id = auth.uid()
      AND membership.status = 'active'
      AND membership.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'warehouse_admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', membership.id,
      'user_id', membership.user_id,
      'auth_email', membership.auth_email,
      'display_name', membership.display_name,
      'username', membership.username,
      'role', membership.role,
      'status', membership.status,
      'must_change_password', membership.must_change_password,
      'created_at', membership.created_at,
      'permissions', coalesce((
        SELECT jsonb_agg(permission.permission ORDER BY permission.permission)
        FROM public.warehouse_user_permissions permission
        WHERE permission.warehouse_user_id = membership.id
      ), '[]'::jsonb),
      'warehouse_ids', coalesce((
        SELECT jsonb_agg(assignment.warehouse_id ORDER BY assignment.warehouse_id)
        FROM public.warehouse_user_warehouse_assignments assignment
        WHERE assignment.account_id = membership.account_id
          AND assignment.warehouse_user_id = membership.id
      ), '[]'::jsonb)
    ) ORDER BY membership.created_at DESC
  ), '[]'::jsonb)
  INTO v_users
  FROM public.warehouse_users membership
  WHERE membership.account_id = requested_account_id;

  RETURN jsonb_build_object('ok', true, 'users', v_users);
END;
$function$;

-- One-time safe migration path for the signed-in legacy owner themselves.
-- It cannot change any other member and does not make `owner` an assignable role.
CREATE OR REPLACE FUNCTION public.warehouse_admin_convert_own_legacy_owner(
  requested_account_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_membership_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'warehouse_admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT membership.id INTO v_membership_id
  FROM public.warehouse_users membership
  WHERE membership.account_id = requested_account_id
    AND membership.user_id = auth.uid()
    AND membership.status = 'active'
    AND membership.role = 'owner'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'warehouse_legacy_owner_required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.warehouse_users
  SET role = 'admin', updated_at = now()
  WHERE id = v_membership_id
    AND account_id = requested_account_id;

  RETURN jsonb_build_object('ok', true, 'role', 'admin');
END;
$function$;

CREATE OR REPLACE FUNCTION public.warehouse_admin_upsert_user(
  requested_account_id uuid,
  target_user_id uuid,
  target_email text,
  target_display_name text,
  target_role text,
  target_status text,
  requested_permissions text[],
  requested_warehouse_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_membership public.warehouse_users%ROWTYPE;
  v_old_permissions text[];
  v_new_permissions text[] := coalesce(requested_permissions, ARRAY[]::text[]);
  v_old_warehouses uuid[];
  v_new_warehouses uuid[] := coalesce(requested_warehouse_ids, ARRAY[]::uuid[]);
  v_email text := nullif(lower(btrim(target_email)), '');
  v_display_name text := nullif(btrim(target_display_name), '');
BEGIN
  IF requested_account_id IS NULL OR target_user_id IS NULL THEN
    RAISE EXCEPTION 'warehouse_user_identity_required' USING ERRCODE = '22023';
  END IF;

  -- Serialize admin changes per account so two requests cannot disable the final admin.
  PERFORM pg_advisory_xact_lock(hashtextextended(requested_account_id::text, 0));
  PERFORM public.warehouse_admin_validate_user_request(
    requested_account_id, target_user_id, target_role, target_status,
    v_new_permissions, v_new_warehouses
  );

  SELECT membership.* INTO v_membership
  FROM public.warehouse_users membership
  WHERE membership.account_id = requested_account_id
    AND membership.user_id = target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF v_email IS NULL THEN
      RAISE EXCEPTION 'warehouse_user_email_required' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.warehouse_users (
      account_id, user_id, role, status, invited_by,
      auth_email, display_name, updated_at
    ) VALUES (
      requested_account_id, target_user_id, target_role, target_status,
      auth.uid(), v_email, v_display_name, now()
    ) RETURNING * INTO v_membership;
  ELSE
    UPDATE public.warehouse_users membership
    SET role = target_role,
        status = target_status,
        auth_email = coalesce(v_email, membership.auth_email),
        display_name = CASE
          WHEN target_display_name IS NULL THEN membership.display_name
          ELSE v_display_name
        END,
        updated_at = now()
    WHERE membership.id = v_membership.id
    RETURNING * INTO v_membership;
  END IF;

  SELECT coalesce(array_agg(permission.permission ORDER BY permission.permission), ARRAY[]::text[])
    INTO v_old_permissions
  FROM public.warehouse_user_permissions permission
  WHERE permission.warehouse_user_id = v_membership.id;

  SELECT coalesce(array_agg(assignment.warehouse_id ORDER BY assignment.warehouse_id), ARRAY[]::uuid[])
    INTO v_old_warehouses
  FROM public.warehouse_user_warehouse_assignments assignment
  WHERE assignment.account_id = requested_account_id
    AND assignment.warehouse_user_id = v_membership.id;

  DELETE FROM public.warehouse_user_permissions permission
  WHERE permission.warehouse_user_id = v_membership.id;
  IF target_role <> 'admin' THEN
    INSERT INTO public.warehouse_user_permissions (warehouse_user_id, permission, created_by)
    SELECT v_membership.id, p, auth.uid()
    FROM unnest(v_new_permissions) AS p;
  END IF;

  DELETE FROM public.warehouse_user_warehouse_assignments assignment
  WHERE assignment.account_id = requested_account_id
    AND assignment.warehouse_user_id = v_membership.id;
  INSERT INTO public.warehouse_user_warehouse_assignments (
    account_id, warehouse_user_id, warehouse_id, assigned_by
  )
  SELECT requested_account_id, v_membership.id, w, auth.uid()
  FROM unnest(v_new_warehouses) AS w;

  SELECT coalesce(array_agg(permission.permission ORDER BY permission.permission), ARRAY[]::text[])
    INTO v_new_permissions
  FROM public.warehouse_user_permissions permission
  WHERE permission.warehouse_user_id = v_membership.id;
  SELECT coalesce(array_agg(assignment.warehouse_id ORDER BY assignment.warehouse_id), ARRAY[]::uuid[])
    INTO v_new_warehouses
  FROM public.warehouse_user_warehouse_assignments assignment
  WHERE assignment.account_id = requested_account_id
    AND assignment.warehouse_user_id = v_membership.id;

  IF v_old_permissions IS DISTINCT FROM v_new_permissions THEN
    INSERT INTO public.warehouse_audit_logs (
      account_id, actor_id, actor_role, target_user_id, action,
      entity_type, entity_id, summary, metadata
    ) VALUES (
      requested_account_id, auth.uid(), 'admin', target_user_id,
      'user_permissions_changed', 'warehouse_user', v_membership.id,
      'WarehouseIQ modül izinleri güncellendi.',
      jsonb_build_object('permissions', to_jsonb(v_new_permissions))
    );
  END IF;
  IF v_old_warehouses IS DISTINCT FROM v_new_warehouses THEN
    INSERT INTO public.warehouse_audit_logs (
      account_id, actor_id, actor_role, target_user_id, action,
      entity_type, entity_id, summary, metadata
    ) VALUES (
      requested_account_id, auth.uid(), 'admin', target_user_id,
      'user_warehouse_assignments_changed', 'warehouse_user', v_membership.id,
      'WarehouseIQ depo erişimleri güncellendi.',
      jsonb_build_object('warehouse_ids', to_jsonb(v_new_warehouses))
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'user', jsonb_build_object(
      'id', v_membership.id,
      'user_id', v_membership.user_id,
      'auth_email', v_membership.auth_email,
      'display_name', v_membership.display_name,
      'role', v_membership.role,
      'status', v_membership.status,
      'permissions', to_jsonb(v_new_permissions),
      'warehouse_ids', to_jsonb(v_new_warehouses)
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.warehouse_admin_validate_user_request(uuid, uuid, text, text, text[], uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.warehouse_admin_list_users(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.warehouse_admin_upsert_user(uuid, uuid, text, text, text, text, text[], uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.warehouse_admin_convert_own_legacy_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.warehouse_admin_validate_user_request(uuid, uuid, text, text, text[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.warehouse_admin_list_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.warehouse_admin_upsert_user(uuid, uuid, text, text, text, text, text[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.warehouse_admin_convert_own_legacy_owner(uuid) TO authenticated;
