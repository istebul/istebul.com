-- ERP Outbox: order_id is optional for shipment dispatch events.
-- Shipment identity is shipping_id + event_type; order_id/order_number
-- remain optional ERP reference metadata.

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
      'eventType', 'shipment_dispatched',
      'shippingId', new.id,
      'shippingNumber', new.shipping_number,
      'accountId', new.account_id,
      'warehouseId', new.warehouse_id,
      'orderId', new.order_id,
      'orderNumber', new.order_number,
      'referenceType', new.reference_type,
      'referenceId', new.reference_id,
      'referenceNumber', new.reference_number,
      'trackingNumber', new.tracking_number,
      'dispatchedAt', new.dispatched_at,
      'items',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'shippingItemId', item.id,
              'orderId', item.order_id,
              'orderItemId', item.order_item_id,
              'productId', item.product_id,
              'skuId', item.sku_id,
              'requestedQuantity', item.requested_quantity,
              'loadedQuantity', item.loaded_quantity,
              'damagedQuantity', item.damaged_quantity,
              'missingQuantity', item.missing_quantity,
              'unit', item.unit
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
      'pending',
      0,
      v_payload,
      null,
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
      'unrouted',
      0,
      v_payload,
      'Aktif shipment.write ERP entegrasyonu bulunamadı.'
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
