-- =========================================================
-- WarehouseIQ — Recount Evaluation DB/RPC
-- Atomik ikinci fiziksel sayım değerlendirmesi
-- =========================================================
--
-- Kaynak gerçek:
--   warehouse_cycle_count_items.expected_quantity
--   warehouse_cycle_count_items.second_count_quantity
--
-- Sınırlar:
-- - canlı stok bakiyesi okunmaz,
-- - stok veya ledger mutation yapılmaz,
-- - adjustment / approval oluşturulmaz,
-- - üçüncü recount görevi oluşturulmaz,
-- - expected / first / second / final / variance / maliyet
--   bilgileri istemci cevabına konulmaz.
--
-- İkinci sayım sonrasında:
-- - final_count_quantity = second_count_quantity
-- - fark yoksa item counted
-- - fark varsa item under_review
-- - recount_required = false
-- - gerekirse adjustment_required = true
-- =========================================================

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
      'record_recount_quantity',
      'evaluate_recount'
    )
  );

create or replace function
  public.warehouse_cycle_count_evaluate_recount(
    p_request_id uuid,
    p_account_id uuid,
    p_warehouse_id uuid,
    p_cycle_count_id uuid,
    p_cycle_count_item_id uuid,
    p_task_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_cycle_count_evaluate_recount$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'evaluate_recount';

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

  v_now timestamptz :=
    now();

  v_variance_quantity numeric(18, 6);
  v_variance_percentage numeric(12, 6);
  v_variance_value numeric(18, 6);

  v_quantity_within_tolerance boolean;
  v_percentage_within_tolerance boolean;
  v_within_tolerance boolean;

  v_adjustment_required boolean;

  v_result_type text;
  v_item_status text;
  v_count_status text;

  v_result_id uuid;
  v_exception_id uuid;
  v_exception_type text;
  v_exception_message text;

  v_has_recount boolean;
  v_all_counted boolean;

  v_response jsonb;
begin
  -- =======================================================
  -- CALLER JWT / REQUIRED IDS
  -- =======================================================

  if v_user_id is null then
    raise exception using
      errcode = '28000',
      message =
        'WarehouseIQ oturumu doğrulanamadı.';
  end if;

  if p_request_id is null
    or p_account_id is null
    or p_warehouse_id is null
    or p_cycle_count_id is null
    or p_cycle_count_item_id is null
    or p_task_id is null then

    raise exception using
      errcode = '22023',
      message =
        'İstek, firma, depo, sayım, sayım satırı ve görev kimlikleri zorunludur.';
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
        'Bu yeniden sayım değerlendirmesi için yetkiniz bulunmuyor.';
  end if;

  -- =======================================================
  -- CANONICAL IDEMPOTENCY PAYLOAD
  -- =======================================================

  v_payload :=
    jsonb_build_object(
      'warehouseId',
        p_warehouse_id,
      'cycleCountId',
        p_cycle_count_id,
      'cycleCountItemId',
        p_cycle_count_item_id,
      'taskId',
        p_task_id
    );

  select
    user_id,
    action,
    payload,
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

  if found then
    if v_existing_user_id <> v_user_id
      or v_existing_action <> v_action
      or v_existing_payload <> v_payload then

      raise exception using
        errcode = '23505',
        message =
          'Aynı işlem kimliği farklı bir yeniden sayım değerlendirmesinde kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '55000',
      message =
        'Aynı yeniden sayım değerlendirmesi halen işleniyor. Tekrar deneyin.';
  end if;

  insert into
    public.warehouse_cycle_count_write_requests (
      account_id,
      request_id,
      user_id,
      action,
      payload,
      response_payload,
      created_at,
      completed_at
    )
  values (
    p_account_id,
    p_request_id,
    v_user_id,
    v_action,
    v_payload,
    null,
    v_now,
    null
  )
  on conflict (
    account_id,
    request_id
  )
  do nothing;

  get diagnostics
    v_inserted =
      row_count;

  if v_inserted = 0 then
    select
      user_id,
      action,
      payload,
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
        errcode = '55000',
        message =
          'Yeniden sayım değerlendirme isteği kilitlenemedi.';
    end if;

    if v_existing_user_id <> v_user_id
      or v_existing_action <> v_action
      or v_existing_payload <> v_payload then

      raise exception using
        errcode = '23505',
        message =
          'Aynı işlem kimliği farklı bir yeniden sayım değerlendirmesinde kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '55000',
      message =
        'Aynı yeniden sayım değerlendirmesi halen işleniyor. Tekrar deneyin.';
  end if;

  -- =======================================================
  -- PARENT COUNT LOCK
  -- =======================================================

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
        'Yeniden sayım yalnız devam eden sayım üzerinde değerlendirilebilir.';
  end if;

  -- =======================================================
  -- ITEM LOCK
  -- =======================================================

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
        'Yeniden sayım satırı bulunamadı.';
  end if;

  if v_item.status <> 'recount_required'
    or v_item.recount_required is distinct from true then

    raise exception using
      errcode = '22023',
      message =
        'Bu sayım satırı kontrollü yeniden sayım beklemiyor.';
  end if;

  if v_item.first_count_quantity is null
    or v_item.counted_at is null then

    raise exception using
      errcode = '22023',
      message =
        'İlk fiziksel sayım tamamlanmadan yeniden sayım değerlendirilemez.';
  end if;

  if v_item.second_count_quantity is null
    or v_item.recounted_at is null
    or v_item.recounted_by is null then

    raise exception using
      errcode = '22023',
      message =
        'İkinci fiziksel sayım kaydedilmeden değerlendirme yapılamaz.';
  end if;

  -- İlk evaluation sonucu zorunludur.
  perform 1
  from public.warehouse_cycle_count_results
  where account_id =
      p_account_id
    and cycle_count_id =
      p_cycle_count_id
    and cycle_count_item_id =
      p_cycle_count_item_id
    and evaluation_stage =
      'first_count';

  if not found then
    raise exception using
      errcode = '22023',
      message =
        'İlk sayım değerlendirmesi bulunamadı.';
  end if;

  -- Aynı item için ikinci recount evaluation yasaktır.
  perform 1
  from public.warehouse_cycle_count_results
  where account_id =
      p_account_id
    and cycle_count_id =
      p_cycle_count_id
    and cycle_count_item_id =
      p_cycle_count_item_id
    and evaluation_stage =
      'recount';

  if found then
    raise exception using
      errcode = '23505',
      message =
        'Bu yeniden sayım satırı daha önce değerlendirilmiş.';
  end if;

  -- =======================================================
  -- RECOUNT TASK LOCK
  -- =======================================================

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
        'Yeniden sayım görevi bulunamadı.';
  end if;

  if v_task.type <> 'recount' then
    raise exception using
      errcode = '22023',
      message =
        'Seçili görev yeniden sayım görevi değildir.';
  end if;

  if v_task.status <> 'in_progress' then
    raise exception using
      errcode = '22023',
      message =
        'Yeniden sayım değerlendirmesi yalnız ikinci miktarı kaydedilmiş aktif görevde yapılabilir.';
  end if;

  if v_task.assigned_user_id is null
    or v_task.assigned_user_id <> v_user_id then

    raise exception using
      errcode = '42501',
      message =
        'Yeniden sayım görevi giriş yapan kullanıcıya atanmış olmalıdır.';
  end if;

  if v_task.location_id is distinct from v_item.location_id
    or v_task.product_id is distinct from v_item.product_id then

    raise exception using
      errcode = '22023',
      message =
        'Yeniden sayım görevi sayım satırı kapsamıyla uyuşmuyor.';
  end if;

  -- =======================================================
  -- SECOND COUNT EVALUATION
  -- =======================================================

  v_variance_quantity :=
    v_item.second_count_quantity -
    v_item.expected_quantity;

  v_variance_percentage :=
    case
      when v_item.expected_quantity = 0
        and v_variance_quantity = 0
        then 0

      when v_item.expected_quantity = 0
        then 100

      else round(
        (
          v_variance_quantity /
          v_item.expected_quantity
        ) * 100,
        4
      )
    end;

  v_quantity_within_tolerance :=
    v_item.tolerance_quantity is null
    or abs(
      v_variance_quantity
    ) <= v_item.tolerance_quantity;

  v_percentage_within_tolerance :=
    v_item.tolerance_percentage is null
    or abs(
      v_variance_percentage
    ) <= v_item.tolerance_percentage;

  v_within_tolerance :=
    v_quantity_within_tolerance
    and v_percentage_within_tolerance;

  -- Recount sonrası üçüncü recount yoktur.
  -- Fark devam ediyorsa kontrollü review/adjustment gerekir.
  v_adjustment_required :=
    v_variance_quantity <> 0
    or v_item.damaged_quantity > 0;

  v_variance_value :=
    case
      when v_item.unit_cost is null
        then null
      else
        abs(
          v_variance_quantity
        ) * v_item.unit_cost
    end;

  v_result_type :=
    case
      when v_item.damaged_quantity > 0
        then 'damaged'

      when v_item.expected_quantity > 0
        and v_item.second_count_quantity = 0
        then 'missing_stock'

      when v_item.expected_quantity = 0
        and v_item.second_count_quantity > 0
        then 'unexpected_stock'

      when v_variance_quantity = 0
        then 'match'

      when v_variance_quantity < 0
        then 'shortage'

      else 'surplus'
    end;

  v_item_status :=
    case
      when v_adjustment_required
        then 'under_review'
      else 'counted'
    end;

  insert into
    public.warehouse_cycle_count_results (
      account_id,
      cycle_count_id,
      cycle_count_item_id,
      evaluation_stage,
      type,
      expected_quantity,
      counted_quantity,
      damaged_quantity,
      variance_quantity,
      variance_percentage,
      variance_value,
      within_tolerance,
      recount_required,
      adjustment_required,
      calculated_at
    )
  values (
    p_account_id,
    p_cycle_count_id,
    p_cycle_count_item_id,
    'recount',
    v_result_type,
    v_item.expected_quantity,
    v_item.second_count_quantity,
    v_item.damaged_quantity,
    v_variance_quantity,
    v_variance_percentage,
    v_variance_value,
    v_within_tolerance,
    false,
    v_adjustment_required,
    v_now
  )
  returning id
  into v_result_id;

  update public.warehouse_cycle_count_items
  set
    status =
      v_item_status,

    final_count_quantity =
      second_count_quantity,

    variance_quantity =
      v_variance_quantity,

    variance_percentage =
      v_variance_percentage,

    variance_value =
      v_variance_value,

    recount_required =
      false,

    adjustment_required =
      v_adjustment_required
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
      'completed',

    completed_at =
      coalesce(
        completed_at,
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

  -- =======================================================
  -- PREVIOUS RECOUNT EXCEPTION RESOLUTION
  -- =======================================================

  update public.warehouse_cycle_count_exceptions
  set
    resolved =
      true,

    resolved_by =
      v_user_id,

    resolved_at =
      v_now,

    resolution_notes =
      case
        when resolution_notes is null
          or btrim(resolution_notes) = ''
          then 'Kontrollü yeniden sayım tamamlandı.'
        else resolution_notes
      end
  where account_id =
      p_account_id
    and cycle_count_id =
      p_cycle_count_id
    and cycle_count_item_id =
      p_cycle_count_item_id
    and type =
      'recount_required'
    and resolved =
      false;

  -- Fark/hasar devam ediyorsa yalnız exception persistence.
  -- Adjustment veya approval burada oluşturulmaz.
  if v_adjustment_required then
    v_exception_type :=
      case
        when v_item.damaged_quantity > 0
          then 'damaged_stock'
        else 'variance_exceeded'
      end;

    v_exception_message :=
      case
        when v_item.damaged_quantity > 0
          then format(
            'Kontrollü yeniden sayım sonrasında %s birim hasarlı stok incelemesi gerekiyor.',
            v_item.damaged_quantity
          )

        else format(
          'Kontrollü yeniden sayım sonrasında %s birim stok farkı inceleme bekliyor.',
          v_variance_quantity
        )
      end;

    select id
    into v_exception_id
    from public.warehouse_cycle_count_exceptions
    where account_id =
        p_account_id
      and cycle_count_id =
        p_cycle_count_id
      and cycle_count_item_id =
        p_cycle_count_item_id
      and type =
        v_exception_type
      and resolved =
        false
    for update;

    if not found then
      insert into
        public.warehouse_cycle_count_exceptions (
          account_id,
          cycle_count_id,
          cycle_count_item_id,
          task_id,
          warehouse_id,
          location_id,
          product_id,
          lot_number,
          serial_number,
          type,
          message,
          resolved,
          created_at
        )
      values (
        p_account_id,
        p_cycle_count_id,
        p_cycle_count_item_id,
        p_task_id,
        p_warehouse_id,
        v_item.location_id,
        v_item.product_id,
        nullif(
          btrim(
            coalesce(
              v_item.lot_number,
              ''
            )
          ),
          ''
        ),
        nullif(
          btrim(
            coalesce(
              v_item.serial_number,
              ''
            )
          ),
          ''
        ),
        v_exception_type,
        v_exception_message,
        false,
        v_now
      )
      returning id
      into v_exception_id;
    end if;
  end if;

  -- =======================================================
  -- PARENT COUNT STATUS
  -- =======================================================

  select exists (
    select 1
    from public.warehouse_cycle_count_items
    where account_id =
        p_account_id
      and cycle_count_id =
        p_cycle_count_id
      and recount_required =
        true
  )
  into v_has_recount;

  select not exists (
    select 1
    from public.warehouse_cycle_count_items
    where account_id =
        p_account_id
      and cycle_count_id =
        p_cycle_count_id
      and status not in (
        'counted',
        'under_review',
        'approved',
        'adjusted',
        'cancelled'
      )
  )
  into v_all_counted;

  v_count_status :=
    case
      when v_has_recount
        then 'recount_required'

      when v_all_counted
        then 'counted'

      else 'in_progress'
    end;

  update public.warehouse_cycle_counts
  set
    status =
      v_count_status,

    counted_at =
      case
        when v_count_status = 'counted'
          then coalesce(
            counted_at,
            v_now
          )
        else counted_at
      end
  where account_id =
      p_account_id
    and warehouse_id =
      p_warehouse_id
    and id =
      p_cycle_count_id;

  -- =======================================================
  -- BLIND-COUNT SAFE RESPONSE
  -- =======================================================

  v_response :=
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
        'evaluated',

      'itemStatus',
        v_item_status,

      'countStatus',
        v_count_status,

      'recountRequired',
        false,

      'reviewRequired',
        v_adjustment_required,

      'taskStatus',
        'completed'
    );

  update public.warehouse_cycle_count_write_requests
  set
    response_payload =
      v_response,

    completed_at =
      v_now
  where account_id =
      p_account_id
    and request_id =
      p_request_id
    and user_id =
      v_user_id;

  return v_response;
end;
$warehouse_cycle_count_evaluate_recount$;

revoke all
on function
  public.warehouse_cycle_count_evaluate_recount(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
from public;

revoke all
on function
  public.warehouse_cycle_count_evaluate_recount(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
from anon;

grant execute
on function
  public.warehouse_cycle_count_evaluate_recount(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
to authenticated;

-- =========================================================
-- RECOUNT EVALUATION BOUNDARY
--
-- Bu migration:
-- - üçüncü recount task oluşturmaz
-- - miktar girdilerini değiştirmez
-- - yalnız ikinci sayım sonucunu final_count olarak sabitler
-- - fark devam ederse under_review işaretler
-- - adjustment / approval oluşturmaz
-- =========================================================
