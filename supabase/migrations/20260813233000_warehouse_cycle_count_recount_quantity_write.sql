-- =============================================================
-- WarehouseIQ — A7.3.2.0
-- Atomik kontrollü yeniden sayım miktarı kaydı
-- =============================================================
--
-- Bu migration yalnız ikinci fiziksel sayım girdisini kaydeder.
--
-- Ön koşullar:
-- - parent Cycle Count = recount_required
-- - item = recount_required
-- - item.recount_required = true
-- - first_count_quantity daha önce kaydedilmiş
-- - second_count_quantity henüz boş
-- - görev tipi yalnız recount
-- - görev assigned / in_progress
-- - görev auth.uid() kullanıcısına atanmış
-- - lokasyon ve ürün/SKU barkodu server-side doğrulanmış
--
-- Bu aşamada:
-- - final_count_quantity yazılmaz
-- - variance hesaplanmaz
-- - Result / Exception oluşturulmaz
-- - görev tamamlanmaz
-- - parent Cycle Count durumu değiştirilmez
-- - stok düzeltmesi yapılmaz
-- =============================================================

alter table public.warehouse_cycle_count_write_requests
  drop constraint if exists
    warehouse_cycle_count_write_requests_action_check;

alter table public.warehouse_cycle_count_write_requests
  add constraint
    warehouse_cycle_count_write_requests_action_check
  check (
    action in (
      'record_quantity',
      'evaluate_first_count',
      'record_recount_quantity'
    )
  );

create or replace function
  public.warehouse_cycle_count_record_recount_quantity_write(
    p_request_id uuid,
    p_account_id uuid,
    p_warehouse_id uuid,
    p_cycle_count_id uuid,
    p_cycle_count_item_id uuid,
    p_task_id uuid,
    p_counted_quantity numeric,
    p_location_scan text,
    p_product_scan text,
    p_notes text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_cycle_count_record_recount_quantity$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'record_recount_quantity';

  v_quantity numeric(18, 6) :=
    p_counted_quantity;

  v_location_scan text :=
    nullif(
      btrim(
        coalesce(
          p_location_scan,
          ''
        )
      ),
      ''
    );

  v_product_scan text :=
    nullif(
      btrim(
        coalesce(
          p_product_scan,
          ''
        )
      ),
      ''
    );

  v_notes text :=
    nullif(
      btrim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    );

  v_payload jsonb;

  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_inserted integer := 0;

  v_count
    public.warehouse_cycle_counts%rowtype;

  v_item
    public.warehouse_cycle_count_items%rowtype;

  v_task
    public.warehouse_cycle_count_tasks%rowtype;

  v_location
    public.warehouse_locations%rowtype;

  v_product
    public.warehouse_products%rowtype;

  v_sku
    public.warehouse_product_skus%rowtype;

  v_location_matches boolean :=
    false;

  v_product_matches boolean :=
    false;

  v_now timestamptz :=
    now();

  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = '28000',
      message =
        'Yeniden sayım miktarı kaydetmek için oturum açmanız gerekir.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22023',
      message =
        'Idempotency-Key kimliği zorunludur.';
  end if;

  if p_account_id is null
    or p_warehouse_id is null
    or p_cycle_count_id is null
    or p_cycle_count_item_id is null
    or p_task_id is null then

    raise exception using
      errcode = '22023',
      message =
        'Firma, depo, sayım, sayım satırı ve görev kimlikleri zorunludur.';
  end if;

  if p_counted_quantity is null
    or p_counted_quantity < 0
    or p_counted_quantity >
      999999999999.999999 then

    raise exception using
      errcode = '22023',
      message =
        'Yeniden sayılan miktar geçerli ve sıfır veya daha büyük olmalıdır.';
  end if;

  if v_location_scan is null then
    raise exception using
      errcode = '22023',
      message =
        'Yeniden sayım için lokasyon barkodu veya lokasyon kodu zorunludur.';
  end if;

  if char_length(
    v_location_scan
  ) > 255 then
    raise exception using
      errcode = '22023',
      message =
        'Lokasyon barkodu 255 karakteri aşamaz.';
  end if;

  if v_product_scan is null then
    raise exception using
      errcode = '22023',
      message =
        'Yeniden sayım için ürün veya SKU barkodu zorunludur.';
  end if;

  if char_length(
    v_product_scan
  ) > 255 then
    raise exception using
      errcode = '22023',
      message =
        'Ürün veya SKU barkodu 255 karakteri aşamaz.';
  end if;

  if v_notes is not null
    and char_length(
      v_notes
    ) > 1000 then

    raise exception using
      errcode = '22023',
      message =
        'Yeniden sayım notu 1000 karakteri aşamaz.';
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
        'operator'
      ]::text[]
    ),
    false
  ) then
    raise exception using
      errcode = '42501',
      message =
        'Bu yeniden sayım işlemi için yetkiniz bulunmuyor.';
  end if;

  v_payload :=
    jsonb_build_object(
      'warehouseId',
        p_warehouse_id,

      'cycleCountId',
        p_cycle_count_id,

      'cycleCountItemId',
        p_cycle_count_item_id,

      'taskId',
        p_task_id,

      'countedQuantity',
        v_quantity,

      'locationScan',
        v_location_scan,

      'productScan',
        v_product_scan,

      'notes',
        v_notes
    );

  insert into
    public.warehouse_cycle_count_write_requests (
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
    select
      user_id,
      action,
      request_payload,
      response_payload
    into
      v_existing_user_id,
      v_existing_action,
      v_existing_payload,
      v_existing_response
    from public.warehouse_cycle_count_write_requests
    where account_id =
        p_account_id
      and request_id =
        p_request_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0001',
        message =
          'Yeniden sayım idempotency kaydı çözülemedi.';
    end if;

    if v_existing_user_id <>
      v_user_id then

      raise exception using
        errcode = '42501',
        message =
          'Bu Idempotency-Key farklı bir kullanıcıya aittir.';
    end if;

    if v_existing_action <>
      v_action
      or v_existing_payload <>
        v_payload then

      raise exception using
        errcode = '23505',
        message =
          'Aynı Idempotency-Key farklı bir yeniden sayım isteği için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı yeniden sayım miktarı isteği halen işleniyor. Tekrar deneyin.';
  end if;

  select *
  into v_count
  from public.warehouse_cycle_counts
  where account_id =
      p_account_id
    and warehouse_id =
      p_warehouse_id
    and id =
      p_cycle_count_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Seçili depoda Cycle Count kaydı bulunamadı.';
  end if;

  if v_count.status <>
    'recount_required' then

    raise exception using
      errcode = '22023',
      message =
        'Yeniden sayım miktarı yalnız yeniden sayım gereken Cycle Count üzerinde kaydedilebilir.';
  end if;

  select *
  into v_item
  from public.warehouse_cycle_count_items
  where account_id =
      p_account_id
    and warehouse_id =
      p_warehouse_id
    and cycle_count_id =
      p_cycle_count_id
    and id =
      p_cycle_count_item_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Yeniden sayılacak Cycle Count satırı bulunamadı.';
  end if;

  if v_item.status <>
    'recount_required'
    or v_item.recount_required is distinct from
      true then

    raise exception using
      errcode = '22023',
      message =
        'Bu sayım satırı kontrollü yeniden sayım için uygun durumda değildir.';
  end if;

  if v_item.first_count_quantity is null
    or v_item.counted_at is null then

    raise exception using
      errcode = '22023',
      message =
        'İlk fiziksel sayımı tamamlanmamış satır yeniden sayılamaz.';
  end if;

  if v_item.second_count_quantity is not null
    or v_item.recounted_by is not null
    or v_item.recounted_at is not null then

    raise exception using
      errcode = '23505',
      message =
        'Bu sayım satırının ikinci fiziksel sayım miktarı zaten kaydedildi.';
  end if;

  select *
  into v_task
  from public.warehouse_cycle_count_tasks
  where account_id =
      p_account_id
    and warehouse_id =
      p_warehouse_id
    and cycle_count_id =
      p_cycle_count_id
    and cycle_count_item_id =
      p_cycle_count_item_id
    and id =
      p_task_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Kontrollü yeniden sayım görevi bulunamadı.';
  end if;

  if v_task.type <>
    'recount' then

    raise exception using
      errcode = '22023',
      message =
        'Bu görev kontrollü yeniden sayım miktarı kaydını desteklemiyor.';
  end if;

  if v_task.status not in (
    'assigned',
    'in_progress'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Yeniden sayım miktarı yalnız atanmış veya devam eden görevde kaydedilebilir.';
  end if;

  if v_task.completed_at is not null then
    raise exception using
      errcode = '22023',
      message =
        'Tamamlanmış yeniden sayım görevi tekrar kullanılamaz.';
  end if;

  if v_task.assigned_user_id is null
    or v_task.assigned_user_id <>
      v_user_id then

    raise exception using
      errcode = '42501',
      message =
        'Bu yeniden sayım görevi giriş yapan kullanıcıya atanmış değildir.';
  end if;

  if v_task.location_id is not null
    and v_task.location_id <>
      v_item.location_id then

    raise exception using
      errcode = '22023',
      message =
        'Yeniden sayım görevi lokasyonu sayım satırıyla uyuşmuyor.';
  end if;

  if v_task.product_id is not null
    and v_task.product_id <>
      v_item.product_id then

    raise exception using
      errcode = '22023',
      message =
        'Yeniden sayım görevi ürünü sayım satırıyla uyuşmuyor.';
  end if;

  select *
  into v_location
  from public.warehouse_locations
  where account_id =
      p_account_id
    and warehouse_id =
      p_warehouse_id
    and id =
      v_item.location_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Sayım satırının lokasyonu bulunamadı.';
  end if;

  v_location_matches :=
    coalesce(
      v_location.barcode =
        v_location_scan,
      false
    )
    or
    coalesce(
      upper(
        v_location.code
      ) =
      upper(
        v_location_scan
      ),
      false
    )
    or
    coalesce(
      upper(
        v_location.full_code
      ) =
      upper(
        v_location_scan
      ),
      false
    );

  if not v_location_matches then
    raise exception using
      errcode = '22023',
      message =
        'Okutulan lokasyon seçili yeniden sayım satırıyla uyuşmuyor.';
  end if;

  select *
  into v_product
  from public.warehouse_products
  where account_id =
      p_account_id
    and id =
      v_item.product_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Sayım satırının ürünü bulunamadı.';
  end if;

  if v_item.sku_id is not null then
    select *
    into v_sku
    from public.warehouse_product_skus
    where account_id =
        p_account_id
      and product_id =
        v_item.product_id
      and id =
        v_item.sku_id
      and active =
        true
    for share;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Sayım satırının aktif SKU kaydı bulunamadı.';
    end if;

    v_product_matches :=
      coalesce(
        upper(
          v_product_scan
        ) =
        upper(
          v_sku.sku_code
        ),
        false
      )
      or
      exists (
        select 1
        from public.warehouse_product_barcodes
        where account_id =
            p_account_id
          and product_id =
            v_item.product_id
          and sku_id =
            v_item.sku_id
          and value =
            v_product_scan
          and active =
            true
      );
  else
    v_product_matches :=
      coalesce(
        upper(
          v_product_scan
        ) =
        upper(
          v_product.code
        ),
        false
      )
      or
      exists (
        select 1
        from public.warehouse_product_barcodes
        where account_id =
            p_account_id
          and product_id =
            v_item.product_id
          and sku_id is null
          and value =
            v_product_scan
          and active =
            true
      );
  end if;

  if not v_product_matches then
    raise exception using
      errcode = '22023',
      message =
        'Okutulan ürün veya SKU seçili yeniden sayım satırıyla uyuşmuyor.';
  end if;

  update public.warehouse_cycle_count_items
  set
    second_count_quantity =
      v_quantity,

    recounted_by =
      v_user_id,

    recounted_at =
      v_now,

    notes =
      case
        when v_notes is null
          then notes
        else v_notes
      end
  where account_id =
      p_account_id
    and warehouse_id =
      p_warehouse_id
    and cycle_count_id =
      p_cycle_count_id
    and id =
      p_cycle_count_item_id;

  update public.warehouse_cycle_count_tasks
  set
    status =
      'in_progress',

    started_at =
      coalesce(
        started_at,
        v_now
      )
  where account_id =
      p_account_id
    and warehouse_id =
      p_warehouse_id
    and cycle_count_id =
      p_cycle_count_id
    and id =
      p_task_id;

  v_result :=
    jsonb_build_object(
      'action',
        v_action,

      'requestId',
        p_request_id,

      'accountId',
        p_account_id,

      'warehouseId',
        p_warehouse_id,

      'cycleCountId',
        p_cycle_count_id,

      'cycleCountItemId',
        p_cycle_count_item_id,

      'taskId',
        p_task_id,

      'status',
        'recorded',

      'countedQuantity',
        v_quantity,

      'unit',
        v_item.unit,

      'itemStatus',
        'recount_required',

      'countStatus',
        'recount_required',

      'taskStatus',
        'in_progress',

      'recordedBy',
        v_user_id,

      'recordedAt',
        v_now
    );

  update public.warehouse_cycle_count_write_requests
  set
    response_payload =
      v_result,

    completed_at =
      v_now
  where account_id =
      p_account_id
    and request_id =
      p_request_id
    and user_id =
      v_user_id;

  return v_result;
end;
$warehouse_cycle_count_record_recount_quantity$;

revoke all
on function
  public.warehouse_cycle_count_record_recount_quantity_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    text,
    text,
    text
  )
from public;

revoke all
on function
  public.warehouse_cycle_count_record_recount_quantity_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    text,
    text,
    text
  )
from anon;

grant execute
on function
  public.warehouse_cycle_count_record_recount_quantity_write(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    numeric,
    text,
    text,
    text
  )
to authenticated;
