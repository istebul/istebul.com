-- WarehouseIQ Integration Hub runtime.
--
-- Worker:
--   - yalnızca integration-aware outbox kayıtlarını claim eder
--   - entegrasyon runtime bilgisini güvenli RPC ile alır
--   - credential değerini DB'den asla çekmez
--
-- credential_ref:
--   Güvenli secret sağlayıcısındaki referanstır.
--   Secret'ın kendisi public/DB payload içinde tutulmaz.

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
      'credentialRef',
      integration.credential_ref,
      'config',
      integration.config,
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

create or replace function public.warehouse_erp_outbox_claim(
  p_limit integer default 10
)
returns setof public.warehouse_erp_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_erp_outbox_claim$
declare
  v_limit integer :=
    least(
      greatest(
        coalesce(p_limit, 10),
        1
      ),
      50
    );
begin
  update public.warehouse_erp_outbox
  set
    status = 'failed',
    last_error = coalesce(
      last_error,
      'İşleme kilidi zaman aşımı nedeniyle yeniden kuyruğa alındı.'
    ),
    next_attempt_at = now(),
    updated_at = now()
  where status = 'processing'
    and last_attempt_at is not null
    and last_attempt_at < now() - interval '15 minutes';

  return query
  update public.warehouse_erp_outbox as outbox
  set
    status = 'processing',
    attempt_count = outbox.attempt_count + 1,
    last_attempt_at = now(),
    next_attempt_at = null,
    updated_at = now()
  from (
    select candidate.id
    from public.warehouse_erp_outbox as candidate
    where candidate.integration_id is not null
      and candidate.status in (
        'pending',
        'failed'
      )
      and (
        candidate.next_attempt_at is null
        or candidate.next_attempt_at <= now()
      )
    order by
      candidate.created_at,
      candidate.id
    for update skip locked
    limit v_limit
  ) as claimed
  where outbox.id = claimed.id
  returning outbox.*;
end;
$warehouse_erp_outbox_claim$;

revoke all on function
  public.warehouse_erp_outbox_claim(integer)
from public;

revoke all on function
  public.warehouse_erp_outbox_claim(integer)
from anon;

revoke all on function
  public.warehouse_erp_outbox_claim(integer)
from authenticated;

grant execute on function
  public.warehouse_erp_outbox_claim(integer)
to service_role;
