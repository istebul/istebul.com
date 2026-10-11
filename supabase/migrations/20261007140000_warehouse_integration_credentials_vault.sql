-- WarehouseIQ Integration Hub credential storage.
--
-- Secret değerleri warehouse_integrations içinde tutulmaz.
-- Yalnızca Supabase Vault secret UUID'si tutulur.
--
-- Authenticated kullanıcı:
--   - yalnızca admin kendi account'ındaki integration credential'ını
--     oluşturabilir/güncelleyebilir.
--
-- Service role:
--   - aktif integration runtime sırasında Vault secret'ını okuyabilir.

alter table public.warehouse_integrations
add column if not exists credential_secret_id uuid;

create index if not exists
warehouse_integrations_credential_secret_idx
on public.warehouse_integrations (
  credential_secret_id
)
where credential_secret_id is not null;


create or replace function public.warehouse_integration_set_credential(
  p_integration_id uuid,
  p_secret text,
  p_name text default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_integration_set_credential$
declare
  v_account_id uuid;
  v_existing_secret_id uuid;
  v_secret_id uuid;
  v_name text;
  v_description text;
begin
  if nullif(btrim(coalesce(p_secret, '')), '') is null then
    raise exception
      'Integration credential boş olamaz.'
      using errcode = 'P0001';
  end if;

  if length(p_secret) > 50000 then
    raise exception
      'Integration credential boyutu izin verilen sınırı aşıyor.'
      using errcode = 'P0001';
  end if;

  select
    integration.account_id,
    integration.credential_secret_id
  into
    v_account_id,
    v_existing_secret_id
  from public.warehouse_integrations as integration
  where integration.id = p_integration_id;

  if v_account_id is null then
    raise exception
      'WarehouseIQ entegrasyonu bulunamadı: %',
      p_integration_id
      using errcode = 'P0001';
  end if;

  if not public.warehouse_has_account_role(
    v_account_id,
    array['admin']::text[]
  ) then
    raise exception
      'Integration credential yönetimi için admin yetkisi gerekli.'
      using errcode = '42501';
  end if;

  v_name :=
    coalesce(
      nullif(btrim(coalesce(p_name, '')), ''),
      'warehouseiq:' || p_integration_id::text || ':credential'
    );

  v_description :=
    coalesce(
      nullif(btrim(coalesce(p_description, '')), ''),
      'WarehouseIQ Integration Hub credential'
    );

  if v_existing_secret_id is null then
    v_secret_id :=
      vault.create_secret(
        p_secret,
        v_name,
        v_description,
        null
      );
  else
    perform vault.update_secret(
      v_existing_secret_id,
      p_secret,
      v_name,
      v_description,
      null
    );

    v_secret_id :=
      v_existing_secret_id;
  end if;

  update public.warehouse_integrations
  set
    credential_secret_id = v_secret_id,
    updated_at = now(),
    last_error = null
  where id = p_integration_id;

  return v_secret_id;
end;
$warehouse_integration_set_credential$;


create or replace function public.warehouse_integration_detach_credential(
  p_integration_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_integration_detach_credential$
declare
  v_account_id uuid;
begin
  select integration.account_id
  into v_account_id
  from public.warehouse_integrations as integration
  where integration.id = p_integration_id;

  if v_account_id is null then
    raise exception
      'WarehouseIQ entegrasyonu bulunamadı: %',
      p_integration_id
      using errcode = 'P0001';
  end if;

  if not public.warehouse_has_account_role(
    v_account_id,
    array['admin']::text[]
  ) then
    raise exception
      'Integration credential yönetimi için admin yetkisi gerekli.'
      using errcode = '42501';
  end if;

  update public.warehouse_integrations
  set
    credential_secret_id = null,
    updated_at = now()
  where id = p_integration_id;

  return true;
end;
$warehouse_integration_detach_credential$;


create or replace function public.warehouse_integration_get_runtime(
  p_integration_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_integration_get_runtime$
declare
  v_result jsonb;
begin
  select
    jsonb_build_object(
      'id',
      integration.id,
      'accountId',
      integration.account_id,
      'name',
      integration.name,
      'connectorKey',
      integration.connector_key,
      'providerName',
      integration.provider_name,
      'status',
      integration.status,
      'authType',
      integration.auth_type,
      'baseUrl',
      integration.base_url,
      'config',
      integration.config,
      'credential',
      case
        when integration.credential_secret_id is null then
          null
        else
          (
            select decrypted_secret
            from vault.decrypted_secrets as secret
            where secret.id = integration.credential_secret_id
          )
      end,
      'capabilities',
      coalesce(
        (
          select
            jsonb_agg(
              jsonb_build_object(
                'key',
                capability.capability_key,
                'enabled',
                capability.enabled,
                'config',
                capability.config
              )
              order by capability.capability_key
            )
          from public.warehouse_integration_capabilities as capability
          where capability.integration_id = integration.id
        ),
        '[]'::jsonb
      ),
      'mappings',
      coalesce(
        (
          select
            jsonb_agg(
              jsonb_build_object(
                'direction',
                mapping.direction,
                'entityType',
                mapping.entity_type,
                'sourceField',
                mapping.source_field,
                'targetField',
                mapping.target_field,
                'transform',
                mapping.transform,
                'defaultValue',
                mapping.default_value,
                'required',
                mapping.required,
                'enabled',
                mapping.enabled
              )
              order by
                mapping.entity_type,
                mapping.source_field,
                mapping.target_field
            )
          from public.warehouse_integration_mappings as mapping
          where mapping.integration_id = integration.id
            and mapping.enabled = true
        ),
        '[]'::jsonb
      )
    )
  into v_result
  from public.warehouse_integrations as integration
  where integration.id = p_integration_id
    and integration.status = 'active';

  if v_result is null then
    raise exception
      'Aktif WarehouseIQ entegrasyonu bulunamadı: %',
      p_integration_id
      using errcode = 'P0001';
  end if;

  return v_result;
end;
$warehouse_integration_get_runtime$;


revoke all on function
  public.warehouse_integration_set_credential(
    uuid,
    text,
    text,
    text
  )
from public;

revoke all on function
  public.warehouse_integration_set_credential(
    uuid,
    text,
    text,
    text
  )
from anon;

grant execute on function
  public.warehouse_integration_set_credential(
    uuid,
    text,
    text,
    text
  )
to authenticated;


revoke all on function
  public.warehouse_integration_detach_credential(uuid)
from public;

revoke all on function
  public.warehouse_integration_detach_credential(uuid)
from anon;

grant execute on function
  public.warehouse_integration_detach_credential(uuid)
to authenticated;


revoke all on function
  public.warehouse_integration_get_runtime(uuid)
from public;

revoke all on function
  public.warehouse_integration_get_runtime(uuid)
from anon;

revoke all on function
  public.warehouse_integration_get_runtime(uuid)
from authenticated;

grant execute on function
  public.warehouse_integration_get_runtime(uuid)
to service_role;
