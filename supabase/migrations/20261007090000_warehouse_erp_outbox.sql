-- WarehouseIQ ERP/ERI outbound integration outbox.
-- Dispatch başarısından sonra ERP/ERI'ye gönderilecek olayları transaction-safe şekilde saklar.

create table if not exists public.warehouse_erp_outbox (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  shipping_id uuid not null
    references public.warehouse_shippings(id)
    on delete cascade,

  order_id text,
  order_number text,

  event_type text not null,

  status text not null default 'pending',

  attempt_count integer not null default 0,

  payload jsonb not null default '{}'::jsonb,

  last_error text,
  response_payload jsonb,

  last_attempt_at timestamptz,
  next_attempt_at timestamptz,

  sent_at timestamptz,
  acknowledged_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_erp_outbox_status_ck
    check (
      status in (
        'pending',
        'processing',
        'acknowledged',
        'failed'
      )
    ),

  constraint warehouse_erp_outbox_event_ck
    check (
      event_type in (
        'shipment_dispatched'
      )
    ),

  constraint warehouse_erp_outbox_shipping_event_unique
    unique (
      account_id,
      shipping_id,
      event_type
    )
);

create index if not exists warehouse_erp_outbox_pending_idx
on public.warehouse_erp_outbox (
  status,
  next_attempt_at,
  created_at
);

create index if not exists warehouse_erp_outbox_order_idx
on public.warehouse_erp_outbox (
  account_id,
  order_id
);

create or replace function public.warehouse_erp_enqueue_shipping_dispatched()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_erp_enqueue_shipping_dispatched$
declare
  v_payload jsonb;
  v_status text;
  v_error text;
begin
  if old.status is distinct from 'loaded'
     or new.status is distinct from 'dispatched' then
    return new;
  end if;

  if nullif(btrim(coalesce(new.order_id, '')), '') is null then
    v_status := 'failed';
    v_error := 'ERP/ERI bildirimi için order_id bulunamadı.';
  else
    v_status := 'pending';
    v_error := null;
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
    v_status,
    0,
    v_payload,
    v_error
  )
  on conflict (
    account_id,
    shipping_id,
    event_type
  )
  do nothing;

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

revoke all on function
  public.warehouse_erp_enqueue_shipping_dispatched()
from public;

revoke all on function
  public.warehouse_erp_enqueue_shipping_dispatched()
from anon;

revoke all on function
  public.warehouse_erp_enqueue_shipping_dispatched()
from authenticated;

revoke all on table public.warehouse_erp_outbox from anon;
revoke all on table public.warehouse_erp_outbox from authenticated;

grant select on table public.warehouse_erp_outbox to authenticated;

alter table public.warehouse_erp_outbox enable row level security;

drop policy if exists warehouse_erp_outbox_select
on public.warehouse_erp_outbox;

create policy warehouse_erp_outbox_select
on public.warehouse_erp_outbox
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
