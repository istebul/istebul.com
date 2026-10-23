-- WarehouseIQ kullanıcı adı + modül yetkileri altyapısı.
-- Mevcut warehouse_users üyelikleri korunur.
-- Parola bu şemada kesinlikle tutulmaz.

ALTER TABLE public.warehouse_users
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'warehouse_users_username_format'
      AND conrelid = 'public.warehouse_users'::regclass
  ) THEN
    ALTER TABLE public.warehouse_users
      ADD CONSTRAINT warehouse_users_username_format
      CHECK (
        username IS NULL
        OR (
          username = lower(username)
          AND username ~ '^[a-z0-9][a-z0-9._-]{2,63}$'
        )
      );
  END IF;
END
$$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'warehouse_users_display_name_length'
      AND conrelid = 'public.warehouse_users'::regclass
  ) THEN
    ALTER TABLE public.warehouse_users
      ADD CONSTRAINT warehouse_users_display_name_length
      CHECK (
        display_name IS NULL
        OR char_length(display_name) <= 120
      );
  END IF;
END
$$;
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_users_username_unique
  ON public.warehouse_users (lower(username))
  WHERE username IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.warehouse_user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_user_id uuid NOT NULL
    REFERENCES public.warehouse_users(id)
    ON DELETE CASCADE,
  permission text NOT NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT warehouse_user_permissions_unique
    UNIQUE (warehouse_user_id, permission),

  CONSTRAINT warehouse_user_permissions_permission_check
    CHECK (
      permission = ANY (
        ARRAY[
          'receiving',
          'putaway',
          'picking',
          'packing',
          'shipping',
          'cycle_count',
          'quality_control'
        ]::text[]
      )
    )
);
CREATE INDEX IF NOT EXISTS warehouse_user_permissions_user_idx
  ON public.warehouse_user_permissions (warehouse_user_id);
CREATE INDEX IF NOT EXISTS warehouse_user_permissions_permission_idx
  ON public.warehouse_user_permissions (permission);
ALTER TABLE public.warehouse_user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS warehouse_user_permissions_member_select
  ON public.warehouse_user_permissions;
CREATE POLICY warehouse_user_permissions_member_select
  ON public.warehouse_user_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.warehouse_users membership
      WHERE membership.id = warehouse_user_permissions.warehouse_user_id
        AND (
          membership.user_id = auth.uid()
          OR public.warehouse_has_account_role(
            membership.account_id,
            ARRAY['owner'::text, 'admin'::text]
          )
        )
    )
  );
DROP POLICY IF EXISTS warehouse_user_permissions_manager_insert
  ON public.warehouse_user_permissions;
CREATE POLICY warehouse_user_permissions_manager_insert
  ON public.warehouse_user_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.warehouse_users membership
      WHERE membership.id = warehouse_user_permissions.warehouse_user_id
        AND public.warehouse_has_account_role(
          membership.account_id,
          ARRAY['owner'::text, 'admin'::text]
        )
    )
  );
DROP POLICY IF EXISTS warehouse_user_permissions_manager_update
  ON public.warehouse_user_permissions;
CREATE POLICY warehouse_user_permissions_manager_update
  ON public.warehouse_user_permissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.warehouse_users membership
      WHERE membership.id = warehouse_user_permissions.warehouse_user_id
        AND public.warehouse_has_account_role(
          membership.account_id,
          ARRAY['owner'::text, 'admin'::text]
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.warehouse_users membership
      WHERE membership.id = warehouse_user_permissions.warehouse_user_id
        AND public.warehouse_has_account_role(
          membership.account_id,
          ARRAY['owner'::text, 'admin'::text]
        )
    )
  );
DROP POLICY IF EXISTS warehouse_user_permissions_manager_delete
  ON public.warehouse_user_permissions;
CREATE POLICY warehouse_user_permissions_manager_delete
  ON public.warehouse_user_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.warehouse_users membership
      WHERE membership.id = warehouse_user_permissions.warehouse_user_id
        AND public.warehouse_has_account_role(
          membership.account_id,
          ARRAY['owner'::text, 'admin'::text]
        )
    )
  );
CREATE OR REPLACE FUNCTION public.warehouse_has_account_permission(
  requested_account_id uuid,
  required_permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.warehouse_users membership
    WHERE membership.account_id = requested_account_id
      AND membership.user_id = auth.uid()
      AND membership.status = 'active'
      AND (
        membership.role IN ('owner', 'admin')
        OR EXISTS (
          SELECT 1
          FROM public.warehouse_user_permissions permission
          WHERE permission.warehouse_user_id = membership.id
            AND permission.permission = lower(btrim(required_permission))
        )
      )
  );
$function$;
-- Mevcut owner/admin kullanıcılar için fiziksel yetki kaydı zorunlu değildir.
-- warehouse_has_account_permission() bu rolleri tam yetkili kabul eder.
-- Böylece mevcut admin hesabının davranışı değişmez.;
