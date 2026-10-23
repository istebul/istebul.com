-- ============================================================
-- WarehouseIQ · Quality Control Results & Completion
-- QC-P3
--
-- Mevcut warehouse_quality_control_write(create/add_item/start)
-- RPC'sine dokunmaz.
--
-- Yeni güvenli yaşam döngüsü:
--   record_result
--   complete
--
-- Inventory movement / inventory balance oluşturmaz.
-- ============================================================

create table if not exists public.warehouse_quality_result_write_requests (
  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,
  request_id uuid not null,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  action text not null,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (account_id, request_id),
  constraint warehouse_quality_result_write_requests_action_check
    check (
      action in ('record_result', 'complete')
    ),
  constraint warehouse_quality_result_write_requests_payload_object_check
    check (
      jsonb_typeof(request_payload) = 'object'
    )
);
create index if not exists
  warehouse_quality_result_write_requests_user_idx
on public.warehouse_quality_result_write_requests (
  account_id,
  user_id,
  created_at desc
);
alter table public.warehouse_quality_result_write_requests
  enable row level security;
revoke all
  on table public.warehouse_quality_result_write_requests
  from public;
revoke all
  on table public.warehouse_quality_result_write_requests
  from anon;
revoke all
  on table public.warehouse_quality_result_write_requests
  from authenticated;
create or replace function
  public.warehouse_quality_control_result_write(
    p_action text,
    p_request_id uuid,
    p_account_id uuid,
    p_payload jsonb default '{}'::jsonb
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action text :=
    lower(
      btrim(
        coalesce(p_action, '')
      )
    );

  v_payload jsonb :=
    coalesce(p_payload, '{}'::jsonb);

  v_user_id uuid := auth.uid();

  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;
  v_existing_user_id uuid;
  v_inserted integer := 0;

  v_inspection
    public.warehouse_quality_inspections%rowtype;

  v_item
    public.warehouse_quality_inspection_items%rowtype;

  v_inspection_id uuid;
  v_inspection_item_id uuid;

  v_decision text;

  v_accepted_quantity numeric(18,6);
  v_rejected_quantity numeric(18,6);
  v_conditional_quantity numeric(18,6);
  v_hold_quantity numeric(18,6);

  v_measured_value jsonb;
  v_notes text;

  v_total_allocated numeric(18,6);

  v_final_decision text;

  v_now timestamptz := now();

  v_has_pending boolean;
  v_has_rejected boolean;
  v_has_hold boolean;
  v_has_conditional boolean;
  v_has_rework boolean;
  v_has_scrap boolean;
  v_has_return boolean;

  v_result jsonb;
begin
  -- ==========================================================
  -- SECURITY / INPUT
  -- ==========================================================

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'WarehouseIQ oturumu gerekli.';
  end if;

  if p_request_id is null then
    raise exception using
      errcode = '22023',
      message = 'İstek kimliği zorunludur.';
  end if;

  if p_account_id is null then
    raise exception using
      errcode = '22023',
      message = 'Firma kimliği zorunludur.';
  end if;

  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'İstek verisi JSON nesnesi olmalıdır.';
  end if;

  if v_action not in ('record_result', 'complete') then
    raise exception using
      errcode = '22023',
      message = 'Desteklenmeyen kalite kontrol sonuç işlemi.';
  end if;

  if not public.warehouse_has_account_role(
    p_account_id,
    array[
      'owner',
      'admin',
      'warehouse_manager',
      'supervisor',
      'inventory_controller',
      'quality_controller',
      'operator'
    ]::text[]
  ) then
    raise exception using
      errcode = '42501',
      message = 'Bu firma için kalite kontrol sonuç yetkiniz bulunmuyor.';
  end if;

  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  select
    action,
    request_payload,
    response_payload,
    user_id
  into
    v_existing_action,
    v_existing_payload,
    v_existing_response,
    v_existing_user_id
  from public.warehouse_quality_result_write_requests
  where account_id = p_account_id
    and request_id = p_request_id;

  if found then
    if v_existing_user_id <> v_user_id then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği başka bir kullanıcı tarafından kullanılmış.';
    end if;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload
    then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir işlem için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;

  insert into public.warehouse_quality_result_write_requests (
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

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    select
      action,
      request_payload,
      response_payload,
      user_id
    into
      v_existing_action,
      v_existing_payload,
      v_existing_response,
      v_existing_user_id
    from public.warehouse_quality_result_write_requests
    where account_id = p_account_id
      and request_id = p_request_id;

    if not found then
      raise exception using
        errcode = '40001',
        message =
          'İstek eşzamanlı olarak işleniyor. Tekrar deneyin.';
    end if;

    if v_existing_user_id <> v_user_id then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği başka bir kullanıcı tarafından kullanılmış.';
    end if;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload
    then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir işlem için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;

  -- ==========================================================
  -- RECORD RESULT
  -- ==========================================================

  if v_action = 'record_result' then

    v_inspection_id :=
      nullif(
        btrim(
          v_payload ->> 'inspectionId'
        ),
        ''
      )::uuid;

    v_inspection_item_id :=
      nullif(
        btrim(
          v_payload ->> 'inspectionItemId'
        ),
        ''
      )::uuid;

    v_decision :=
      lower(
        btrim(
          coalesce(
            v_payload ->> 'decision',
            ''
          )
        )
      );

    if v_inspection_id is null then
      raise exception using
        errcode = '22023',
        message = 'Kalite kontrol kimliği zorunludur.';
    end if;

    if v_inspection_item_id is null then
      raise exception using
        errcode = '22023',
        message = 'Kalite kontrol satırı kimliği zorunludur.';
    end if;

    if v_decision not in (
      'accepted',
      'conditionally_accepted',
      'rejected',
      'hold',
      'rework',
      'scrap',
      'return_to_supplier'
    ) then
      raise exception using
        errcode = '22023',
        message = 'Kalite kontrol sonucu geçersizdir.';
    end if;

    begin
      v_accepted_quantity :=
        coalesce(
          (v_payload ->> 'acceptedQuantity')::numeric(18,6),
          0
        );

      v_rejected_quantity :=
        coalesce(
          (v_payload ->> 'rejectedQuantity')::numeric(18,6),
          0
        );

      v_conditional_quantity :=
        coalesce(
          (v_payload ->> 'conditionalQuantity')::numeric(18,6),
          0
        );

      v_hold_quantity :=
        coalesce(
          (v_payload ->> 'holdQuantity')::numeric(18,6),
          0
        );
    exception
      when invalid_text_representation
        or numeric_value_out_of_range
      then
        raise exception using
          errcode = '22023',
          message = 'Kalite kontrol sonuç miktarları geçerli sayılar olmalıdır.';
    end;

    if v_accepted_quantity < 0
      or v_rejected_quantity < 0
      or v_conditional_quantity < 0
      or v_hold_quantity < 0
    then
      raise exception using
        errcode = '22023',
        message = 'Kalite kontrol sonuç miktarları negatif olamaz.';
    end if;

    select *
    into v_inspection
    from public.warehouse_quality_inspections
    where account_id = p_account_id
      and id = v_inspection_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Kalite kontrol kaydı bulunamadı.';
    end if;

    if v_inspection.status not in (
      'in_progress',
      'waiting_result'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Kalite kontrol sonucu yalnızca devam eden veya sonuç bekleyen kontrolde kaydedilebilir.';
    end if;

    select *
    into v_item
    from public.warehouse_quality_inspection_items
    where account_id = p_account_id
      and inspection_id = v_inspection_id
      and id = v_inspection_item_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Kalite kontrol satırı bulunamadı.';
    end if;

    v_total_allocated :=
      v_accepted_quantity
      + v_rejected_quantity
      + v_conditional_quantity
      + v_hold_quantity;

    if v_total_allocated <> v_item.inspected_quantity then
      raise exception using
        errcode = '22023',
        message =
          'Kabul, red, koşullu ve bekletilen miktarların toplamı kontrol miktarına eşit olmalıdır.';
    end if;

    if v_decision = 'accepted'
      and v_accepted_quantity <> v_item.inspected_quantity
    then
      raise exception using
        errcode = '22023',
        message = 'Başarılı sonuçta tüm miktar kabul edilmiş olmalıdır.';
    end if;

    if v_decision = 'conditionally_accepted'
      and v_conditional_quantity = 0
    then
      raise exception using
        errcode = '22023',
        message = 'Koşullu kabul sonucunda koşullu kabul miktarı sıfır olamaz.';
    end if;

    if v_decision = 'rejected'
      and v_rejected_quantity = 0
    then
      raise exception using
        errcode = '22023',
        message = 'Red sonucunda red miktarı sıfır olamaz.';
    end if;

    if v_decision = 'hold'
      and v_hold_quantity = 0
    then
      raise exception using
        errcode = '22023',
        message = 'Bekletme sonucunda bekletilen miktar sıfır olamaz.';
    end if;

    if v_decision in (
      'rework',
      'scrap',
      'return_to_supplier'
    )
    and v_rejected_quantity = 0
    then
      raise exception using
        errcode = '22023',
        message =
          'İade, hurda veya yeniden işleme kararında red miktarı sıfır olamaz.';
    end if;

    if v_payload ? 'measuredValue'
      and v_payload -> 'measuredValue' <> 'null'::jsonb
      and jsonb_typeof(
        v_payload -> 'measuredValue'
      ) not in ('object', 'array', 'string', 'number', 'boolean')
    then
      raise exception using
        errcode = '22023',
        message = 'Ölçülen değer geçerli JSON olmalıdır.';
    end if;

    v_measured_value :=
      case
        when v_payload ? 'measuredValue'
          and v_payload -> 'measuredValue' <> 'null'::jsonb
        then v_payload -> 'measuredValue'
        else null
      end;

    v_notes :=
      nullif(
        btrim(
          v_payload ->> 'notes'
        ),
        ''
      );

    update public.warehouse_quality_inspection_items
    set
      accepted_quantity = v_accepted_quantity,
      rejected_quantity = v_rejected_quantity,
      conditional_quantity = v_conditional_quantity,
      hold_quantity = v_hold_quantity,
      decision = v_decision,
      measured_value = v_measured_value,
      notes = v_notes,
      inspected_by = v_user_id,
      inspected_at = v_now,
      updated_at = v_now
    where account_id = p_account_id
      and inspection_id = v_inspection_id
      and id = v_inspection_item_id
    returning *
    into v_item;

    update public.warehouse_quality_inspections
    set
      status = 'waiting_result',
      updated_at = v_now
    where account_id = p_account_id
      and id = v_inspection_id
      and status = 'in_progress';

    v_result :=
      jsonb_build_object(
        'action', v_action,
        'inspectionId', v_inspection_id,
        'inspectionItemId', v_item.id,
        'decision', v_item.decision,
        'acceptedQuantity', v_item.accepted_quantity,
        'rejectedQuantity', v_item.rejected_quantity,
        'conditionalQuantity', v_item.conditional_quantity,
        'holdQuantity', v_item.hold_quantity
      );

  -- ==========================================================
  -- COMPLETE
  -- ==========================================================

  elsif v_action = 'complete' then

    v_inspection_id :=
      nullif(
        btrim(
          v_payload ->> 'inspectionId'
        ),
        ''
      )::uuid;

    if v_inspection_id is null then
      raise exception using
        errcode = '22023',
        message = 'Kalite kontrol kimliği zorunludur.';
    end if;

    select *
    into v_inspection
    from public.warehouse_quality_inspections
    where account_id = p_account_id
      and id = v_inspection_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Kalite kontrol kaydı bulunamadı.';
    end if;

    if v_inspection.status not in (
      'in_progress',
      'waiting_result'
    ) then
      raise exception using
        errcode = '22023',
        message =
          'Yalnızca devam eden veya sonuç bekleyen kalite kontrol tamamlanabilir.';
    end if;

    perform 1
    from public.warehouse_quality_inspection_items
    where account_id = p_account_id
      and inspection_id = v_inspection_id
    limit 1;

    if not found then
      raise exception using
        errcode = '22023',
        message =
          'Kalite kontrol tamamlanmadan önce en az bir kontrol satırı bulunmalıdır.';
    end if;

    select
      bool_or(decision = 'pending'),
      bool_or(decision in ('rejected', 'rework', 'scrap', 'return_to_supplier')),
      bool_or(decision = 'hold'),
      bool_or(decision = 'conditionally_accepted'),
      bool_or(decision = 'rework'),
      bool_or(decision = 'scrap'),
      bool_or(decision = 'return_to_supplier')
    into
      v_has_pending,
      v_has_rejected,
      v_has_hold,
      v_has_conditional,
      v_has_rework,
      v_has_scrap,
      v_has_return
    from public.warehouse_quality_inspection_items
    where account_id = p_account_id
      and inspection_id = v_inspection_id;

    if v_has_pending then
      raise exception using
        errcode = '22023',
        message =
          'Tüm kalite kontrol satırlarına sonuç verilmeden kontrol tamamlanamaz.';
    end if;

    if v_has_return then
      v_final_decision := 'return_to_supplier';
    elsif v_has_scrap then
      v_final_decision := 'scrap';
    elsif v_has_rework then
      v_final_decision := 'rework';
    elsif v_has_rejected then
      v_final_decision := 'rejected';
    elsif v_has_hold then
      v_final_decision := 'hold';
    elsif v_has_conditional then
      v_final_decision := 'conditionally_accepted';
    else
      v_final_decision := 'accepted';
    end if;

    update public.warehouse_quality_inspections
    set
      status = 'completed',
      final_decision = v_final_decision,
      completed_at = v_now,
      updated_at = v_now
    where account_id = p_account_id
      and id = v_inspection_id
    returning *
    into v_inspection;

    v_result :=
      jsonb_build_object(
        'action', v_action,
        'inspectionId', v_inspection.id,
        'inspectionNumber', v_inspection.inspection_number,
        'status', v_inspection.status,
        'finalDecision', v_inspection.final_decision,
        'completedAt', v_inspection.completed_at
      );
  end if;

  update public.warehouse_quality_result_write_requests
  set
    response_payload = v_result,
    completed_at = now()
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id;

  return v_result;
end;
$$;
revoke all on function
  public.warehouse_quality_control_result_write(
    text,
    uuid,
    uuid,
    jsonb
  )
from public;
revoke all on function
  public.warehouse_quality_control_result_write(
    text,
    uuid,
    uuid,
    jsonb
  )
from anon;
grant execute on function
  public.warehouse_quality_control_result_write(
    text,
    uuid,
    uuid,
    jsonb
  )
to authenticated;
