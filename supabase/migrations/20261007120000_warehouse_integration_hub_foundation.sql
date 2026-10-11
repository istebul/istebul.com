-- WarehouseIQ Integration Hub foundation.
--
-- Amaç:
--   - İşletme/account bazlı ERP entegrasyonlarını tanımlamak
--   - Connector kataloğu oluşturmak
--   - Capability ve field mapping altyapısını kurmak
--   - Mevcut warehouse_erp_outbox yapısını integration-aware hale getirmek
--   - Bir sevkiyat olayını birden fazla entegrasyona fan-out edebilmek
--   - Entegrasyon yoksa olayı "unrouted" olarak güvenli biçimde saklamak
--
-- Bu migration hiçbir gerçek ERP API çağrısı yapmaz.

create table if not exists public.warehouse_integration_connectors (
  connector_key text primary key,
  display_name text not null,
  category text not null default 'erp',
  implementation_status text not null default 'planned',
  config_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warehouse_integration_connectors_status_ck
    check (
      implementation_status in (
        'available',
        'planned',
        'disabled'
      )
    )
);

insert into public.warehouse_integration_connectors (
  connector_key,
  display_name,
  category,
  implementation_status
)
values
  ('netsis', 'Netsis', 'erp', 'planned'),
  ('sap', 'SAP', 'erp', 'planned'),
  ('nebim', 'Nebim', 'erp', 'planned'),
  ('oracle', 'Oracle', 'erp', 'planned'),
  ('custom_rest', 'Özel REST', 'custom', 'available'),
  ('custom_soap', 'Özel SOAP', 'custom', 'available'),
  ('integration_agent', 'WarehouseIQ Integration Agent', 'gateway', 'planned')
on conflict (connector_key) do update
set
  display_name = excluded.display_name,
  category = excluded.category,
  updated_at = now();

create table if not exists public.warehouse_integrations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,
  name text not null,
  connector_key text not null
    references public.warehouse_integration_connectors(connector_key),
  provider_name text,
  status text not null default 'draft',
  auth_type text not null default 'api_key',
  base_url text,
  credential_ref text,
  config jsonb not null default '{}'::jsonb,
  last_test_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warehouse_integrations_status_ck
    check (
      status in (
        'draft',
        'testing',
        'active',
        'inactive',
        'error'
      )
    ),
  constraint warehouse_integrations_auth_type_ck
    check (
      auth_type in (
        'none',
        'api_key',
        'bearer',
        'basic',
        'oauth2_client_credentials',
        'custom'
      )
    ),
  constraint warehouse_integrations_name_ck
    check (
      length(btrim(name)) between 2 and 160
    ),
  constraint warehouse_integrations_account_name_unique
    unique (account_id, name),
  constraint warehouse_integrations_account_id_unique
    unique (account_id, id)
);

create index if not exists warehouse_integrations_account_status_idx
on public.warehouse_integrations (
  account_id,
  status,
  connector_key
);

create table if not exists public.warehouse_integration_capabilities (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null
    references public.warehouse_integrations(id)
    on delete cascade,
  capability_key text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warehouse_integration_capabilities_unique
    unique (integration_id, capability_key)
);

create index if not exists warehouse_integration_capabilities_lookup_idx
on public.warehouse_integration_capabilities (
  integration_id,
  capability_key,
  enabled
);

create table if not exists public.warehouse_integration_mappings (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null
    references public.warehouse_integrations(id)
    on delete cascade,
  direction text not null default 'outbound',
  entity_type text not null,
  source_field text not null,
  target_field text not null,
  transform jsonb not null default '{}'::jsonb,
  default_value jsonb,
  required boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint warehouse_integration_mappings_direction_ck
    check (
      direction in (
        'inbound',
        'outbound',
        'bidirectional'
      )
    ),
  constraint warehouse_integration_mappings_unique
    unique (
      integration_id,
      direction,
      entity_type,
      source_field,
      target_field
    )
);

create index if not exists warehouse_integration_mappings_lookup_idx
on public.warehouse_integration_mappings (
  integration_id,
  direction,
  entity_type,
  enabled
);

grant select, insert, update, delete
on table public.warehouse_integrations
to authenticated;

grant select, insert, update, delete
on table public.warehouse_integration_capabilities
to authenticated;

grant select, insert, update, delete
on table public.warehouse_integration_mappings
to authenticated;

grant select
on table public.warehouse_integration_connectors
to authenticated;

alter table public.warehouse_integrations enable row level security;
alter table public.warehouse_integration_capabilities enable row level security;
alter table public.warehouse_integration_mappings enable row level security;
alter table public.warehouse_integration_connectors enable row level security;

drop policy if exists warehouse_integrations_select
on public.warehouse_integrations;

create policy warehouse_integrations_select
on public.warehouse_integrations
for select
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
      'admin',
      'warehouse_manager'
    ]::text[]
  )
);

drop policy if exists warehouse_integrations_admin_write
on public.warehouse_integrations;

create policy warehouse_integrations_admin_write
on public.warehouse_integrations
for all
to authenticated
using (
  public.warehouse_has_account_role(
    account_id,
    array[
      'admin'
    ]::text[]
  )
)
with check (
  public.warehouse_has_account_role(
    account_id,
    array[
      'admin'
    ]::text[]
  )
);

drop policy if exists warehouse_integration_capabilities_select
on public.warehouse_integration_capabilities;

create policy warehouse_integration_capabilities_select
on public.warehouse_integration_capabilities
for select
to authenticated
using (
  exists (
    select 1
    from public.warehouse_integrations as integration
    where integration.id = integration_id
      and public.warehouse_has_account_role(
        integration.account_id,
        array[
          'admin',
          'warehouse_manager'
        ]::text[]
      )
  )
);

drop policy if exists warehouse_integration_capabilities_admin_write
on public.warehouse_integration_capabilities;

create policy warehouse_integration_capabilities_admin_write
on public.warehouse_integration_capabilities
for all
to authenticated
using (
  exists (
    select 1
    from public.warehouse_integrations as integration
    where integration.id = integration_id
      and public.warehouse_has_account_role(
        integration.account_id,
        array[
          'admin'
        ]::text[]
      )
  )
)
with check (
  exists (
    select 1
    from public.warehouse_integrations as integration
    where integration.id = integration_id
      and public.warehouse_has_account_role(
        integration.account_id,
        array[
          'admin'
        ]::text[]
      )
  )
);

drop policy if exists warehouse_integration_mappings_select
on public.warehouse_integration_mappings;

create policy warehouse_integration_mappings_select
on public.warehouse_integration_mappings
for select
to authenticated
using (
  exists (
    select 1
    from public.warehouse_integrations as integration
    where integration.id = integration_id
      and public.warehouse_has_account_role(
        integration.account_id,
        array[
          'admin',
          'warehouse_manager'
        ]::text[]
      )
  )
);

drop policy if exists warehouse_integration_mappings_admin_write
on public.warehouse_integration_mappings;

create policy warehouse_integration_mappings_admin_write
on public.warehouse_integration_mappings
for all
to authenticated
using (
  exists (
    select 1
    from public.warehouse_integrations as integration
    where integration.id = integration_id
      and public.warehouse_has_account_role(
        integration.account_id,
        array[
          'admin'
        ]::text[]
      )
  )
)
with check (
  exists (
    select 1
    from public.warehouse_integrations as integration
    where integration.id = integration_id
      and public.warehouse_has_account_role(
        integration.account_id,
        array[
          'admin'
        ]::text[]
      )
  )
);

drop policy if exists warehouse_integration_connectors_select
on public.warehouse_integration_connectors;

create policy warehouse_integration_connectors_select
on public.warehouse_integration_connectors
for select
to authenticated
using (true);

alter table public.warehouse_erp_outbox
add column if not exists integration_id uuid;

alter table public.warehouse_erp_outbox
add column if not exists connector_key text;

do $warehouse_erp_outbox_fk$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'warehouse_erp_outbox_integration_fk'
      and conrelid =
        'public.warehouse_erp_outbox'::regclass
  ) then
    alter table public.warehouse_erp_outbox
    add constraint warehouse_erp_outbox_integration_fk
    foreign key (
      account_id,
      integration_id
    )
    references public.warehouse_integrations (
      account_id,
      id
    )
    on delete restrict;
  end if;
end
$warehouse_erp_outbox_fk$;

alter table public.warehouse_erp_outbox
drop constraint if exists warehouse_erp_outbox_shipping_event_unique;

alter table public.warehouse_erp_outbox
drop constraint if exists warehouse_erp_outbox_status_ck;

update public.warehouse_erp_outbox
set
  status = 'unrouted',
  updated_at = now()
where integration_id is null
  and status in (
    'pending',
    'failed'
  );

alter table public.warehouse_erp_outbox
add constraint warehouse_erp_outbox_status_ck
check (
  status in (
    'unrouted',
    'pending',
    'processing',
    'acknowledged',
    'failed',
    'superseded'
  )
);

create unique index if not exists
warehouse_erp_outbox_integration_event_unique
on public.warehouse_erp_outbox (
  account_id,
  integration_id,
  shipping_id,
  event_type
)
where integration_id is not null;

create unique index if not exists
warehouse_erp_outbox_unrouted_event_unique
on public.warehouse_erp_outbox (
  account_id,
  shipping_id,
  event_type
)
where integration_id is null;

create index if not exists
warehouse_erp_outbox_integration_status_idx
on public.warehouse_erp_outbox (
  account_id,
  integration_id,
  status,
  next_attempt_at,
  created_at
);

create or replace function public.warehouse_erp_enqueue_shipping_dispatched()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_erp_enqueue_shipping_dispatched$
declare
  v_payload jsonb;
  v_routed boolean := false;
  v_integration record;
begin
  if old.status is distinct from 'loaded'
     or new.status is distinct from 'dispatched' then
    return new;
  end if;

  select
    jsonb_build_object(
      'eventType',
      'shipment_dispatched',
      'shippingId',
      new.id,
      'shippingNumber',
      new.shipping_number,
      'accountId',
      new.account_id,
      'warehouseId',
      new.warehouse_id,
      'orderId',
      new.order_id,
      'orderNumber',
      new.order_number,
      'referenceType',
      new.reference_type,
      'referenceId',
      new.reference_id,
      'referenceNumber',
      new.reference_number,
      'trackingNumber',
      new.tracking_number,
      'dispatchedAt',
      new.dispatched_at,
      'items',
      coalesce(
        (
          select
            jsonb_agg(
              jsonb_build_object(
                'shippingItemId',
                item.id,
                'orderId',
                item.order_id,
                'orderItemId',
                item.order_item_id,
                'productId',
                item.product_id,
                'skuId',
                item.sku_id,
                'requestedQuantity',
                item.requested_quantity,
                'loadedQuantity',
                item.loaded_quantity,
                'damagedQuantity',
                item.damaged_quantity,
                'missingQuantity',
                item.missing_quantity,
                'unit',
                item.unit
              )
              order by item.line_number
            )
          from public.warehouse_shipping_items as item
          where item.account_id = new.account_id
            and item.shipping_id = new.id
        ),
        '[]'::jsonb
      )
    )
  into v_payload;

  for v_integration in
    select
      integration.id,
      integration.connector_key
    from public.warehouse_integrations as integration
    where integration.account_id = new.account_id
      and integration.status = 'active'
      and exists (
        select 1
        from public.warehouse_integration_capabilities as capability
        where capability.integration_id = integration.id
          and capability.capability_key = 'shipment.write'
          and capability.enabled = true
      )
    order by integration.created_at, integration.id
  loop
    insert into public.warehouse_erp_outbox (
      account_id,
      shipping_id,
      order_id,
      order_number,
      event_type,
      status,
      attempt_count,
      payload,
      last_error,
      integration_id,
      connector_key
    )
    values (
      new.account_id,
      new.id,
      nullif(btrim(new.order_id), ''),
      nullif(btrim(new.order_number), ''),
      'shipment_dispatched',
      case
        when nullif(btrim(coalesce(new.order_id, '')), '') is null
          then 'failed'
        else 'pending'
      end,
      0,
      v_payload,
      case
        when nullif(btrim(coalesce(new.order_id, '')), '') is null
          then 'ERP entegrasyonu için order_id bulunamadı.'
        else null
      end,
      v_integration.id,
      v_integration.connector_key
    )
    on conflict (
      account_id,
      integration_id,
      shipping_id,
      event_type
    )
    where integration_id is not null
    do nothing;

    v_routed := true;
  end loop;

  if not v_routed then
    insert into public.warehouse_erp_outbox (
      account_id,
      shipping_id,
      order_id,
      order_number,
      event_type,
      status,
      attempt_count,
      payload,
      last_error
    )
    values (
      new.account_id,
      new.id,
      nullif(btrim(new.order_id), ''),
      nullif(btrim(new.order_number), ''),
      'shipment_dispatched',
      case
        when nullif(btrim(coalesce(new.order_id, '')), '') is null
          then 'failed'
        else 'unrouted'
      end,
      0,
      v_payload,
      case
        when nullif(btrim(coalesce(new.order_id, '')), '') is null
          then 'ERP entegrasyonu için order_id bulunamadı.'
        else 'Aktif shipment.write ERP entegrasyonu bulunamadı.'
      end
    )
    on conflict (
      account_id,
      shipping_id,
      event_type
    )
    where integration_id is null
    do nothing;
  end if;

  return new;
end;
$warehouse_erp_enqueue_shipping_dispatched$;

drop trigger if exists warehouse_erp_enqueue_shipping_dispatched
on public.warehouse_shippings;

create trigger warehouse_erp_enqueue_shipping_dispatched
after update of status
on public.warehouse_shippings
for each row
execute function public.warehouse_erp_enqueue_shipping_dispatched();

create or replace function public.warehouse_erp_outbox_route_unrouted(
  p_limit integer default 10
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_erp_outbox_route_unrouted$
declare
  v_limit integer :=
    least(
      greatest(
        coalesce(p_limit, 10),
        1
      ),
      50
    );
  v_processed integer := 0;
  v_row record;
  v_integration record;
  v_routed boolean;
begin
  for v_row in
    select *
    from public.warehouse_erp_outbox
    where status = 'unrouted'
    order by created_at, id
    for update skip locked
    limit v_limit
  loop
    v_routed := false;

    for v_integration in
      select
        integration.id,
        integration.connector_key
      from public.warehouse_integrations as integration
      where integration.account_id = v_row.account_id
        and integration.status = 'active'
        and exists (
          select 1
          from public.warehouse_integration_capabilities as capability
          where capability.integration_id = integration.id
            and capability.capability_key = 'shipment.write'
            and capability.enabled = true
        )
      order by integration.created_at, integration.id
    loop
      insert into public.warehouse_erp_outbox (
        account_id,
        shipping_id,
        order_id,
        order_number,
        event_type,
        status,
        attempt_count,
        payload,
        integration_id,
        connector_key
      )
      values (
        v_row.account_id,
        v_row.shipping_id,
        v_row.order_id,
        v_row.order_number,
        v_row.event_type,
        'pending',
        0,
        v_row.payload,
        v_integration.id,
        v_integration.connector_key
      )
      on conflict (
        account_id,
        integration_id,
        shipping_id,
        event_type
      )
      where integration_id is not null
      do nothing;

      v_routed := true;
    end loop;

    if v_routed then
      update public.warehouse_erp_outbox
      set
        status = 'superseded',
        last_error = null,
        updated_at = now()
      where id = v_row.id;

      v_processed := v_processed + 1;
    end if;
  end loop;

  return v_processed;
end;
$warehouse_erp_outbox_route_unrouted$;

revoke all on function
  public.warehouse_erp_outbox_route_unrouted(integer)
from public;

revoke all on function
  public.warehouse_erp_outbox_route_unrouted(integer)
from anon;

revoke all on function
  public.warehouse_erp_outbox_route_unrouted(integer)
from authenticated;

grant execute on function
  public.warehouse_erp_outbox_route_unrouted(integer)
to service_role;
