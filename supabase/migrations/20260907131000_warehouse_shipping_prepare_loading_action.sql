alter table public.warehouse_shipping_write_requests
drop constraint if exists warehouse_shipping_write_requests_action_check;
alter table public.warehouse_shipping_write_requests
add constraint warehouse_shipping_write_requests_action_check
check (
  action = any (
    array[
      'create_from_packing',
      'prepare_loading',
      'start_loading',
      'confirm_item_load',
      'load_package',
      'complete_loading',
      'create_manifest',
      'generate_manifest',
      'approve_manifest',
      'submit_manifest',
      'create_asn',
      'generate_asn',
      'send_asn',
      'acknowledge_asn',
      'reject_asn',
      'cancel_asn',
      'dispatch',
      'record_proof_of_delivery',
      'create_exception',
      'resolve_exception'
    ]::text[]
  )
);
