-- =========================================================
-- WarehouseIQ — Cycle Count Management Read
--
-- Management-only read boundary.
-- Browser doğrudan hassas Cycle Count tablolarını okumaz.
--
-- p_cycle_count_id NULL:
--   aktif sayımlar + tamamlanmış rapor listesi
--
-- p_cycle_count_id dolu:
--   completed -> immutable report snapshot
--   active    -> management preview + adjustment lifecycle
-- =========================================================

create or replace function
  public.warehouse_cycle_count_management_read(
    p_account_id uuid,
    p_warehouse_id uuid,
    p_cycle_count_id uuid default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_cycle_count_management_read$
declare
  v_user_id uuid :=
    auth.uid();

  v_count
    public.warehouse_cycle_counts%rowtype;

  v_active_counts jsonb;
  v_reports jsonb;

  v_summary jsonb;
  v_items jsonb;
  v_adjustments jsonb;
  v_approvals jsonb;
  v_exceptions jsonb;
  v_report jsonb;

  v_total_items integer := 0;
  v_matched_items integer := 0;
  v_variance_items integer := 0;
  v_recount_items integer := 0;
  v_adjusted_items integer := 0;
  v_damaged_items integer := 0;

  v_accuracy_percentage numeric(12, 6);
  v_total_absolute_variance_quantity numeric(18, 6);
  v_total_absolute_variance_value numeric(18, 6);
begin
  if v_user_id is null then
    raise exception using
      errcode = '28000',
      message =
        'WarehouseIQ oturumu doğrulanamadı.';
  end if;

  if p_account_id is null
    or p_warehouse_id is null then

    raise exception using
      errcode = '22023',
      message =
        'Firma ve depo kimlikleri zorunludur.';
  end if;

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
        'Cycle Count yönetim raporlarını görüntüleme yetkiniz bulunmuyor.';
  end if;

  if not exists (
    select 1
    from public.warehouses w
    where w.account_id =
        p_account_id
      and w.id =
        p_warehouse_id
  ) then

    raise exception using
      errcode = 'P0002',
      message =
        'Seçili firma için depo bulunamadı.';
  end if;

  if p_cycle_count_id is null then
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',
              c.id,

            'cycleCountNumber',
              c.cycle_count_number,

            'strategy',
              c.strategy,

            'status',
              c.status,

            'blindCount',
              c.blind_count,

            'priority',
              c.priority,

            'plannedAt',
              c.planned_at,

            'releasedAt',
              c.released_at,

            'startedAt',
              c.started_at,

            'countedAt',
              c.counted_at,

            'approvedAt',
              c.approved_at,

            'adjustedAt',
              c.adjusted_at,

            'totalItems',
              (
                select count(*)::integer
                from public.warehouse_cycle_count_items i
                where i.account_id =
                    c.account_id
                  and i.cycle_count_id =
                    c.id
              ),

            'openReviewItems',
              (
                select count(*)::integer
                from public.warehouse_cycle_count_items i
                where i.account_id =
                    c.account_id
                  and i.cycle_count_id =
                    c.id
                  and (
                    i.recount_required = true
                    or i.adjustment_required = true
                    or i.status in (
                      'recount_required',
                      'under_review'
                    )
                  )
              ),

            'updatedAt',
              c.updated_at
          )
          order by
            c.updated_at desc,
            c.cycle_count_number
        ),
        '[]'::jsonb
      )
    into
      v_active_counts
    from public.warehouse_cycle_counts c
    where c.account_id =
        p_account_id
      and c.warehouse_id =
        p_warehouse_id
      and c.status in (
        'in_progress',
        'counted',
        'recount_required',
        'under_review',
        'approved',
        'adjusted'
      );

    select
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',
              r.id,

            'cycleCountId',
              r.cycle_count_id,

            'cycleCountNumber',
              r.cycle_count_number,

            'strategy',
              r.strategy,

            'status',
              r.status,

            'summary',
              r.summary,

            'generatedAt',
              r.generated_at
          )
          order by
            r.generated_at desc
        ),
        '[]'::jsonb
      )
    into
      v_reports
    from public.warehouse_cycle_count_reports r
    where r.account_id =
        p_account_id
      and r.warehouse_id =
        p_warehouse_id;

    return
      jsonb_build_object(
        'accountId',
          p_account_id,

        'warehouseId',
          p_warehouse_id,

        'mode',
          'list',

        'activeCounts',
          v_active_counts,

        'reports',
          v_reports
      );
  end if;

  select *
  into v_count
  from public.warehouse_cycle_counts c
  where c.account_id =
      p_account_id
    and c.warehouse_id =
      p_warehouse_id
    and c.id =
      p_cycle_count_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Seçili depoda Cycle Count kaydı bulunamadı.';
  end if;

  if v_count.status = 'completed' then
    select
      jsonb_build_object(
        'id',
          r.id,

        'cycleCountId',
          r.cycle_count_id,

        'cycleCountNumber',
          r.cycle_count_number,

        'strategy',
          r.strategy,

        'status',
          r.status,

        'summary',
          r.summary,

        'items',
          r.items,

        'generatedBy',
          r.generated_by,

        'generatedAt',
          r.generated_at
      )
    into
      v_report
    from public.warehouse_cycle_count_reports r
    where r.account_id =
        p_account_id
      and r.warehouse_id =
        p_warehouse_id
      and r.cycle_count_id =
        p_cycle_count_id;

    if v_report is null then
      raise exception using
        errcode = '55000',
        message =
          'Tamamlanmış Cycle Count için immutable rapor bulunamadı.';
    end if;

    return
      jsonb_build_object(
        'accountId',
          p_account_id,

        'warehouseId',
          p_warehouse_id,

        'cycleCountId',
          p_cycle_count_id,

        'mode',
          'report',

        'report',
          v_report
      );
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

  v_summary :=
    jsonb_build_object(
      'cycleCountNumber',
        v_count.cycle_count_number,

      'strategy',
        v_count.strategy,

      'status',
        v_count.status,

      'startedAt',
        v_count.started_at,

      'countedAt',
        v_count.counted_at,

      'approvedAt',
        v_count.approved_at,

      'adjustedAt',
        v_count.adjusted_at,

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
          'id',
            i.id,

          'lineNumber',
            i.line_number,

          'warehouseId',
            i.warehouse_id,

          'locationId',
            i.location_id,

          'locationCode',
            l.full_code,

          'locationName',
            l.name,

          'productId',
            i.product_id,

          'productCode',
            p.code,

          'productName',
            p.name,

          'skuId',
            i.sku_id,

          'skuCode',
            s.sku_code,

          'skuName',
            s.name,

          'stockStatus',
            i.stock_status,

          'tracking',
            i.tracking,

          'unit',
            i.unit,

          'status',
            i.status,

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

          'unitCost',
            i.unit_cost,

          'currency',
            i.currency,

          'recountRequired',
            i.recount_required,

          'adjustmentRequired',
            i.adjustment_required,

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
            i.approved_at
        )
        order by i.line_number
      ),
      '[]'::jsonb
    )
  into
    v_items
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

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
            a.id,

          'cycleCountItemId',
            a.cycle_count_item_id,

          'resultId',
            a.result_id,

          'type',
            a.type,

          'status',
            a.status,

          'locationId',
            a.location_id,

          'productId',
            a.product_id,

          'skuId',
            a.sku_id,

          'quantity',
            a.quantity,

          'unit',
            a.unit,

          'previousQuantity',
            a.previous_quantity,

          'adjustedQuantity',
            a.adjusted_quantity,

          'stockStatus',
            a.stock_status,

          'targetStockStatus',
            a.target_stock_status,

          'inventoryMovementId',
            a.inventory_movement_id,

          'failureReason',
            a.failure_reason,

          'requestedBy',
            a.requested_by,

          'requestedAt',
            a.requested_at,

          'approvedBy',
            a.approved_by,

          'approvedAt',
            a.approved_at,

          'processedBy',
            a.processed_by,

          'processedAt',
            a.processed_at,

          'notes',
            a.notes
        )
        order by
          a.created_at,
          a.id
      ),
      '[]'::jsonb
    )
  into
    v_adjustments
  from public.warehouse_cycle_count_adjustments a
  where a.account_id =
      p_account_id
    and a.cycle_count_id =
      p_cycle_count_id;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
            ap.id,

          'cycleCountItemId',
            ap.cycle_count_item_id,

          'adjustmentId',
            ap.adjustment_id,

          'status',
            ap.status,

          'level',
            ap.level,

          'requestedBy',
            ap.requested_by,

          'requestedAt',
            ap.requested_at,

          'approverRole',
            ap.approver_role,

          'approverId',
            ap.approver_id,

          'approvedBy',
            ap.approved_by,

          'approvedAt',
            ap.approved_at,

          'rejectedBy',
            ap.rejected_by,

          'rejectedAt',
            ap.rejected_at,

          'rejectionReason',
            ap.rejection_reason,

          'notes',
            ap.notes
        )
        order by
          ap.created_at,
          ap.id
      ),
      '[]'::jsonb
    )
  into
    v_approvals
  from public.warehouse_cycle_count_approvals ap
  where ap.account_id =
      p_account_id
    and ap.cycle_count_id =
      p_cycle_count_id;

  select
    coalesce(
      jsonb_agg(
        (
          to_jsonb(e)
          - 'account_id'
        )
        order by
          e.created_at,
          e.id
      ),
      '[]'::jsonb
    )
  into
    v_exceptions
  from public.warehouse_cycle_count_exceptions e
  where e.account_id =
      p_account_id
    and e.cycle_count_id =
      p_cycle_count_id;

  return
    jsonb_build_object(
      'accountId',
        p_account_id,

      'warehouseId',
        p_warehouse_id,

      'cycleCountId',
        p_cycle_count_id,

      'mode',
        'preview',

      'cycleCount',
        jsonb_build_object(
          'id',
            v_count.id,

          'cycleCountNumber',
            v_count.cycle_count_number,

          'strategy',
            v_count.strategy,

          'status',
            v_count.status,

          'blindCount',
            v_count.blind_count,

          'freezeInventory',
            v_count.freeze_inventory,

          'priority',
            v_count.priority,

          'plannedAt',
            v_count.planned_at,

          'releasedAt',
            v_count.released_at,

          'startedAt',
            v_count.started_at,

          'countedAt',
            v_count.counted_at,

          'approvedAt',
            v_count.approved_at,

          'adjustedAt',
            v_count.adjusted_at
        ),

      'summary',
        v_summary,

      'items',
        v_items,

      'adjustments',
        v_adjustments,

      'approvals',
        v_approvals,

      'exceptions',
        v_exceptions
    );
end;
$warehouse_cycle_count_management_read$;

revoke all
on function
  public.warehouse_cycle_count_management_read(
    uuid,
    uuid,
    uuid
  )
from public;

revoke all
on function
  public.warehouse_cycle_count_management_read(
    uuid,
    uuid,
    uuid
  )
from anon;

grant execute
on function
  public.warehouse_cycle_count_management_read(
    uuid,
    uuid,
    uuid
  )
to authenticated;
