begin;

alter table public.warehouse_shipping_write_requests
  drop constraint if exists
    warehouse_shipping_write_requests_action_check;

alter table public.warehouse_shipping_write_requests
  add constraint
    warehouse_shipping_write_requests_action_check
  check (
    action in (
      'create_from_packing',
      'start_loading',
      'confirm_item_load',
      'load_package',
      'complete_loading',
      'create_manifest',
      'generate_manifest',
      'approve_manifest',
      'submit_manifest',
      'create_asn',
      'generate_asn'
    )
  );

create or replace function
  public.warehouse_shipping_generate_asn_write(
    p_request_id uuid,
    p_account_id uuid,
    p_shipping_id uuid,
    p_asn_id uuid,
    p_generated_by text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_shipping_generate_asn_write$
declare
  v_user_id uuid := auth.uid();

  v_action constant text :=
    'generate_asn';

  v_generated_by text;
  v_payload jsonb;

  v_existing
    public.warehouse_shipping_write_requests%rowtype;

  v_inserted integer := 0;

  v_shipping
    public.warehouse_shippings%rowtype;

  v_asn
    public.warehouse_shipping_asns%rowtype;

  v_item_count integer := 0;
  v_package_count integer := 0;
  v_invalid_package_count integer := 0;

  v_lines jsonb := '[]'::jsonb;

  v_content text;
  v_xml_lines text := '';
  v_edi_lines text := '';
  v_edifact_lines text := '';

  v_line jsonb;
  v_separator text := '';

  v_now timestamptz;

  v_result jsonb;
begin
  if p_request_id is null then
    raise exception
      'İstek kimliği zorunludur.'
      using errcode = '22023';
  end if;

  if p_account_id is null then
    raise exception
      'Firma kimliği zorunludur.'
      using errcode = '22023';
  end if;

  if p_shipping_id is null then
    raise exception
      'Sevkiyat kimliği zorunludur.'
      using errcode = '22023';
  end if;

  if p_asn_id is null then
    raise exception
      'ASN kimliği zorunludur.'
      using errcode = '22023';
  end if;

  if v_user_id is null then
    raise exception
      'Kimliği doğrulanmış kullanıcı zorunludur.'
      using errcode = '42501';
  end if;

  if not coalesce(
    public.warehouse_has_account_role(
      p_account_id,
      array[
        'owner',
        'admin',
        'warehouse_manager',
        'supervisor',
        'inventory_controller',
        'picker',
        'operator'
      ]::text[]
    ),
    false
  ) then
    raise exception
      'Bu firma için ASN oluşturma yetkiniz bulunmuyor.'
      using errcode = '42501';
  end if;

  v_generated_by :=
    nullif(
      btrim(
        coalesce(
          p_generated_by,
          ''
        )
      ),
      ''
    );

  if v_generated_by is null then
    raise exception
      'ASN oluşturan kullanıcı boş bırakılamaz.'
      using errcode = '22023';
  end if;

  v_payload :=
    jsonb_build_object(
      'shippingId',
      p_shipping_id,
      'asnId',
      p_asn_id,
      'generatedBy',
      v_generated_by
    );

  select request.*
  into v_existing
  from public.warehouse_shipping_write_requests
    as request
  where request.account_id =
      p_account_id
    and request.request_id =
      p_request_id
  for update;

  if found then
    if v_existing.user_id <>
      v_user_id then

      raise exception
        'Aynı istek kimliği farklı bir kullanıcı tarafından kullanılamaz.'
        using errcode = '42501';
    end if;

    if v_existing.action <>
        v_action
      or v_existing.request_payload
        is distinct from v_payload then

      raise exception
        'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.'
        using errcode = '23505';
    end if;

    if v_existing.completed_at
        is not null
      and v_existing.response_payload
        is not null then

      return
        v_existing.response_payload;
    end if;

    raise exception
      'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.'
      using errcode = '40001';
  end if;

  insert into
    public.warehouse_shipping_write_requests (
      account_id,
      request_id,
      user_id,
      action,
      request_payload
    )
  values (
    p_account_id,
    p_request_id,
    v_user_id,
    v_action,
    v_payload
  )
  on conflict (
    account_id,
    request_id
  )
  do nothing;

  get diagnostics
    v_inserted = row_count;

  if v_inserted = 0 then
    select request.*
    into v_existing
    from public.warehouse_shipping_write_requests
      as request
    where request.account_id =
        p_account_id
      and request.request_id =
        p_request_id
    for update;

    if not found then
      raise exception
        'Aynı sevkiyat isteği eşzamanlı olarak değişti. Tekrar deneyin.'
        using errcode = '40001';
    end if;

    if v_existing.user_id <>
      v_user_id then

      raise exception
        'Aynı istek kimliği farklı bir kullanıcı tarafından kullanılamaz.'
        using errcode = '42501';
    end if;

    if v_existing.action <>
        v_action
      or v_existing.request_payload
        is distinct from v_payload then

      raise exception
        'Aynı istek kimliği farklı bir sevkiyat işlemi için kullanılamaz.'
        using errcode = '23505';
    end if;

    if v_existing.completed_at
        is not null
      and v_existing.response_payload
        is not null then

      return
        v_existing.response_payload;
    end if;

    raise exception
      'Aynı sevkiyat isteği halen işleniyor. Tekrar deneyin.'
      using errcode = '40001';
  end if;

  select shipping.*
  into v_shipping
  from public.warehouse_shippings
    as shipping
  where shipping.account_id =
      p_account_id
    and shipping.id =
      p_shipping_id
  for update;

  if not found then
    raise exception
      'ASN sevkiyat kaydı bulunamadı.'
      using errcode = '22023';
  end if;

  select asn.*
  into v_asn
  from public.warehouse_shipping_asns
    as asn
  where asn.account_id =
      p_account_id
    and asn.shipping_id =
      p_shipping_id
    and asn.id =
      p_asn_id
  for update;

  if not found then
    raise exception
      'ASN kaydı bulunamadı: %',
      p_asn_id
      using errcode = '22023';
  end if;

  if v_asn.status not in (
    'draft',
    'rejected'
  ) then
    raise exception
      'Yalnızca taslak veya reddedilmiş ASN yeniden oluşturulabilir.'
      using errcode = '22023';
  end if;

  perform item.id
  from public.warehouse_shipping_items
    as item
  where item.account_id =
      p_account_id
    and item.shipping_id =
      p_shipping_id
  order by
    item.line_number,
    item.id
  for update;

  if not found then
    raise exception
      'Sevkiyat satırı bulunmadan ASN oluşturulamaz.'
      using errcode = '22023';
  end if;

  perform shipping_package.id
  from public.warehouse_shipping_packages
    as shipping_package
  where shipping_package.account_id =
      p_account_id
    and shipping_package.shipping_id =
      p_shipping_id
  order by
    shipping_package.loading_sequence,
    shipping_package.id
  for update;

  if not found then
    raise exception
      'Sevkiyat paketi bulunmadan ASN oluşturulamaz.'
      using errcode = '22023';
  end if;

  select count(*)::integer
  into v_invalid_package_count
  from public.warehouse_shipping_packages
    as shipping_package
  where shipping_package.account_id =
      p_account_id
    and shipping_package.shipping_id =
      p_shipping_id
    and shipping_package.status in (
      'pending',
      'cancelled'
    );

  if v_invalid_package_count > 0 then
    raise exception
      'Bekleyen veya iptal edilmiş paketler ASN içine eklenemez.'
      using errcode = '22023';
  end if;

  select count(*)::integer
  into v_package_count
  from public.warehouse_shipping_packages
    as shipping_package
  where shipping_package.account_id =
      p_account_id
    and shipping_package.shipping_id =
      p_shipping_id;

  if v_package_count = 0 then
    raise exception
      'Sevkiyat paketi bulunmadan ASN oluşturulamaz.'
      using errcode = '22023';
  end if;

  select
    count(*)::integer,
    coalesce(
      jsonb_agg(
        jsonb_strip_nulls(
          jsonb_build_object(
            'lineNumber',
            item.line_number,
            'productId',
            item.product_id,
            'quantity',
            item.requested_quantity,
            'unit',
            item.unit,
            'skuId',
            item.sku_id,
            'lotNumber',
            item.tracking ->> 'lotNumber',
            'serialNumber',
            item.tracking ->> 'serialNumber',
            'packageNumber',
            package_match.package_number,
            'sscc',
            package_match.sscc
          )
        )
        order by
          item.line_number,
          item.id
      ),
      '[]'::jsonb
    )
  into
    v_item_count,
    v_lines
  from public.warehouse_shipping_items
    as item
  left join lateral (
    select
      candidate.package_number,
      candidate.sscc
    from public.warehouse_shipping_packages
      as candidate
    where candidate.account_id =
        p_account_id
      and candidate.shipping_id =
        p_shipping_id
      and item.packing_id is not null
      and candidate.packing_id =
        item.packing_id
    order by
      candidate.loading_sequence,
      candidate.id
    limit 1
  ) as package_match
    on true
  where item.account_id =
      p_account_id
    and item.shipping_id =
      p_shipping_id;

  if v_item_count = 0 then
    raise exception
      'Sevkiyat satırı bulunmadan ASN oluşturulamaz.'
      using errcode = '22023';
  end if;

  if v_asn.format in (
    'json',
    'custom'
  ) then
    v_content :=
      jsonb_pretty(
        jsonb_strip_nulls(
          jsonb_build_object(
            'asnNumber',
            v_asn.asn_number,
            'shippingId',
            v_asn.shipping_id,
            'senderCode',
            v_asn.sender_code,
            'receiverCode',
            v_asn.receiver_code,
            'plannedDispatchAt',
            v_asn.planned_dispatch_at,
            'expectedDeliveryAt',
            v_asn.expected_delivery_at,
            'packageCount',
            v_package_count,
            'lines',
            v_lines
          )
        )
      );

  elsif v_asn.format = 'xml' then
    v_xml_lines := '';
    v_separator := '';

    for v_line in
      select value
      from jsonb_array_elements(v_lines)
    loop
      v_xml_lines :=
        v_xml_lines
        || v_separator
        || '  <Line>'
        || E'\n'
        || '    <LineNumber>'
        || (v_line ->> 'lineNumber')
        || '</LineNumber>'
        || E'\n'
        || '    <ProductId>'
        || replace(
             replace(
               replace(
                 replace(
                   replace(
                     coalesce(
                       v_line ->> 'productId',
                       ''
                     ),
                     '&',
                     '&amp;'
                   ),
                   '<',
                   '&lt;'
                 ),
                 '>',
                 '&gt;'
               ),
               '"',
               '&quot;'
             ),
             '''',
             '&apos;'
           )
        || '</ProductId>';

      if v_line ? 'skuId' then
        v_xml_lines :=
          v_xml_lines
          || E'\n'
          || '    <SkuId>'
          || replace(
               replace(
                 replace(
                   replace(
                     replace(
                       v_line ->> 'skuId',
                       '&',
                       '&amp;'
                     ),
                     '<',
                     '&lt;'
                   ),
                   '>',
                   '&gt;'
                 ),
                 '"',
                 '&quot;'
               ),
               '''',
               '&apos;'
             )
          || '</SkuId>';
      end if;

      v_xml_lines :=
        v_xml_lines
        || E'\n'
        || '    <Quantity>'
        || (v_line ->> 'quantity')
        || '</Quantity>'
        || E'\n'
        || '    <Unit>'
        || replace(
             replace(
               replace(
                 replace(
                   replace(
                     coalesce(
                       v_line ->> 'unit',
                       ''
                     ),
                     '&',
                     '&amp;'
                   ),
                   '<',
                   '&lt;'
                 ),
                 '>',
                 '&gt;'
               ),
               '"',
               '&quot;'
             ),
             '''',
             '&apos;'
           )
        || '</Unit>';

      if v_line ? 'lotNumber' then
        v_xml_lines :=
          v_xml_lines
          || E'\n'
          || '    <LotNumber>'
          || replace(
               replace(
                 replace(
                   replace(
                     replace(
                       v_line ->> 'lotNumber',
                       '&',
                       '&amp;'
                     ),
                     '<',
                     '&lt;'
                   ),
                   '>',
                   '&gt;'
                 ),
                 '"',
                 '&quot;'
               ),
               '''',
               '&apos;'
             )
          || '</LotNumber>';
      end if;

      if v_line ? 'serialNumber' then
        v_xml_lines :=
          v_xml_lines
          || E'\n'
          || '    <SerialNumber>'
          || replace(
               replace(
                 replace(
                   replace(
                     replace(
                       v_line ->> 'serialNumber',
                       '&',
                       '&amp;'
                     ),
                     '<',
                     '&lt;'
                   ),
                   '>',
                   '&gt;'
                 ),
                 '"',
                 '&quot;'
               ),
               '''',
               '&apos;'
             )
          || '</SerialNumber>';
      end if;

      if v_line ? 'packageNumber' then
        v_xml_lines :=
          v_xml_lines
          || E'\n'
          || '    <PackageNumber>'
          || replace(
               replace(
                 replace(
                   replace(
                     replace(
                       v_line ->> 'packageNumber',
                       '&',
                       '&amp;'
                     ),
                     '<',
                     '&lt;'
                   ),
                   '>',
                   '&gt;'
                 ),
                 '"',
                 '&quot;'
               ),
               '''',
               '&apos;'
             )
          || '</PackageNumber>';
      end if;

      if v_line ? 'sscc' then
        v_xml_lines :=
          v_xml_lines
          || E'\n'
          || '    <Sscc>'
          || replace(
               replace(
                 replace(
                   replace(
                     replace(
                       v_line ->> 'sscc',
                       '&',
                       '&amp;'
                     ),
                     '<',
                     '&lt;'
                   ),
                   '>',
                   '&gt;'
                 ),
                 '"',
                 '&quot;'
               ),
               '''',
               '&apos;'
             )
          || '</Sscc>';
      end if;

      v_xml_lines :=
        v_xml_lines
        || E'\n'
        || '  </Line>';

      v_separator := E'\n';
    end loop;

    v_content :=
      '<?xml version="1.0" encoding="UTF-8"?>'
      || E'\n'
      || '<AdvancedShippingNotice>'
      || E'\n'
      || '  <AsnNumber>'
      || replace(
           replace(
             replace(
               replace(
                 replace(
                   v_asn.asn_number,
                   '&',
                   '&amp;'
                 ),
                 '<',
                 '&lt;'
               ),
               '>',
               '&gt;'
             ),
             '"',
             '&quot;'
           ),
           '''',
           '&apos;'
         )
      || '</AsnNumber>'
      || E'\n'
      || '  <ShippingId>'
      || replace(
           replace(
             replace(
               replace(
                 replace(
                   v_asn.shipping_id::text,
                   '&',
                   '&amp;'
                 ),
                 '<',
                 '&lt;'
               ),
               '>',
               '&gt;'
             ),
             '"',
             '&quot;'
           ),
           '''',
           '&apos;'
         )
      || '</ShippingId>'
      || E'\n'
      || '  <PackageCount>'
      || v_package_count::text
      || '</PackageCount>';

    if v_asn.sender_code is not null then
      v_content :=
        v_content
        || E'\n'
        || '  <SenderCode>'
        || replace(
             replace(
               replace(
                 replace(
                   replace(
                     v_asn.sender_code,
                     '&',
                     '&amp;'
                   ),
                   '<',
                   '&lt;'
                 ),
                 '>',
                 '&gt;'
               ),
               '"',
               '&quot;'
             ),
             '''',
             '&apos;'
           )
        || '</SenderCode>';
    end if;

    if v_asn.receiver_code is not null then
      v_content :=
        v_content
        || E'\n'
        || '  <ReceiverCode>'
        || replace(
             replace(
               replace(
                 replace(
                   replace(
                     v_asn.receiver_code,
                     '&',
                     '&amp;'
                   ),
                   '<',
                   '&lt;'
                 ),
                 '>',
                 '&gt;'
               ),
               '"',
               '&quot;'
             ),
             '''',
             '&apos;'
           )
        || '</ReceiverCode>';
    end if;

    v_content :=
      v_content
      || E'\n'
      || '  <Lines>'
      || E'\n'
      || v_xml_lines
      || E'\n'
      || '  </Lines>'
      || E'\n'
      || '</AdvancedShippingNotice>';

  elsif v_asn.format = 'edi' then
    v_edi_lines :=
      'HDR|'
      || v_asn.asn_number
      || '|'
      || v_asn.shipping_id::text
      || '|'
      || v_package_count::text;

    for v_line in
      select value
      from jsonb_array_elements(v_lines)
    loop
      v_edi_lines :=
        v_edi_lines
        || E'\n'
        || 'LIN|'
        || coalesce(v_line ->> 'lineNumber', '')
        || '|'
        || coalesce(v_line ->> 'productId', '')
        || '|'
        || coalesce(v_line ->> 'skuId', '')
        || '|'
        || coalesce(v_line ->> 'quantity', '')
        || '|'
        || coalesce(v_line ->> 'unit', '')
        || '|'
        || coalesce(v_line ->> 'lotNumber', '')
        || '|'
        || coalesce(v_line ->> 'serialNumber', '')
        || '|'
        || coalesce(v_line ->> 'packageNumber', '')
        || '|'
        || coalesce(v_line ->> 'sscc', '');
    end loop;

    v_content :=
      v_edi_lines
      || E'\n'
      || 'TRL|'
      || jsonb_array_length(v_lines)::text;

  elsif v_asn.format = 'edifact' then
    v_edifact_lines :=
      'UNH+1+DESADV:D:01B:UN'''
      || E'\n'
      || 'BGM+351+'
      || v_asn.asn_number
      || '+9'''
      || E'\n'
      || 'CPS+1'''
      || E'\n'
      || 'PAC+'
      || v_package_count::text
      || '''';

    for v_line in
      select value
      from jsonb_array_elements(v_lines)
    loop
      v_edifact_lines :=
        v_edifact_lines
        || E'\n'
        || 'LIN+'
        || coalesce(v_line ->> 'lineNumber', '')
        || '++'
        || coalesce(v_line ->> 'productId', '')
        || ':EN'''
        || E'\n'
        || 'QTY+12:'
        || coalesce(v_line ->> 'quantity', '')
        || ':'
        || coalesce(v_line ->> 'unit', '')
        || '''';

      if v_line ? 'lotNumber' then
        v_edifact_lines :=
          v_edifact_lines
          || E'\n'
          || 'GIN+BX+'
          || (v_line ->> 'lotNumber')
          || '''';
      end if;

      if v_line ? 'sscc' then
        v_edifact_lines :=
          v_edifact_lines
          || E'\n'
          || 'GIN+BJ+'
          || (v_line ->> 'sscc')
          || '''';
      end if;
    end loop;

    v_content :=
      v_edifact_lines
      || E'\n'
      || 'UNT+'
      || (
        4
        + jsonb_array_length(v_lines) * 2
      )::text
      || '+1''';

  else
    raise exception
      'ASN biçimi geçersiz.'
      using errcode = '22023';
  end if;

  v_now :=
    clock_timestamp();

  update public.warehouse_shipping_asns
  set
    status = 'generated',
    package_count = v_package_count,
    lines = v_lines,
    content = v_content,
    generated_at = v_now,
    updated_at = v_now
  where account_id =
      p_account_id
    and shipping_id =
      p_shipping_id
    and id =
      p_asn_id
  returning *
  into v_asn;

  v_result :=
    jsonb_build_object(
      'ok',
      true,
      'action',
      v_action,
      'requestId',
      p_request_id,
      'shippingId',
      v_asn.shipping_id,
      'asnId',
      v_asn.id,
      'asnNumber',
      v_asn.asn_number,
      'status',
      v_asn.status,
      'senderCode',
      v_asn.sender_code,
      'receiverCode',
      v_asn.receiver_code,
      'plannedDispatchAt',
      v_asn.planned_dispatch_at,
      'expectedDeliveryAt',
      v_asn.expected_delivery_at,
      'packageCount',
      v_asn.package_count,
      'lines',
      v_asn.lines,
      'format',
      v_asn.format,
      'content',
      v_asn.content,
      'generatedAt',
      v_asn.generated_at,
      'sentAt',
      v_asn.sent_at,
      'acknowledgedAt',
      v_asn.acknowledged_at,
      'rejectionReason',
      v_asn.rejection_reason,
      'notes',
      v_asn.notes,
      'createdBy',
      v_asn.created_by,
      'createdAt',
      v_asn.created_at,
      'updatedAt',
      v_asn.updated_at
    );

  update
    public.warehouse_shipping_write_requests
  set
    response_payload = v_result,
    completed_at = v_now
  where account_id =
      p_account_id
    and request_id =
      p_request_id;

  return v_result;
end;
$warehouse_shipping_generate_asn_write$;

revoke all
on function
  public.warehouse_shipping_generate_asn_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from public;

revoke all
on function
  public.warehouse_shipping_generate_asn_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from anon;

revoke all
on function
  public.warehouse_shipping_generate_asn_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
from authenticated;

grant execute
on function
  public.warehouse_shipping_generate_asn_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text
  )
to authenticated;

commit;
