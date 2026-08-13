-- =========================================================
-- WarehouseIQ — A7.3.1
-- Atomik ilk fiziksel sayım değerlendirmesi
-- =========================================================
--
-- Kaynak gerçek:
--   warehouse_cycle_count_items.expected_quantity
--   warehouse_cycle_count_items.first_count_quantity
--
-- Bu RPC:
-- - canlı inventory balance okumaz,
-- - inventory balance / ledger mutation yapmaz,
-- - adjustment / approval oluşturmaz,
-- - ilk fiziksel sayım miktarını değiştirmez,
-- - expected / variance / maliyet bilgisini istemciye döndürmez.
--
-- Domain uyumu:
-- - quantity tolerance VE percentage tolerance birlikte uygulanır.
-- - fark yoksa counted
-- - tolerans içi fark varsa under_review
-- - tolerans dışı fark varsa recount_required
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
      'evaluate_first_count'
    )
  );

alter table public.warehouse_cycle_count_items
  drop constraint if exists
    warehouse_cycle_count_items_tolerance_percentage_check;

alter table public.warehouse_cycle_count_items
  add constraint
    warehouse_cycle_count_items_tolerance_percentage_check
  check (
    tolerance_percentage is null
    or (
      tolerance_percentage >= 0
      and tolerance_percentage <= 100
    )
  );

create or replace function
  public.warehouse_cycle_count_evaluate_first_count(
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
as $warehouse_cycle_count_evaluate_first$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'evaluate_first_count';

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

  v_recount_required boolean;
  v_adjustment_required boolean;

  v_result_type text;
  v_item_status text;
  v_count_status text;

  v_result_id uuid;
  v_exception_id uuid;
  v_exception_type text;
  v_exception_message text;

  v_recount_task_id uuid;
  v_next_sequence integer;

  v_has_recount boolean;
  v_all_counted boolean;

  v_response jsonb;
begin
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
        'Bu sayım değerlendirmesi için yetkiniz bulunmuyor.';
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
        p_task_id
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
          'Sayım değerlendirme idempotency kaydı oluşturulamadı.';
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
          'Aynı Idempotency-Key farklı bir sayım değerlendirmesi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı sayım değerlendirmesi halen işleniyor. Tekrar deneyin.';
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

  if v_count.status not in (
    'in_progress',
    'recount_required'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Yalnız devam eden sayımda ilk fiziksel sayım değerlendirilebilir.';
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
        'Cycle Count sayım satırı bulunamadı.';
  end if;

  if v_item.status <> 'in_progress' then
    raise exception using
      errcode = '22023',
      message =
        'Bu sayım satırı ilk değerlendirme için uygun durumda değil.';
  end if;

  if v_item.first_count_quantity is null then
    raise exception using
      errcode = '22023',
      message =
        'İlk fiziksel sayım miktarı kaydedilmeden değerlendirme yapılamaz.';
  end if;

  if v_item.second_count_quantity is not null then
    raise exception using
      errcode = '22023',
      message =
        'Yeniden sayım miktarı bulunan satır ilk sayım değerlendirmesine alınamaz.';
  end if;

  if v_item.counted_by is distinct from v_user_id then
    raise exception using
      errcode = '42501',
      message =
        'İlk fiziksel sayımı kaydeden kullanıcı değerlendirmeyi tamamlamalıdır.';
  end if;

  if v_item.tolerance_percentage is not null
    and (
      v_item.tolerance_percentage < 0
      or v_item.tolerance_percentage > 100
    ) then

    raise exception using
      errcode = '23514',
      message =
        'Yüzde toleransı 0 ile 100 arasında olmalıdır.';
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
    and id =
      p_task_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'İlk sayım görevi bulunamadı.';
  end if;

  if v_task.cycle_count_item_id is distinct from
    p_cycle_count_item_id then

    raise exception using
      errcode = '42501',
      message =
        'Sayım görevi seçili sayım satırına ait değil.';
  end if;

  if v_task.assigned_user_id is distinct from
    v_user_id then

    raise exception using
      errcode = '42501',
      message =
        'Sayım görevi giriş yapan kullanıcıya atanmış değil.';
  end if;

  if v_task.status <> 'in_progress' then
    raise exception using
      errcode = '22023',
      message =
        'Yalnız devam eden ilk sayım görevi değerlendirilebilir.';
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
        'Bu görev ilk fiziksel sayım değerlendirmesi için uygun değil.';
  end if;

  if exists (
    select 1
    from public.warehouse_cycle_count_results
    where account_id =
        p_account_id
      and cycle_count_id =
        p_cycle_count_id
      and cycle_count_item_id =
        p_cycle_count_item_id
      and evaluation_stage =
        'first_count'
  ) then
    raise exception using
      errcode = '23505',
      message =
        'Bu sayım satırının ilk değerlendirmesi daha önce tamamlandı.';
  end if;

  v_variance_quantity :=
    v_item.first_count_quantity -
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

  v_recount_required :=
    not v_within_tolerance;

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
        and v_item.first_count_quantity = 0
        then 'missing_stock'

      when v_item.expected_quantity = 0
        and v_item.first_count_quantity > 0
        then 'unexpected_stock'

      when v_variance_quantity = 0
        then 'match'

      when not v_within_tolerance
        then 'recount_required'

      when v_variance_quantity < 0
        then 'shortage'

      else 'surplus'
    end;

  v_item_status :=
    case
      when v_recount_required
        then 'recount_required'

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
    'first_count',
    v_result_type,
    v_item.expected_quantity,
    v_item.first_count_quantity,
    v_item.damaged_quantity,
    v_variance_quantity,
    v_variance_percentage,
    v_variance_value,
    v_within_tolerance,
    v_recount_required,
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
      first_count_quantity,

    variance_quantity =
      v_variance_quantity,

    variance_percentage =
      v_variance_percentage,

    variance_value =
      v_variance_value,

    recount_required =
      v_recount_required,

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

  if v_recount_required
    or v_adjustment_required
    or v_item.damaged_quantity > 0 then

    v_exception_type :=
      case
        when v_item.damaged_quantity > 0
          then 'damaged_stock'

        when v_recount_required
          then 'recount_required'

        else 'variance_exceeded'
      end;

    v_exception_message :=
      case
        when v_item.damaged_quantity > 0
          then format(
            'Sayım satırında %s birim hasarlı stok tespit edildi.',
            v_item.damaged_quantity
          )

        else format(
          'Beklenen ve sayılan stok arasında %s birim fark tespit edildi.',
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
              v_item.tracking ->> 'lotNumber',
              ''
            )
          ),
          ''
        ),
        nullif(
          btrim(
            coalesce(
              v_item.tracking ->> 'serialNumber',
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

  if v_recount_required then
    select
      coalesce(
        max(sequence),
        0
      ) + 1
    into v_next_sequence
    from public.warehouse_cycle_count_tasks
    where account_id =
        p_account_id
      and cycle_count_id =
        p_cycle_count_id;

    v_recount_task_id :=
      gen_random_uuid();

    insert into
      public.warehouse_cycle_count_tasks (
        id,
        account_id,
        cycle_count_id,
        cycle_count_item_id,
        warehouse_id,
        location_id,
        product_id,
        type,
        status,
        priority,
        sequence,
        assigned_user_id,
        planned_at,
        notes,
        created_by,
        created_at,
        updated_at
      )
    values (
      v_recount_task_id,
      p_account_id,
      p_cycle_count_id,
      p_cycle_count_item_id,
      p_warehouse_id,
      v_item.location_id,
      v_item.product_id,
      'recount',
      'assigned',
      greatest(
        v_task.priority,
        80
      ),
      v_next_sequence,
      v_user_id,
      v_now,
      'İlk fiziksel sayım tolerans dışında kaldığı için kontrollü yeniden sayım görevi oluşturuldu.',
      v_user_id,
      v_now,
      v_now
    );
  end if;

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

  select
    coalesce(
      bool_and(
        status in (
          'counted',
          'under_review',
          'approved',
          'adjusted'
        )
      ),
      false
    )
  into v_all_counted
  from public.warehouse_cycle_count_items
  where account_id =
      p_account_id
    and cycle_count_id =
      p_cycle_count_id;

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
        v_recount_required,

      'reviewRequired',
        (
          v_adjustment_required
          and not v_recount_required
        ),

      'taskStatus',
        'completed',

      'recountTaskId',
        v_recount_task_id,

      'evaluatedBy',
        v_user_id,

      'evaluatedAt',
        v_now
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
$warehouse_cycle_count_evaluate_first$;

revoke all
on function
  public.warehouse_cycle_count_evaluate_first_count(
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
  public.warehouse_cycle_count_evaluate_first_count(
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
  public.warehouse_cycle_count_evaluate_first_count(
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid
  )
to authenticated;

-- =========================================================
-- A7.3.1 NEGATİF SINIR
-- =========================================================
--
-- Bu migration:
-- - warehouse_inventory_balances değiştirmez
-- - warehouse_inventory_movements oluşturmaz
-- - stock adjustment oluşturmaz
-- - approval oluşturmaz
-- - second_count_quantity yazmaz
-- - ilk fiziksel miktarı değiştirmez
-- - beklenen miktarı RPC response içinde açmaz
-- =========================================================
