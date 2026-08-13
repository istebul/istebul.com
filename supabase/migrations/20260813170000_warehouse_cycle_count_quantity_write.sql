-- =============================================================
-- WarehouseIQ — Cycle Count ilk sayım miktarı atomik write
-- A7.2.0
--
-- Amaç:
-- - Operatörün fiziksel olarak doğruladığı ilk sayım miktarını
--   atomik ve idempotent biçimde kaydetmek.
-- - Bu aşamada stok bakiyesine veya stok hareketlerine dokunmamak.
-- - Sonuç/fark/yeniden sayım/adjustment değerlendirmesini
--   sonraki aşamaya bırakmak.
--
-- Güvenlik:
-- - Caller JWT kimliği auth.uid() üzerinden alınır.
-- - Service role kullanılmaz.
-- - PUBLIC / anon execute alamaz.
-- - authenticated doğrudan Cycle Count mutation yapamaz.
-- - Mutation yalnız dar SECURITY DEFINER RPC üzerinden yapılır.
-- - account + request_id idempotency uygulanır.
-- - Görev açıkça auth.uid() kullanıcısına atanmış olmalıdır.
-- - Lokasyon ve ürün/SKU taraması sunucuda yeniden doğrulanır.
-- =============================================================

-- =============================================================
-- 1. IDEMPOTENCY REQUEST TABLOSU
-- =============================================================

create table if not exists
  public.warehouse_cycle_count_write_requests (
    account_id uuid not null
      references public.warehouse_accounts(id)
      on delete cascade,

    request_id uuid not null,

    user_id uuid not null
      references auth.users(id)
      on delete cascade,

    action text not null,

    request_payload jsonb
      not null
      default '{}'::jsonb,

    response_payload jsonb,

    created_at timestamptz
      not null
      default now(),

    completed_at timestamptz,

    primary key (
      account_id,
      request_id
    ),

    constraint
      warehouse_cycle_count_write_requests_action_check
      check (
        action in (
          'record_quantity'
        )
      ),

    constraint
      warehouse_cycle_count_write_requests_payload_object_check
      check (
        jsonb_typeof(request_payload) = 'object'
      ),

    constraint
      warehouse_cycle_count_write_requests_response_object_check
      check (
        response_payload is null
        or jsonb_typeof(response_payload) = 'object'
      )
  );

create index if not exists
  warehouse_cycle_count_write_requests_user_idx
on public.warehouse_cycle_count_write_requests (
  account_id,
  user_id,
  created_at desc
);

alter table
  public.warehouse_cycle_count_write_requests
enable row level security;

drop policy if exists
  warehouse_cycle_count_write_requests_owner_select
on public.warehouse_cycle_count_write_requests;

create policy
  warehouse_cycle_count_write_requests_owner_select
on public.warehouse_cycle_count_write_requests
for select
to authenticated
using (
  user_id = auth.uid()
  and
  public.warehouse_has_account_access(
    account_id
  )
);

-- İdempotency tablosunu istemci doğrudan değiştiremez.
revoke insert, update, delete
on public.warehouse_cycle_count_write_requests
from authenticated;

grant select
on public.warehouse_cycle_count_write_requests
to authenticated;

-- =============================================================
-- 2. CYCLE COUNT DIRECT MUTATION HARDENING
--
-- A7.0 persistence RLS politikaları savunma katmanı olarak
-- kalır; HTTP istemcileri artık tablolara doğrudan mutation
-- yapamaz. Gelecek Cycle Count write operasyonları da dar
-- RPC sınırlarından geçirilmelidir.
-- =============================================================

revoke insert, update, delete
on public.warehouse_cycle_counts,
   public.warehouse_cycle_count_items,
   public.warehouse_cycle_count_tasks
from authenticated;

grant select
on public.warehouse_cycle_counts,
   public.warehouse_cycle_count_items,
   public.warehouse_cycle_count_tasks
to authenticated;

-- =============================================================
-- 3. ATOMİK İLK SAYIM MİKTARI RPC
-- =============================================================

create or replace function
  public.warehouse_cycle_count_record_quantity_write(
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
as $warehouse_cycle_count_record_quantity$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'record_quantity';

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

  v_location_matches boolean := false;
  v_product_matches boolean := false;

  v_now timestamptz :=
    now();

  v_result jsonb;
begin
  -- ===========================================================
  -- AUTH / PARAMETRE
  -- ===========================================================

  if v_user_id is null then
    raise exception using
      errcode = '28000',
      message =
        'Sayım miktarı kaydetmek için oturum açmanız gerekir.';
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

  if v_quantity is null
    or v_quantity < 0 then

    raise exception using
      errcode = '22023',
      message =
        'Sayılan miktar sıfır veya daha büyük olmalıdır.';
  end if;

  if v_location_scan is null then
    raise exception using
      errcode = '22023',
      message =
        'Lokasyon doğrulaması zorunludur.';
  end if;

  if v_product_scan is null then
    raise exception using
      errcode = '22023',
      message =
        'Ürün veya SKU doğrulaması zorunludur.';
  end if;

  -- ===========================================================
  -- ROL
  --
  -- "counter" şeklinde ayrı bir Warehouse rolü henüz domain
  -- sözleşmesinde bulunmadığı için saha sayımı generic operator
  -- + explicit task assignment ile sınırlandırılır.
  -- ===========================================================

  if not public.warehouse_has_account_role(
    p_account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'operator'
    ]::text[]
  ) then

    raise exception using
      errcode = '42501',
      message =
        'Bu firma için sayım miktarı kaydetme yetkiniz bulunmuyor.';
  end if;

  -- ===========================================================
  -- CANONICAL IDEMPOTENCY PAYLOAD
  -- ===========================================================

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

  -- Önceden tamamlanmış / devam eden aynı request var mı?
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
  where account_id = p_account_id
    and request_id = p_request_id
  for update;

  if found then
    if v_existing_user_id <> v_user_id then
      raise exception using
        errcode = '42501',
        message =
          'Bu Idempotency-Key farklı bir kullanıcıya aittir.';
    end if;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload then

      raise exception using
        errcode = '23505',
        message =
          'Aynı Idempotency-Key farklı bir sayım işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı sayım isteği halen işleniyor. Tekrar deneyin.';
  end if;

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

  -- Eşzamanlı INSERT yarışında mevcut satırı yeniden kilitle.
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
    where account_id = p_account_id
      and request_id = p_request_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0001',
        message =
          'Sayım idempotency kaydı oluşturulamadı.';
    end if;

    if v_existing_user_id <> v_user_id then
      raise exception using
        errcode = '42501',
        message =
          'Bu Idempotency-Key farklı bir kullanıcıya aittir.';
    end if;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload then

      raise exception using
        errcode = '23505',
        message =
          'Aynı Idempotency-Key farklı bir sayım işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı sayım isteği halen işleniyor. Tekrar deneyin.';
  end if;

  -- ===========================================================
  -- PARENT COUNT LOCK
  -- ===========================================================

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
        'Sayım kaydı bulunamadı.';
  end if;

  if v_count.status <> 'in_progress' then
    raise exception using
      errcode = '22023',
      message =
        'Miktar yalnızca devam eden sayım üzerinde kaydedilebilir.';
  end if;

  -- ===========================================================
  -- ITEM LOCK
  -- ===========================================================

  select *
  into v_item
  from public.warehouse_cycle_count_items
  where account_id =
      p_account_id
    and cycle_count_id =
      p_cycle_count_id
    and id =
      p_cycle_count_item_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Sayım satırı bulunamadı.';
  end if;

  if v_item.warehouse_id <>
    v_count.warehouse_id then

    raise exception using
      errcode = '22023',
      message =
        'Sayım satırı ana sayım deposuyla uyuşmuyor.';
  end if;

  if v_item.first_count_quantity is not null then
    raise exception using
      errcode = '23505',
      message =
        'Bu sayım satırının ilk fiziksel sayım miktarı zaten kaydedildi. Yeniden sayım için ayrı kontrollü akışı kullanın.';
  end if;

  if v_item.status not in (
    'assigned',
    'in_progress'
  ) then

    raise exception using
      errcode = '22023',
      message =
        'İlk sayım miktarı yalnız atanmış veya devam eden satıra kaydedilebilir.';
  end if;

  -- ===========================================================
  -- TASK LOCK / ASSIGNMENT
  -- ===========================================================

  select *
  into v_task
  from public.warehouse_cycle_count_tasks
  where account_id =
      p_account_id
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
        'Sayım görevi bulunamadı.';
  end if;

  if v_task.warehouse_id <>
    v_count.warehouse_id then

    raise exception using
      errcode = '22023',
      message =
        'Sayım görevi ana sayım deposuyla uyuşmuyor.';
  end if;

  if v_task.location_id is not null
    and v_task.location_id <>
      v_item.location_id then

    raise exception using
      errcode = '22023',
      message =
        'Sayım görevi lokasyonu sayım satırıyla uyuşmuyor.';
  end if;

  if v_task.product_id is not null
    and v_task.product_id <>
      v_item.product_id then

    raise exception using
      errcode = '22023',
      message =
        'Sayım görevi ürünü sayım satırıyla uyuşmuyor.';
  end if;

  if v_task.type not in (
    'count_location',
    'count_product',
    'count_lot',
    'count_serial',
    'blind_count'
  ) then

    raise exception using
      errcode = '22023',
      message =
        'Bu görev tipi ilk sayım miktarı kaydını desteklemiyor.';
  end if;

  if v_task.status not in (
    'assigned',
    'in_progress'
  ) then

    raise exception using
      errcode = '22023',
      message =
        'Sayım miktarı yalnız atanmış veya devam eden görevde kaydedilebilir.';
  end if;

  if v_task.assigned_user_id is null
    or v_task.assigned_user_id <>
      v_user_id then

    raise exception using
      errcode = '42501',
      message =
        'Bu sayım görevi giriş yapan kullanıcıya atanmış değildir.';
  end if;

  -- ===========================================================
  -- SERVER-SIDE LOCATION SCAN VERIFICATION
  -- ===========================================================

  select *
  into v_location
  from public.warehouse_locations
  where account_id =
      p_account_id
    and warehouse_id =
      v_item.warehouse_id
    and id =
      v_item.location_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Sayım lokasyonu bulunamadı.';
  end if;

  v_location_matches :=
    (
      v_location.barcode is not null
      and
      v_location_scan =
        v_location.barcode
    )
    or
    (
      upper(v_location_scan) =
      upper(v_location.code)
    )
    or
    (
      v_location.full_code is not null
      and
      upper(v_location_scan) =
      upper(v_location.full_code)
    );

  if not v_location_matches then
    raise exception using
      errcode = '22023',
      message =
        'Okutulan lokasyon seçili sayım göreviyle uyuşmuyor.';
  end if;

  -- ===========================================================
  -- SERVER-SIDE PRODUCT / SKU SCAN VERIFICATION
  -- ===========================================================

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
        'Sayım ürünü bulunamadı.';
  end if;

  if v_item.sku_id is not null then
    -- SKU satırında generic ürün barkodu kabul edilmez.
    -- Tarama doğru SKU kodu veya doğru SKU'ya bağlı aktif barkod olmalıdır.

    select *
    into v_sku
    from public.warehouse_product_skus
    where account_id =
        p_account_id
      and product_id =
        v_item.product_id
      and id =
        v_item.sku_id
    for share;

    if not found then
      raise exception using
        errcode = 'P0002',
        message =
          'Sayım SKU kaydı bulunamadı.';
    end if;

    v_product_matches :=
      (
        upper(v_product_scan) =
        upper(v_sku.sku_code)
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
          and active = true
      );
  else
    -- Ürün seviyesindeki satırda ürün kodu veya SKU'ya özel olmayan
    -- aktif ürün barkodu kabul edilir.

    v_product_matches :=
      (
        upper(v_product_scan) =
        upper(v_product.code)
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
          and active = true
      );
  end if;

  if not v_product_matches then
    raise exception using
      errcode = '22023',
      message =
        'Okutulan ürün veya SKU seçili sayım satırıyla uyuşmuyor.';
  end if;

  -- ===========================================================
  -- A7.2 QUANTITY WRITE
  --
  -- Bilerek yalnız ilk fiziksel sayım girdisi yazılır.
  -- Item/task operasyon halinde kalır.
  -- Parent count durumu değiştirilmez.
  -- ===========================================================

  update public.warehouse_cycle_count_items
  set
    first_count_quantity =
      v_quantity,

    counted_by =
      v_user_id,

    counted_at =
      v_now,

    status =
      'in_progress',

    notes =
      case
        when v_notes is null
          then notes
        else v_notes
      end
  where account_id =
      p_account_id
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
    and cycle_count_id =
      p_cycle_count_id
    and id =
      p_task_id;

  -- ===========================================================
  -- SAFE RESPONSE
  --
  -- Beklenen miktar / maliyet / değerlendirme sonucu dönmez.
  -- ===========================================================

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
        'in_progress',

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
$warehouse_cycle_count_record_quantity$;

-- =============================================================
-- 4. RPC EXECUTION BOUNDARY
-- =============================================================

revoke all
on function
  public.warehouse_cycle_count_record_quantity_write(
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
  public.warehouse_cycle_count_record_quantity_write(
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
  public.warehouse_cycle_count_record_quantity_write(
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

-- =============================================================
-- 5. A7.2.0 NEGATİF SINIR
--
-- Bu migration:
-- - stok bakiyesi değiştirmez
-- - stok hareketi oluşturmaz
-- - görevi tamamlamaz
-- - parent sayımı tamamlamaz
-- - sonraki değerlendirme aşamasını çalıştırmaz
-- =============================================================
