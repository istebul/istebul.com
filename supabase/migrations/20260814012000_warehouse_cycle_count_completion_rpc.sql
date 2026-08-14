-- =========================================================
-- WarehouseIQ — Cycle Count Completion RPC
--
-- approve_count
-- prepare_adjustments
-- approve_adjustments
-- reject_adjustments
-- process_adjustments
-- complete_count
--
-- Inventory mutation yalnız explicit process_adjustments
-- aşamasında ve tüm approved adjustment'lar preflight
-- kontrolünden geçtikten sonra yapılır.
-- =========================================================

create or replace function
  public.warehouse_cycle_count_completion_write(
    p_request_id uuid,
    p_account_id uuid,
    p_warehouse_id uuid,
    p_cycle_count_id uuid,
    p_action text,
    p_notes text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_cycle_count_completion_write$
declare
  v_user_id uuid := auth.uid();

  v_action text :=
    nullif(
      lower(
        btrim(
          coalesce(
            p_action,
            ''
          )
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

  v_result_id uuid;

  v_balance
    public.warehouse_inventory_balances%rowtype;

  v_physical_counted_at timestamptz;

  v_lot_number text;
  v_serial_number text;
  v_stock_status text;

  v_adjustment_id uuid;
  v_adjustment_type text;
  v_adjustment_quantity numeric(18, 6);

  v_prepared_count integer := 0;
  v_blocked_count integer := 0;
  v_approved_count integer := 0;
  v_rejected_count integer := 0;
  v_pending_count integer := 0;

  v_has_blocker boolean := false;

  v_now timestamptz := now();

  v_adjustment
    public.warehouse_cycle_count_adjustments%rowtype;

  v_damage_balance
    public.warehouse_inventory_balances%rowtype;

  v_primary_movement_id uuid;
  v_movement_id uuid;
  v_damage_balance_id uuid;
  v_movement_number text;
  v_movement_type text;

  v_processed_count integer := 0;
  v_posted_movement_count integer := 0;

  v_report_summary jsonb;
  v_report_items jsonb;

  v_total_items integer := 0;
  v_matched_items integer := 0;
  v_variance_items integer := 0;
  v_recount_items integer := 0;
  v_adjusted_items integer := 0;
  v_damaged_items integer := 0;

  v_accuracy_percentage numeric(12, 6);
  v_total_absolute_variance_quantity numeric(18, 6);
  v_total_absolute_variance_value numeric(18, 6);

  v_response jsonb;
begin
  -- =======================================================
  -- AUTH / INPUT
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
    or v_action is null then

    raise exception using
      errcode = '22023',
      message =
        'İstek, firma, depo, sayım ve işlem kimlikleri zorunludur.';
  end if;

  if length(
    coalesce(
      v_notes,
      ''
    )
  ) > 1000 then

    raise exception using
      errcode = '22023',
      message =
        'Sayım işlem notu en fazla 1000 karakter olabilir.';
  end if;

  if v_action not in (
    'approve_count',
    'prepare_adjustments',
    'approve_adjustments',
    'reject_adjustments',
    'process_adjustments',
    'complete_count'
  ) then

    raise exception using
      errcode = '22023',
      message =
        'Desteklenmeyen Cycle Count tamamlama işlemi.';
  end if;

  -- =======================================================
  -- ROLE CONTRACT
  -- =======================================================

  if v_action = 'prepare_adjustments' then
    if not coalesce(
      public.warehouse_has_account_role(
        p_account_id,
        array[
          'owner',
          'admin',
          'warehouse_manager',
          'supervisor',
          'inventory_controller'
        ]::text[]
      ),
      false
    ) then

      raise exception using
        errcode = '42501',
        message =
          'Sayım stok düzeltmesi hazırlama yetkiniz bulunmuyor.';
    end if;

  else
    if not coalesce(
      public.warehouse_has_account_role(
        p_account_id,
        array[
          'owner',
          'admin',
          'warehouse_manager',
          'inventory_controller'
        ]::text[]
      ),
      false
    ) then

      raise exception using
        errcode = '42501',
        message =
          'Bu Cycle Count tamamlama işlemi için yetkiniz bulunmuyor.';
    end if;
  end if;

  -- =======================================================
  -- IDEMPOTENCY
  -- =======================================================

  v_payload :=
    jsonb_build_object(
      'warehouseId',
        p_warehouse_id,
      'cycleCountId',
        p_cycle_count_id,
      'action',
        v_action,
      'notes',
        v_notes
    );

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

  if found then
    if v_existing_user_id <> v_user_id
      or v_existing_action <> v_action
      or v_existing_payload <> v_payload then

      raise exception using
        errcode = '23505',
        message =
          'Aynı işlem kimliği farklı bir Cycle Count işleminde kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '55000',
      message =
        'Aynı Cycle Count işlemi halen işleniyor. Tekrar deneyin.';
  end if;

  insert into
    public.warehouse_cycle_count_write_requests (
      account_id,
      request_id,
      user_id,
      action,
      request_payload,
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
        errcode = '55000',
        message =
          'Cycle Count idempotency kaydı kilitlenemedi.';
    end if;

    if v_existing_user_id <> v_user_id
      or v_existing_action <> v_action
      or v_existing_payload <> v_payload then

      raise exception using
        errcode = '23505',
        message =
          'Aynı işlem kimliği farklı bir Cycle Count işleminde kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '55000',
      message =
        'Aynı Cycle Count işlemi halen işleniyor. Tekrar deneyin.';
  end if;

  -- =======================================================
  -- PARENT LOCK
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
        'Seçili depoda Cycle Count kaydı bulunamadı.';
  end if;

  if v_count.status = 'completed' then
    raise exception using
      errcode = '55000',
      message =
        'Tamamlanmış Cycle Count üzerinde yeni işlem yapılamaz.';
  end if;

  -- =======================================================
  -- APPROVE COUNT — NO INVENTORY MUTATION
  -- =======================================================

  if v_action = 'approve_count' then
    if v_count.status <> 'counted' then
      raise exception using
        errcode = '55000',
        message =
          'Yalnız sayımı tamamlanmış Cycle Count doğrudan onaylanabilir.';
    end if;

    if exists (
      select 1
      from public.warehouse_cycle_count_items i
      where i.account_id =
          p_account_id
        and i.cycle_count_id =
          p_cycle_count_id
        and (
          i.recount_required = true
          or i.adjustment_required = true
          or i.status in (
            'recount_required',
            'under_review'
          )
        )
    ) then

      raise exception using
        errcode = '55000',
        message =
          'Yeniden sayım veya inceleme bekleyen satırlar varken Cycle Count onaylanamaz.';
    end if;

    if exists (
      select 1
      from public.warehouse_cycle_count_tasks t
      where t.account_id =
          p_account_id
        and t.cycle_count_id =
          p_cycle_count_id
        and t.status not in (
          'completed',
          'cancelled'
        )
    ) then

      raise exception using
        errcode = '55000',
        message =
          'Açık sayım görevleri varken Cycle Count onaylanamaz.';
    end if;

    update public.warehouse_cycle_count_items
    set
      status =
        'approved',

      approved_by =
        v_user_id,

      approved_at =
        coalesce(
          approved_at,
          v_now
        ),

      updated_at =
        v_now
    where account_id =
        p_account_id
      and cycle_count_id =
        p_cycle_count_id
      and status =
        'counted';

    get diagnostics
      v_approved_count =
        row_count;

    update public.warehouse_cycle_counts
    set
      status =
        'approved',

      approved_at =
        coalesce(
          approved_at,
          v_now
        ),

      updated_at =
        v_now
    where account_id =
        p_account_id
      and id =
        p_cycle_count_id;

    v_response :=
      jsonb_build_object(
        'requestId',
          p_request_id,
        'cycleCountId',
          p_cycle_count_id,
        'action',
          v_action,
        'status',
          'approved',
        'approvedItemCount',
          v_approved_count
      );

  -- =======================================================
  -- PREPARE ADJUSTMENTS — NO INVENTORY MUTATION
  -- =======================================================

  elsif v_action = 'prepare_adjustments' then
    if v_count.status <> 'under_review' then
      raise exception using
        errcode = '55000',
        message =
          'Stok düzeltmesi yalnız inceleme durumundaki Cycle Count için hazırlanabilir.';
    end if;

    for v_item in
      select *
      from public.warehouse_cycle_count_items
      where account_id =
          p_account_id
        and cycle_count_id =
          p_cycle_count_id
        and adjustment_required = true
      order by line_number
      for update
    loop
      if v_item.final_count_quantity is null then
        raise exception using
          errcode = '55000',
          message =
            'Stok düzeltmesi için final fiziksel sayım miktarı zorunludur.';
      end if;

      v_physical_counted_at :=
        coalesce(
          v_item.recounted_at,
          v_item.counted_at
        );

      if v_physical_counted_at is null then
        raise exception using
          errcode = '55000',
          message =
            'Stok düzeltmesi için fiziksel sayım zamanı bulunamadı.';
      end if;

      if v_item.final_count_quantity <
        v_item.damaged_quantity then

        raise exception using
          errcode = '22023',
          message =
            'Hasarlı miktar final fiziksel sayım miktarından büyük olamaz.';
      end if;

      select r.id
      into v_result_id
      from public.warehouse_cycle_count_results r
      where r.account_id =
          p_account_id
        and r.cycle_count_id =
          p_cycle_count_id
        and r.cycle_count_item_id =
          v_item.id
      order by
        case
          when r.evaluation_stage = 'recount'
            then 0
          else 1
        end,
        r.calculated_at desc
      limit 1;

      if v_result_id is null then
        raise exception using
          errcode = '55000',
          message =
            'Sayım değerlendirme sonucu bulunmadan stok düzeltmesi hazırlanamaz.';
      end if;

      v_lot_number :=
        nullif(
          btrim(
            coalesce(
              v_item.tracking ->> 'lotNumber',
              ''
            )
          ),
          ''
        );

      v_serial_number :=
        nullif(
          btrim(
            coalesce(
              v_item.tracking ->> 'serialNumber',
              ''
            )
          ),
          ''
        );

      v_stock_status :=
        coalesce(
          nullif(
            btrim(
              coalesce(
                v_item.stock_status,
                ''
              )
            ),
            ''
          ),
          'available'
        );

      v_balance := null;

      if v_item.inventory_balance_id is not null then
        select *
        into v_balance
        from public.warehouse_inventory_balances b
        where b.id =
            v_item.inventory_balance_id
          and b.account_id =
            p_account_id
          and b.warehouse_id =
            p_warehouse_id
          and b.location_id =
            v_item.location_id
          and b.product_id =
            v_item.product_id
          and b.sku_id is not distinct from
            v_item.sku_id
          and b.lot_number is not distinct from
            v_lot_number
          and b.serial_number is not distinct from
            v_serial_number
          and b.stock_status =
            v_stock_status
        for update;
      end if;

      if v_balance.id is null then
        select *
        into v_balance
        from public.warehouse_inventory_balances b
        where b.account_id =
            p_account_id
          and b.warehouse_id =
            p_warehouse_id
          and b.location_id =
            v_item.location_id
          and b.product_id =
            v_item.product_id
          and b.sku_id is not distinct from
            v_item.sku_id
          and b.lot_number is not distinct from
            v_lot_number
          and b.serial_number is not distinct from
            v_serial_number
          and b.stock_status =
            v_stock_status
        for update;
      end if;

      if v_balance.id is null then
        insert into
          public.warehouse_cycle_count_exceptions (
            account_id,
            cycle_count_id,
            cycle_count_item_id,
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
          v_item.id,
          p_warehouse_id,
          v_item.location_id,
          v_item.product_id,
          v_lot_number,
          v_serial_number,
          'adjustment_failed',
          'Sayım satırı için kesin stok bakiyesi bulunamadı. Stok uzlaştırması gereklidir.',
          false,
          v_now
        )
        on conflict do nothing;

        update public.warehouse_cycle_count_items
        set
          status =
            'under_review',
          updated_at =
            v_now
        where account_id =
            p_account_id
          and cycle_count_id =
            p_cycle_count_id
          and id =
            v_item.id;

        v_blocked_count :=
          v_blocked_count + 1;

        continue;
      end if;

      if v_balance.unit <> v_item.unit then
        insert into
          public.warehouse_cycle_count_exceptions (
            account_id,
            cycle_count_id,
            cycle_count_item_id,
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
          v_item.id,
          p_warehouse_id,
          v_item.location_id,
          v_item.product_id,
          v_lot_number,
          v_serial_number,
          'unit_mismatch',
          'Sayım birimi ile güncel stok bakiye birimi uyuşmuyor.',
          false,
          v_now
        )
        on conflict do nothing;

        update public.warehouse_cycle_count_items
        set
          status =
            'under_review',
          updated_at =
            v_now
        where account_id =
            p_account_id
          and cycle_count_id =
            p_cycle_count_id
          and id =
            v_item.id;

        v_blocked_count :=
          v_blocked_count + 1;

        continue;
      end if;

      if v_balance.last_movement_at is not null
        and v_balance.last_movement_at >
          v_physical_counted_at then

        insert into
          public.warehouse_cycle_count_exceptions (
            account_id,
            cycle_count_id,
            cycle_count_item_id,
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
          v_item.id,
          p_warehouse_id,
          v_item.location_id,
          v_item.product_id,
          v_lot_number,
          v_serial_number,
          'inventory_movement_detected',
          'Fiziksel sayımdan sonra stok hareketi oluştu. Yeni fiziksel doğrulama gereklidir.',
          false,
          v_now
        )
        on conflict do nothing;

        update public.warehouse_cycle_count_items
        set
          status =
            'under_review',
          updated_at =
            v_now
        where account_id =
            p_account_id
          and cycle_count_id =
            p_cycle_count_id
          and id =
            v_item.id;

        v_blocked_count :=
          v_blocked_count + 1;

        continue;
      end if;

      if exists (
        select 1
        from public.warehouse_cycle_count_adjustments a
        where a.account_id =
            p_account_id
          and a.cycle_count_item_id =
            v_item.id
          and a.status not in (
            'failed',
            'cancelled',
            'completed'
          )
      ) then
        continue;
      end if;

      if v_item.damaged_quantity > 0 then
        v_adjustment_type :=
          'damage';

        v_adjustment_quantity :=
          greatest(
            v_item.damaged_quantity,
            abs(
              v_item.final_count_quantity -
              v_balance.quantity
            )
          );

      elsif v_balance.quantity <
        v_item.final_count_quantity then

        v_adjustment_type :=
          'increase';

        v_adjustment_quantity :=
          v_item.final_count_quantity -
          v_balance.quantity;

      else
        v_adjustment_type :=
          'decrease';

        v_adjustment_quantity :=
          v_balance.quantity -
          v_item.final_count_quantity;
      end if;

      v_adjustment_id :=
        gen_random_uuid();

      insert into
        public.warehouse_cycle_count_adjustments (
          id,
          account_id,
          cycle_count_id,
          cycle_count_item_id,
          result_id,
          type,
          status,
          warehouse_id,
          location_id,
          product_id,
          sku_id,
          quantity,
          unit,
          previous_quantity,
          adjusted_quantity,
          stock_status,
          target_stock_status,
          requested_by,
          requested_at,
          notes,
          created_at,
          updated_at
        )
      values (
        v_adjustment_id,
        p_account_id,
        p_cycle_count_id,
        v_item.id,
        v_result_id,
        v_adjustment_type,
        'approval_required',
        p_warehouse_id,
        v_item.location_id,
        v_item.product_id,
        v_item.sku_id,
        v_adjustment_quantity,
        v_item.unit,
        v_balance.quantity,
        v_item.final_count_quantity,
        v_stock_status,
        case
          when v_item.damaged_quantity > 0
            then 'damaged'
          else null
        end,
        v_user_id,
        v_now,
        v_notes,
        v_now,
        v_now
      );

      insert into
        public.warehouse_cycle_count_approvals (
          account_id,
          cycle_count_id,
          cycle_count_item_id,
          adjustment_id,
          status,
          level,
          requested_by,
          requested_at,
          notes,
          created_at,
          updated_at
        )
      values (
        p_account_id,
        p_cycle_count_id,
        v_item.id,
        v_adjustment_id,
        'pending',
        1,
        v_user_id,
        v_now,
        v_notes,
        v_now,
        v_now
      );

      insert into
        public.warehouse_cycle_count_exceptions (
          account_id,
          cycle_count_id,
          cycle_count_item_id,
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
        v_item.id,
        p_warehouse_id,
        v_item.location_id,
        v_item.product_id,
        v_lot_number,
        v_serial_number,
        'approval_required',
        'Sayım farkı için stok düzeltmesi yönetici onayı bekliyor.',
        false,
        v_now
      )
      on conflict do nothing;

      v_prepared_count :=
        v_prepared_count + 1;
    end loop;

    select count(*)
    into v_pending_count
    from public.warehouse_cycle_count_approvals ap
    where ap.account_id =
        p_account_id
      and ap.cycle_count_id =
        p_cycle_count_id
      and ap.status =
        'pending';

    v_response :=
      jsonb_build_object(
        'requestId',
          p_request_id,
        'cycleCountId',
          p_cycle_count_id,
        'action',
          v_action,
        'status',
          case
            when v_blocked_count > 0
              then 'blocked'
            else 'approval_required'
          end,
        'preparedAdjustmentCount',
          v_prepared_count,
        'blockedItemCount',
          v_blocked_count,
        'pendingApprovalCount',
          v_pending_count
      );

  -- =======================================================
  -- APPROVE ADJUSTMENTS — NO INVENTORY MUTATION
  -- =======================================================

  elsif v_action = 'approve_adjustments' then
    if v_count.status <> 'under_review' then
      raise exception using
        errcode = '55000',
        message =
          'Stok düzeltmesi onayı yalnız inceleme durumundaki Cycle Count için verilebilir.';
    end if;

    if not exists (
      select 1
      from public.warehouse_cycle_count_approvals ap
      where ap.account_id =
          p_account_id
        and ap.cycle_count_id =
          p_cycle_count_id
        and ap.status =
          'pending'
    ) then

      raise exception using
        errcode = '55000',
        message =
          'Onay bekleyen stok düzeltmesi bulunmuyor.';
    end if;

    update public.warehouse_cycle_count_approvals ap
    set
      status =
        'approved',

      approver_id =
        v_user_id,

      approved_by =
        v_user_id,

      approved_at =
        v_now,

      notes =
        coalesce(
          v_notes,
          ap.notes
        ),

      updated_at =
        v_now
    where ap.account_id =
        p_account_id
      and ap.cycle_count_id =
        p_cycle_count_id
      and ap.status =
        'pending';

    get diagnostics
      v_approved_count =
        row_count;

    update public.warehouse_cycle_count_adjustments a
    set
      status =
        'approved',

      approved_by =
        v_user_id,

      approved_at =
        v_now,

      notes =
        coalesce(
          v_notes,
          a.notes
        ),

      updated_at =
        v_now
    where a.account_id =
        p_account_id
      and a.cycle_count_id =
        p_cycle_count_id
      and a.status =
        'approval_required'
      and exists (
        select 1
        from public.warehouse_cycle_count_approvals ap
        where ap.account_id =
            a.account_id
          and ap.adjustment_id =
            a.id
          and ap.status =
            'approved'
      );

    update public.warehouse_cycle_count_items i
    set
      status =
        'approved',

      approved_by =
        v_user_id,

      approved_at =
        coalesce(
          i.approved_at,
          v_now
        ),

      updated_at =
        v_now
    where i.account_id =
        p_account_id
      and i.cycle_count_id =
        p_cycle_count_id
      and (
        (
          i.adjustment_required = true
          and exists (
            select 1
            from public.warehouse_cycle_count_adjustments a
            where a.account_id =
                i.account_id
              and a.cycle_count_item_id =
                i.id
              and a.status =
                'approved'
          )
        )
        or (
          i.adjustment_required = false
          and i.status =
            'counted'
        )
      );

    update public.warehouse_cycle_count_exceptions e
    set
      resolved =
        true,

      resolved_by =
        v_user_id,

      resolved_at =
        v_now,

      resolution_notes =
        coalesce(
          v_notes,
          'Stok düzeltmesi onaylandı.'
        )
    where e.account_id =
        p_account_id
      and e.cycle_count_id =
        p_cycle_count_id
      and e.type =
        'approval_required'
      and e.resolved =
        false;

    select exists (
      select 1
      from public.warehouse_cycle_count_items i
      where i.account_id =
          p_account_id
        and i.cycle_count_id =
          p_cycle_count_id
        and (
          i.status in (
            'under_review',
            'recount_required'
          )
          or i.recount_required = true
          or (
            i.adjustment_required = true
            and not exists (
              select 1
              from public.warehouse_cycle_count_adjustments a
              where a.account_id =
                  i.account_id
                and a.cycle_count_item_id =
                  i.id
                and a.status =
                  'approved'
            )
          )
        )
    )
    into v_has_blocker;

    update public.warehouse_cycle_counts
    set
      status =
        case
          when v_has_blocker
            then 'under_review'
          else 'approved'
        end,

      approved_at =
        case
          when v_has_blocker
            then approved_at
          else coalesce(
            approved_at,
            v_now
          )
        end,

      updated_at =
        v_now
    where account_id =
        p_account_id
      and id =
        p_cycle_count_id;

    v_response :=
      jsonb_build_object(
        'requestId',
          p_request_id,
        'cycleCountId',
          p_cycle_count_id,
        'action',
          v_action,
        'status',
          case
            when v_has_blocker
              then 'under_review'
            else 'approved'
          end,
        'approvedAdjustmentCount',
          v_approved_count
      );

  -- =======================================================
  -- REJECT ADJUSTMENTS — NO INVENTORY MUTATION
  -- =======================================================

  elsif v_action = 'reject_adjustments' then
    if v_count.status <> 'under_review' then
      raise exception using
        errcode = '55000',
        message =
          'Stok düzeltmesi reddi yalnız inceleme durumundaki Cycle Count için yapılabilir.';
    end if;

    if not exists (
      select 1
      from public.warehouse_cycle_count_approvals ap
      where ap.account_id =
          p_account_id
        and ap.cycle_count_id =
          p_cycle_count_id
        and ap.status =
          'pending'
    ) then

      raise exception using
        errcode = '55000',
        message =
          'Reddedilebilecek bekleyen stok düzeltmesi bulunmuyor.';
    end if;

    update public.warehouse_cycle_count_approvals ap
    set
      status =
        'rejected',

      approver_id =
        v_user_id,

      rejected_by =
        v_user_id,

      rejected_at =
        v_now,

      rejection_reason =
        coalesce(
          v_notes,
          'Stok düzeltmesi reddedildi.'
        ),

      updated_at =
        v_now
    where ap.account_id =
        p_account_id
      and ap.cycle_count_id =
        p_cycle_count_id
      and ap.status =
        'pending';

    get diagnostics
      v_rejected_count =
        row_count;

    update public.warehouse_cycle_count_adjustments a
    set
      status =
        'cancelled',

      notes =
        coalesce(
          v_notes,
          a.notes
        ),

      updated_at =
        v_now
    where a.account_id =
        p_account_id
      and a.cycle_count_id =
        p_cycle_count_id
      and a.status =
        'approval_required'
      and exists (
        select 1
        from public.warehouse_cycle_count_approvals ap
        where ap.account_id =
            a.account_id
          and ap.adjustment_id =
            a.id
          and ap.status =
            'rejected'
      );

    update public.warehouse_cycle_count_items i
    set
      status =
        'under_review',

      updated_at =
        v_now
    where i.account_id =
        p_account_id
      and i.cycle_count_id =
        p_cycle_count_id
      and i.adjustment_required = true
      and exists (
        select 1
        from public.warehouse_cycle_count_adjustments a
        where a.account_id =
            i.account_id
          and a.cycle_count_item_id =
            i.id
          and a.status =
            'cancelled'
      );

    update public.warehouse_cycle_counts
    set
      status =
        'under_review',

      updated_at =
        v_now
    where account_id =
        p_account_id
      and id =
        p_cycle_count_id;

    v_response :=
      jsonb_build_object(
        'requestId',
          p_request_id,
        'cycleCountId',
          p_cycle_count_id,
        'action',
          v_action,
        'status',
          'under_review',
        'rejectedAdjustmentCount',
          v_rejected_count
      );

  -- =======================================================
  -- PROCESS ADJUSTMENTS
  -- =======================================================

  elsif v_action = 'process_adjustments' then
    if v_count.status <> 'approved' then
      raise exception using
        errcode = '55000',
        message =
          'Stok düzeltmeleri yalnız onaylanmış Cycle Count üzerinde uygulanabilir.';
    end if;

    if not exists (
      select 1
      from public.warehouse_cycle_count_adjustments a
      where a.account_id =
          p_account_id
        and a.cycle_count_id =
          p_cycle_count_id
        and a.status =
          'approved'
    ) then

      raise exception using
        errcode = '55000',
        message =
          'Uygulanabilecek onaylı stok düzeltmesi bulunmuyor.';
    end if;

    -- -------------------------------------------------------
    -- PREFLIGHT
    --
    -- Tüm adjustment / item / source balance kayıtları önce
    -- kilitlenir ve doğrulanır.
    --
    -- Bu loop bitmeden inventory balance veya movement
    -- mutation YOKTUR.
    -- -------------------------------------------------------

    v_has_blocker :=
      false;

    for v_adjustment in
      select *
      from public.warehouse_cycle_count_adjustments
      where account_id =
          p_account_id
        and cycle_count_id =
          p_cycle_count_id
        and status =
          'approved'
      order by created_at, id
      for update
    loop
      select *
      into v_item
      from public.warehouse_cycle_count_items
      where account_id =
          p_account_id
        and cycle_count_id =
          p_cycle_count_id
        and id =
          v_adjustment.cycle_count_item_id
      for update;

      if not found
        or v_item.final_count_quantity is null then

        update public.warehouse_cycle_count_adjustments
        set
          status =
            'failed',

          failure_reason =
            'Sayım satırı veya final fiziksel miktar bulunamadı.',

          updated_at =
            v_now
        where account_id =
            p_account_id
          and id =
            v_adjustment.id;

        v_has_blocker :=
          true;

        exit;
      end if;

      v_physical_counted_at :=
        coalesce(
          v_item.recounted_at,
          v_item.counted_at
        );

      if v_physical_counted_at is null then
        update public.warehouse_cycle_count_adjustments
        set
          status =
            'failed',

          failure_reason =
            'Fiziksel sayım zamanı bulunamadı.',

          updated_at =
            v_now
        where account_id =
            p_account_id
          and id =
            v_adjustment.id;

        update public.warehouse_cycle_count_items
        set
          status =
            'under_review',

          updated_at =
            v_now
        where account_id =
            p_account_id
          and cycle_count_id =
            p_cycle_count_id
          and id =
            v_item.id;

        v_has_blocker :=
          true;

        exit;
      end if;

      v_lot_number :=
        nullif(
          btrim(
            coalesce(
              v_item.tracking ->> 'lotNumber',
              ''
            )
          ),
          ''
        );

      v_serial_number :=
        nullif(
          btrim(
            coalesce(
              v_item.tracking ->> 'serialNumber',
              ''
            )
          ),
          ''
        );

      v_stock_status :=
        coalesce(
          nullif(
            btrim(
              coalesce(
                v_adjustment.stock_status,
                v_item.stock_status,
                ''
              )
            ),
            ''
          ),
          'available'
        );

      v_balance := null;

      select *
      into v_balance
      from public.warehouse_inventory_balances b
      where b.account_id =
          p_account_id
        and b.warehouse_id =
          p_warehouse_id
        and b.location_id =
          v_adjustment.location_id
        and b.product_id =
          v_adjustment.product_id
        and b.sku_id is not distinct from
          v_adjustment.sku_id
        and b.lot_number is not distinct from
          v_lot_number
        and b.serial_number is not distinct from
          v_serial_number
        and b.stock_status =
          v_stock_status
      for update;

      if v_balance.id is null
        or v_balance.unit <>
          v_adjustment.unit
        or v_balance.quantity <>
          v_adjustment.previous_quantity
        or (
          v_balance.last_movement_at is not null
          and v_balance.last_movement_at >
            v_physical_counted_at
        ) then

        update public.warehouse_cycle_count_adjustments
        set
          status =
            'failed',

          failure_reason =
            'Stok bakiyesi fiziksel sayım snapshotı ile artık uyuşmuyor.',

          updated_at =
            v_now
        where account_id =
            p_account_id
          and id =
            v_adjustment.id;

        update public.warehouse_cycle_count_items
        set
          status =
            'under_review',

          updated_at =
            v_now
        where account_id =
            p_account_id
          and cycle_count_id =
            p_cycle_count_id
          and id =
            v_item.id;

        insert into
          public.warehouse_cycle_count_exceptions (
            account_id,
            cycle_count_id,
            cycle_count_item_id,
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
          v_item.id,
          p_warehouse_id,
          v_item.location_id,
          v_item.product_id,
          v_lot_number,
          v_serial_number,
          'inventory_movement_detected',
          'Onay sonrasında stok bakiyesi değişti. Yeni fiziksel doğrulama gereklidir.',
          false,
          v_now
        )
        on conflict do nothing;

        v_has_blocker :=
          true;

        exit;
      end if;

      if v_item.damaged_quantity >
          v_item.final_count_quantity then

        update public.warehouse_cycle_count_adjustments
        set
          status =
            'failed',

          failure_reason =
            'Hasarlı miktar final fiziksel miktardan büyük.',

          updated_at =
            v_now
        where account_id =
            p_account_id
          and id =
            v_adjustment.id;

        update public.warehouse_cycle_count_items
        set
          status =
            'under_review',

          updated_at =
            v_now
        where account_id =
            p_account_id
          and cycle_count_id =
            p_cycle_count_id
          and id =
            v_item.id;

        v_has_blocker :=
          true;

        exit;
      end if;

      -- Damage split uygulanacaksa target damaged balance da
      -- mutation başlamadan önce kilitlenir.
      if v_item.damaged_quantity > 0
        and v_stock_status <> 'damaged' then

        v_damage_balance := null;

        select *
        into v_damage_balance
        from public.warehouse_inventory_balances b
        where b.account_id =
            p_account_id
          and b.warehouse_id =
            p_warehouse_id
          and b.location_id =
            v_adjustment.location_id
          and b.product_id =
            v_adjustment.product_id
          and b.sku_id is not distinct from
            v_adjustment.sku_id
          and b.lot_number is not distinct from
            v_lot_number
          and b.serial_number is not distinct from
            v_serial_number
          and b.stock_status =
            'damaged'
        for update;

        if v_damage_balance.id is not null
          and v_damage_balance.unit <>
            v_adjustment.unit then

          update public.warehouse_cycle_count_adjustments
          set
            status =
              'failed',

            failure_reason =
              'Hasarlı stok bakiye birimi sayım birimiyle uyuşmuyor.',

            updated_at =
              v_now
          where account_id =
              p_account_id
            and id =
              v_adjustment.id;

          update public.warehouse_cycle_count_items
          set
            status =
              'under_review',

            updated_at =
              v_now
          where account_id =
              p_account_id
            and cycle_count_id =
              p_cycle_count_id
            and id =
              v_item.id;

          v_has_blocker :=
            true;

          exit;
        end if;
      end if;
    end loop;

    if v_has_blocker then
      update public.warehouse_cycle_counts
      set
        status =
          'under_review',

        updated_at =
          v_now
      where account_id =
          p_account_id
        and id =
          p_cycle_count_id;

      v_response :=
        jsonb_build_object(
          'requestId',
            p_request_id,
          'cycleCountId',
            p_cycle_count_id,
          'action',
            v_action,
          'status',
            'blocked',
          'requiresPhysicalRecount',
            true,
          'processedAdjustmentCount',
            0,
          'postedMovementCount',
            0
        );

    else
      -- -----------------------------------------------------
      -- POSTING
      --
      -- Preflight tamamen başarılı olduktan sonra başlar.
      -- -----------------------------------------------------

      for v_adjustment in
        select *
        from public.warehouse_cycle_count_adjustments
        where account_id =
            p_account_id
          and cycle_count_id =
            p_cycle_count_id
          and status =
            'approved'
        order by created_at, id
        for update
      loop
        select *
        into v_item
        from public.warehouse_cycle_count_items
        where account_id =
            p_account_id
          and cycle_count_id =
            p_cycle_count_id
          and id =
            v_adjustment.cycle_count_item_id
        for update;

        v_lot_number :=
          nullif(
            btrim(
              coalesce(
                v_item.tracking ->> 'lotNumber',
                ''
              )
            ),
            ''
          );

        v_serial_number :=
          nullif(
            btrim(
              coalesce(
                v_item.tracking ->> 'serialNumber',
                ''
              )
            ),
            ''
          );

        v_stock_status :=
          coalesce(
            nullif(
              btrim(
                coalesce(
                  v_adjustment.stock_status,
                  v_item.stock_status,
                  ''
                )
              ),
              ''
            ),
            'available'
          );

        select *
        into v_balance
        from public.warehouse_inventory_balances b
        where b.account_id =
            p_account_id
          and b.warehouse_id =
            p_warehouse_id
          and b.location_id =
            v_adjustment.location_id
          and b.product_id =
            v_adjustment.product_id
          and b.sku_id is not distinct from
            v_adjustment.sku_id
          and b.lot_number is not distinct from
            v_lot_number
          and b.serial_number is not distinct from
            v_serial_number
          and b.stock_status =
            v_stock_status
        for update;

        v_primary_movement_id :=
          null;

        -- ---------------------------------------------------
        -- QUANTITY CORRECTION
        -- ---------------------------------------------------

        if v_balance.quantity <>
          v_item.final_count_quantity then

          v_movement_id :=
            gen_random_uuid();

          v_primary_movement_id :=
            v_movement_id;

          v_movement_type :=
            case
              when v_balance.quantity <
                v_item.final_count_quantity
                then 'count_surplus'
              else 'count_shortage'
            end;

          v_movement_number :=
            'HRK-'
            || to_char(
              v_now,
              'YYYYMMDD'
            )
            || '-'
            || lpad(
              nextval(
                'public.warehouse_inventory_movement_number_seq'
              )::text,
              6,
              '0'
            );

          insert into
            public.warehouse_inventory_movements (
              id,
              account_id,
              movement_number,
              movement_type,
              direction,
              warehouse_id,
              location_id,
              product_id,
              sku_id,
              stock_status,
              quantity,
              unit,
              lot_number,
              serial_number,
              reference_type,
              reference_id,
              reference_number,
              reason,
              notes,
              transaction_group_id,
              occurred_at,
              created_by
            )
          values (
            v_movement_id,
            p_account_id,
            v_movement_number,
            v_movement_type,
            'adjustment',
            p_warehouse_id,
            v_adjustment.location_id,
            v_adjustment.product_id,
            v_adjustment.sku_id,
            v_stock_status,
            abs(
              v_item.final_count_quantity -
              v_balance.quantity
            ),
            v_adjustment.unit,
            v_lot_number,
            v_serial_number,
            'cycle_count',
            p_cycle_count_id::text,
            v_count.cycle_count_number,
            'Cycle Count fiziksel stok düzeltmesi',
            v_notes,
            v_adjustment.id::text,
            v_now,
            v_user_id
          );

          update public.warehouse_inventory_balances
          set
            quantity =
              v_item.final_count_quantity,

            last_movement_id =
              v_movement_id,

            last_movement_at =
              v_now,

            updated_at =
              v_now
          where account_id =
              p_account_id
            and id =
              v_balance.id;

          v_posted_movement_count :=
            v_posted_movement_count + 1;

          -- Source balance değiştiği için local row snapshotını
          -- final physical quantity ile güncelle.
          v_balance.quantity :=
            v_item.final_count_quantity;

          v_balance.last_movement_id :=
            v_movement_id;

          v_balance.last_movement_at :=
            v_now;
        end if;

        -- ---------------------------------------------------
        -- DAMAGE STATUS SPLIT
        -- ---------------------------------------------------

        if v_item.damaged_quantity > 0
          and v_stock_status <> 'damaged' then

          v_movement_id :=
            gen_random_uuid();

          if v_primary_movement_id is null then
            v_primary_movement_id :=
              v_movement_id;
          end if;

          v_movement_number :=
            'HRK-'
            || to_char(
              v_now,
              'YYYYMMDD'
            )
            || '-'
            || lpad(
              nextval(
                'public.warehouse_inventory_movement_number_seq'
              )::text,
              6,
              '0'
            );

          insert into
            public.warehouse_inventory_movements (
              id,
              account_id,
              movement_number,
              movement_type,
              direction,
              warehouse_id,
              location_id,
              product_id,
              sku_id,
              stock_status,
              quantity,
              unit,
              lot_number,
              serial_number,
              reference_type,
              reference_id,
              reference_number,
              reason,
              notes,
              transaction_group_id,
              occurred_at,
              created_by
            )
          values (
            v_movement_id,
            p_account_id,
            v_movement_number,
            'damage',
            'adjustment',
            p_warehouse_id,
            v_adjustment.location_id,
            v_adjustment.product_id,
            v_adjustment.sku_id,
            'damaged',
            v_item.damaged_quantity,
            v_adjustment.unit,
            v_lot_number,
            v_serial_number,
            'cycle_count',
            p_cycle_count_id::text,
            v_count.cycle_count_number,
            'Cycle Count hasarlı stok ayrıştırması',
            v_notes,
            v_adjustment.id::text,
            v_now,
            v_user_id
          );

          update public.warehouse_inventory_balances
          set
            quantity =
              quantity -
              v_item.damaged_quantity,

            last_movement_id =
              v_movement_id,

            last_movement_at =
              v_now,

            updated_at =
              v_now
          where account_id =
              p_account_id
            and id =
              v_balance.id
            and quantity >=
              v_item.damaged_quantity;

          if not found then
            raise exception using
              errcode = '55000',
              message =
                'Hasarlı stok ayrıştırması sırasında kaynak bakiye yetersiz kaldı.';
          end if;

          v_damage_balance_id :=
            null;

          insert into
            public.warehouse_inventory_balances (
              account_id,
              warehouse_id,
              location_id,
              product_id,
              sku_id,
              lot_number,
              serial_number,
              stock_status,
              quantity,
              unit,
              last_movement_id,
              last_movement_at
            )
          values (
            p_account_id,
            p_warehouse_id,
            v_adjustment.location_id,
            v_adjustment.product_id,
            v_adjustment.sku_id,
            v_lot_number,
            v_serial_number,
            'damaged',
            v_item.damaged_quantity,
            v_adjustment.unit,
            v_movement_id,
            v_now
          )
          on conflict (
            account_id,
            warehouse_id,
            location_id,
            product_id,
            sku_id,
            lot_number,
            serial_number,
            stock_status
          )
          do update
          set
            quantity =
              public.warehouse_inventory_balances.quantity
              + excluded.quantity,

            last_movement_id =
              excluded.last_movement_id,

            last_movement_at =
              excluded.last_movement_at,

            updated_at =
              v_now
          where
            public.warehouse_inventory_balances.unit =
            excluded.unit
          returning id
          into
            v_damage_balance_id;

          if v_damage_balance_id is null then
            raise exception using
              errcode = '22023',
              message =
                'Hasarlı stok bakiyesi farklı ölçü birimiyle güncellenemez.';
          end if;

          v_posted_movement_count :=
            v_posted_movement_count + 1;
        end if;

        update public.warehouse_cycle_count_adjustments
        set
          status =
            'completed',

          inventory_movement_id =
            v_primary_movement_id,

          processed_by =
            v_user_id,

          processed_at =
            v_now,

          failure_reason =
            null,

          updated_at =
            v_now
        where account_id =
            p_account_id
          and id =
            v_adjustment.id;

        update public.warehouse_cycle_count_items
        set
          status =
            'adjusted',

          adjustment_required =
            false,

          updated_at =
            v_now
        where account_id =
            p_account_id
          and cycle_count_id =
            p_cycle_count_id
          and id =
            v_item.id;

        update public.warehouse_cycle_count_exceptions
        set
          resolved =
            true,

          resolved_by =
            v_user_id,

          resolved_at =
            v_now,

          resolution_notes =
            coalesce(
              v_notes,
              'Onaylanan stok düzeltmesi başarıyla uygulandı.'
            )
        where account_id =
            p_account_id
          and cycle_count_id =
            p_cycle_count_id
          and cycle_count_item_id =
            v_item.id
          and resolved =
            false
          and type in (
            'variance_exceeded',
            'damaged_stock',
            'approval_required'
          );

        v_processed_count :=
          v_processed_count + 1;
      end loop;

      if exists (
        select 1
        from public.warehouse_cycle_count_items i
        where i.account_id =
            p_account_id
          and i.cycle_count_id =
            p_cycle_count_id
          and i.adjustment_required =
            true
      ) then

        raise exception using
          errcode = '55000',
          message =
            'Bazı sayım satırları stok düzeltmesi beklemeye devam ediyor.';
      end if;

      if exists (
        select 1
        from public.warehouse_cycle_count_adjustments a
        where a.account_id =
            p_account_id
          and a.cycle_count_id =
            p_cycle_count_id
          and a.status in (
            'pending',
            'approval_required',
            'approved',
            'processing',
            'failed'
          )
      ) then

        raise exception using
          errcode = '55000',
          message =
            'Cycle Count üzerinde tamamlanmamış stok düzeltmesi bulunuyor.';
      end if;

      update public.warehouse_cycle_counts
      set
        status =
          'adjusted',

        adjusted_at =
          coalesce(
            adjusted_at,
            v_now
          ),

        updated_at =
          v_now
      where account_id =
          p_account_id
        and id =
          p_cycle_count_id;

      v_response :=
        jsonb_build_object(
          'requestId',
            p_request_id,
          'cycleCountId',
            p_cycle_count_id,
          'action',
            v_action,
          'status',
            'adjusted',
          'processedAdjustmentCount',
            v_processed_count,
          'postedMovementCount',
            v_posted_movement_count
        );
    end if;

  -- =======================================================
  -- COMPLETE COUNT + IMMUTABLE REPORT
  -- =======================================================

  elsif v_action = 'complete_count' then
    if v_count.status not in (
      'approved',
      'adjusted'
    ) then

      raise exception using
        errcode = '55000',
        message =
          'Cycle Count yalnız approved veya adjusted durumundan tamamlanabilir.';
    end if;

    if exists (
      select 1
      from public.warehouse_cycle_count_items i
      where i.account_id =
          p_account_id
        and i.cycle_count_id =
          p_cycle_count_id
        and (
          i.recount_required = true
          or i.adjustment_required = true
          or i.status in (
            'under_review',
            'recount_required'
          )
        )
    ) then

      raise exception using
        errcode = '55000',
        message =
          'İnceleme, yeniden sayım veya stok düzeltmesi bekleyen satırlar varken Cycle Count tamamlanamaz.';
    end if;

    if exists (
      select 1
      from public.warehouse_cycle_count_adjustments a
      where a.account_id =
          p_account_id
        and a.cycle_count_id =
          p_cycle_count_id
        and a.status in (
          'pending',
          'approval_required',
          'approved',
          'processing',
          'failed'
        )
    ) then

      raise exception using
        errcode = '55000',
        message =
          'Tamamlanmamış veya başarısız stok düzeltmesi varken Cycle Count tamamlanamaz.';
    end if;

    if exists (
      select 1
      from public.warehouse_cycle_count_approvals ap
      where ap.account_id =
          p_account_id
        and ap.cycle_count_id =
          p_cycle_count_id
        and ap.status =
          'pending'
    ) then

      raise exception using
        errcode = '55000',
        message =
          'Bekleyen stok düzeltme onayı varken Cycle Count tamamlanamaz.';
    end if;

    if exists (
      select 1
      from public.warehouse_cycle_count_tasks t
      where t.account_id =
          p_account_id
        and t.cycle_count_id =
          p_cycle_count_id
        and t.status not in (
          'completed',
          'cancelled'
        )
    ) then

      raise exception using
        errcode = '55000',
        message =
          'Açık Cycle Count görevi varken sayım tamamlanamaz.';
    end if;

    if exists (
      select 1
      from public.warehouse_cycle_count_exceptions e
      where e.account_id =
          p_account_id
        and e.cycle_count_id =
          p_cycle_count_id
        and e.resolved =
          false
    ) then

      raise exception using
        errcode = '55000',
        message =
          'Çözülmemiş Cycle Count istisnası varken sayım tamamlanamaz.';
    end if;

    if exists (
      select 1
      from public.warehouse_cycle_count_reports r
      where r.account_id =
          p_account_id
        and r.cycle_count_id =
          p_cycle_count_id
    ) then

      raise exception using
        errcode = '23505',
        message =
          'Bu Cycle Count için immutable completion report zaten oluşturulmuş.';
    end if;

    select
      count(*)::integer,

      count(*) filter (
        where coalesce(
          variance_quantity,
          0
        ) = 0
      )::integer,

      count(*) filter (
        where coalesce(
          variance_quantity,
          0
        ) <> 0
      )::integer,

      count(*) filter (
        where second_count_quantity
          is not null
      )::integer,

      count(*) filter (
        where status =
          'adjusted'
      )::integer,

      count(*) filter (
        where damaged_quantity > 0
      )::integer,

      coalesce(
        sum(
          abs(
            coalesce(
              variance_quantity,
              0
            )
          )
        ),
        0
      ),

      coalesce(
        sum(
          abs(
            coalesce(
              variance_value,
              0
            )
          )
        ),
        0
      )
    into
      v_total_items,
      v_matched_items,
      v_variance_items,
      v_recount_items,
      v_adjusted_items,
      v_damaged_items,
      v_total_absolute_variance_quantity,
      v_total_absolute_variance_value
    from public.warehouse_cycle_count_items
    where account_id =
        p_account_id
      and cycle_count_id =
        p_cycle_count_id;

    v_accuracy_percentage :=
      case
        when v_total_items = 0
          then 100
        else
          round(
            (
              v_matched_items::numeric
              / v_total_items::numeric
            ) * 100,
            6
          )
      end;

    v_report_summary :=
      jsonb_build_object(
        'cycleCountNumber',
          v_count.cycle_count_number,

        'strategy',
          v_count.strategy,

        'startedAt',
          v_count.started_at,

        'countedAt',
          v_count.counted_at,

        'approvedAt',
          v_count.approved_at,

        'adjustedAt',
          v_count.adjusted_at,

        'completedAt',
          v_now,

        'totalItems',
          v_total_items,

        'matchedItems',
          v_matched_items,

        'varianceItems',
          v_variance_items,

        'recountItems',
          v_recount_items,

        'adjustedItems',
          v_adjusted_items,

        'damagedItems',
          v_damaged_items,

        'accuracyPercentage',
          v_accuracy_percentage,

        'totalAbsoluteVarianceQuantity',
          v_total_absolute_variance_quantity,

        'totalAbsoluteVarianceValue',
          v_total_absolute_variance_value
      );

    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'lineNumber',
              i.line_number,

            'warehouseId',
              i.warehouse_id,

            'locationId',
              i.location_id,

            'locationCode',
              coalesce(
                to_jsonb(l) ->> 'full_code',
                to_jsonb(l) ->> 'code'
              ),

            'productId',
              i.product_id,

            'productCode',
              to_jsonb(p) ->> 'code',

            'productName',
              coalesce(
                to_jsonb(p) ->> 'name',
                to_jsonb(p) ->> 'product_name'
              ),

            'skuId',
              i.sku_id,

            'skuCode',
              coalesce(
                to_jsonb(s) ->> 'sku_code',
                to_jsonb(s) ->> 'code'
              ),

            'stockStatus',
              i.stock_status,

            'unit',
              i.unit,

            'expectedQuantity',
              i.expected_quantity,

            'firstCountQuantity',
              i.first_count_quantity,

            'secondCountQuantity',
              i.second_count_quantity,

            'finalCountQuantity',
              i.final_count_quantity,

            'damagedQuantity',
              i.damaged_quantity,

            'varianceQuantity',
              i.variance_quantity,

            'variancePercentage',
              i.variance_percentage,

            'varianceValue',
              i.variance_value,

            'countedBy',
              i.counted_by,

            'countedAt',
              i.counted_at,

            'recountedBy',
              i.recounted_by,

            'recountedAt',
              i.recounted_at,

            'approvedBy',
              i.approved_by,

            'approvedAt',
              i.approved_at,

            'status',
              i.status
          )
          order by i.line_number
        ),
        '[]'::jsonb
      )
    into
      v_report_items
    from public.warehouse_cycle_count_items i

    left join public.warehouse_locations l
      on l.account_id =
        i.account_id
      and l.warehouse_id =
        i.warehouse_id
      and l.id =
        i.location_id

    left join public.warehouse_products p
      on p.account_id =
        i.account_id
      and p.id =
        i.product_id

    left join public.warehouse_product_skus s
      on s.account_id =
        i.account_id
      and s.product_id =
        i.product_id
      and s.id =
        i.sku_id

    where i.account_id =
        p_account_id
      and i.cycle_count_id =
        p_cycle_count_id;

    insert into
      public.warehouse_cycle_count_reports (
        account_id,
        warehouse_id,
        cycle_count_id,
        cycle_count_number,
        strategy,
        status,
        summary,
        items,
        generated_by,
        generated_at
      )
    values (
      p_account_id,
      p_warehouse_id,
      p_cycle_count_id,
      v_count.cycle_count_number,
      v_count.strategy,
      'completed',
      v_report_summary,
      v_report_items,
      v_user_id,
      v_now
    );

    update public.warehouse_cycle_counts
    set
      status =
        'completed',

      completed_at =
        v_now,

      updated_at =
        v_now
    where account_id =
        p_account_id
      and id =
        p_cycle_count_id;

    v_response :=
      jsonb_build_object(
        'requestId',
          p_request_id,
        'cycleCountId',
          p_cycle_count_id,
        'action',
          v_action,
        'status',
          'completed',
        'reportCreated',
          true,
        'completedAt',
          v_now
      );

  -- =======================================================
  -- IDEMPOTENT RESPONSE
  -- =======================================================

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
$warehouse_cycle_count_completion_write$;

revoke all
on function
  public.warehouse_cycle_count_completion_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text
  )
from public;

revoke all
on function
  public.warehouse_cycle_count_completion_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text
  )
from anon;

grant execute
on function
  public.warehouse_cycle_count_completion_write(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text
  )
to authenticated;
