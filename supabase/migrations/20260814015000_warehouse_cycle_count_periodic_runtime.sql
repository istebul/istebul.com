-- =========================================================
-- WarehouseIQ — Periodic Cycle Count Runtime
--
-- Internal scheduler runtime.
--
-- Desteklenen ilk production scope:
-- - full_inventory
-- - blind_count
-- - monthly / annual
--
-- Güvenlik:
-- - browser çağrısı yok
-- - authenticated doğrudan execute yok
-- - service_role üzerinden yalnız dar RPC
-- - SECURITY DEFINER
--
-- Operasyon:
-- - due schedule satırı FOR UPDATE SKIP LOCKED
-- - dönem bazlı idempotency
-- - gerçek inventory balance snapshot
-- - kullanıcı ataması yapılmaz
-- - sahte in_progress oluşturulmaz
-- - inventory mutation yapılmaz
-- =========================================================

create sequence if not exists
  public.warehouse_cycle_count_number_seq;

revoke all
on sequence
  public.warehouse_cycle_count_number_seq
from public;

revoke all
on sequence
  public.warehouse_cycle_count_number_seq
from anon;

revoke all
on sequence
  public.warehouse_cycle_count_number_seq
from authenticated;

alter table
  public.warehouse_cycle_count_schedule_runs
add column if not exists
  attempt_count integer not null default 0;

alter table
  public.warehouse_cycle_count_schedule_runs
add column if not exists
  last_attempt_at timestamptz;

do $warehouse_cycle_count_run_constraints$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'warehouse_cycle_count_schedule_runs_attempt_check'
      and conrelid =
        'public.warehouse_cycle_count_schedule_runs'::regclass
  ) then
    alter table
      public.warehouse_cycle_count_schedule_runs
    add constraint
      warehouse_cycle_count_schedule_runs_attempt_check
    check (
      attempt_count >= 0
    );
  end if;
end;
$warehouse_cycle_count_run_constraints$;

create or replace function
  public.warehouse_cycle_count_process_due_schedules(
    p_limit integer default 25,
    p_now timestamptz default now()
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_cycle_count_process_due_schedules$
declare
  v_schedule record;

  v_existing_run
    public.warehouse_cycle_count_schedule_runs%rowtype;

  v_run
    public.warehouse_cycle_count_schedule_runs%rowtype;

  v_local_due timestamp without time zone;
  v_next_local timestamp without time zone;
  v_next_run_at timestamptz;

  v_period_key text;

  v_cycle_count_id uuid;
  v_cycle_count_number text;

  v_item_count integer := 0;
  v_task_count integer := 0;

  v_processed integer := 0;
  v_generated integer := 0;
  v_released integer := 0;
  v_skipped integer := 0;
  v_failed integer := 0;

  v_runs jsonb := '[]'::jsonb;

  v_blind boolean;
  v_count_status text;
  v_failure text;
begin
  if p_limit is null
    or p_limit < 1
    or p_limit > 100 then

    raise exception using
      errcode = '22023',
      message =
        'Periodic Cycle Count runtime limiti 1 ile 100 arasında olmalıdır.';
  end if;

  if p_now is null then
    raise exception using
      errcode = '22023',
      message =
        'Periodic Cycle Count runtime zamanı boş olamaz.';
  end if;

  for v_schedule in
    select
      s.*,

      r.status
        as rule_status,

      r.strategy,
      r.blind_count,
      r.freeze_inventory,
      r.tolerance_quantity,
      r.tolerance_percentage,
      r.priority,
      r.selection_config,
      r.auto_release,
      r.code
        as rule_code,
      r.name
        as rule_name,
      r.created_by
        as rule_created_by,

      w.status
        as warehouse_status

    from public.warehouse_cycle_count_schedules s

    join public.warehouse_cycle_count_rules r
      on r.account_id =
          s.account_id
      and r.warehouse_id =
          s.warehouse_id
      and r.id =
          s.rule_id

    join public.warehouses w
      on w.account_id =
          s.account_id
      and w.id =
          s.warehouse_id

    where s.status = 'active'
      and s.next_run_at <= p_now

    order by
      s.next_run_at,
      s.id

    limit p_limit

    for update of s
    skip locked
  loop
    v_processed :=
      v_processed + 1;

    v_period_key := null;
    v_next_run_at := null;
    v_failure := null;
    v_item_count := 0;
    v_task_count := 0;

    -- Paused rule veya aktif olmayan depo için zamanı tüketmeyiz.
    -- Schedule due kalır ve tekrar aktif olduğunda çalışabilir.
    if v_schedule.rule_status <> 'active'
      or v_schedule.warehouse_status <> 'active' then

      v_skipped :=
        v_skipped + 1;

      v_runs :=
        v_runs
        || jsonb_build_array(
          jsonb_build_object(
            'scheduleId',
              v_schedule.id,
            'status',
              'deferred',
            'reason',
              case
                when v_schedule.rule_status <> 'active'
                  then 'rule_not_active'
                else 'warehouse_not_active'
              end
          )
        );

      continue;
    end if;

    -- Gerçek PostgreSQL timezone adı zorunludur.
    if not exists (
      select 1
      from pg_timezone_names
      where name =
        v_schedule.timezone
    ) then

      v_period_key :=
        case
          when v_schedule.cadence = 'annual'
            then to_char(
              v_schedule.next_run_at
                at time zone 'UTC',
              'YYYY'
            )
          else to_char(
            v_schedule.next_run_at
              at time zone 'UTC',
            'YYYY-MM'
          )
        end;

      insert into
        public.warehouse_cycle_count_schedule_runs (
          account_id,
          warehouse_id,
          rule_id,
          schedule_id,
          period_key,
          scheduled_for,
          status,
          failure_reason,
          rule_snapshot,
          attempt_count,
          last_attempt_at
        )
      values (
        v_schedule.account_id,
        v_schedule.warehouse_id,
        v_schedule.rule_id,
        v_schedule.id,
        v_period_key,
        v_schedule.next_run_at,
        'failed',
        'Geçersiz depo zaman dilimi: '
          || v_schedule.timezone,
        jsonb_build_object(
          'ruleCode',
            v_schedule.rule_code,
          'strategy',
            v_schedule.strategy,
          'timezone',
            v_schedule.timezone
        ),
        1,
        p_now
      )
      on conflict (
        account_id,
        schedule_id,
        period_key
      )
      do update
      set
        status = 'failed',
        failure_reason =
          excluded.failure_reason,
        rule_snapshot =
          excluded.rule_snapshot,
        attempt_count =
          public.warehouse_cycle_count_schedule_runs.attempt_count
          + 1,
        last_attempt_at =
          excluded.last_attempt_at,
        updated_at = now();

      update
        public.warehouse_cycle_count_schedules
      set
        status = 'paused',
        updated_by =
          v_schedule.rule_created_by,
        updated_at = now()
      where id =
        v_schedule.id;

      v_failed :=
        v_failed + 1;

      v_runs :=
        v_runs
        || jsonb_build_array(
          jsonb_build_object(
            'scheduleId',
              v_schedule.id,
            'periodKey',
              v_period_key,
            'status',
              'failed',
            'reason',
              'invalid_timezone'
          )
        );

      continue;
    end if;

    v_local_due :=
      v_schedule.next_run_at
        at time zone
          v_schedule.timezone;

    if v_schedule.cadence = 'monthly' then
      v_period_key :=
        to_char(
          v_local_due,
          'YYYY-MM'
        );

      v_next_local :=
        (
          date_trunc(
            'month',
            v_local_due
          )
          + interval '1 month'
        )::date
        + (
          v_schedule.day_of_month - 1
        ) * interval '1 day'
        + v_schedule.local_time;

    elsif v_schedule.cadence = 'annual' then
      v_period_key :=
        to_char(
          v_local_due,
          'YYYY'
        );

      v_next_local :=
        make_date(
          extract(
            year
            from v_local_due
          )::integer + 1,
          v_schedule.month_of_year,
          v_schedule.day_of_month
        )
        + v_schedule.local_time;

    else
      raise exception using
        errcode = '22023',
        message =
          'Desteklenmeyen periodic cadence.';
    end if;

    v_next_run_at :=
      v_next_local
        at time zone
          v_schedule.timezone;

    if v_next_run_at <=
      v_schedule.next_run_at then

      raise exception using
        errcode = '22023',
        message =
          'Periodic sonraki çalışma zamanı mevcut zamandan ileri olmalıdır.';
    end if;

    -- İlk production runtime yalnız gerçek tam fiziksel sayımı destekler.
    -- Diğer stratejiler selection engine yazılmadan full inventory gibi
    -- çalıştırılmaz.
    if v_schedule.strategy not in (
      'full_inventory',
      'blind_count'
    ) then

      v_failure :=
        'Periodic runtime bu aşamada yalnız full_inventory ve blind_count stratejilerini destekler.';

    elsif coalesce(
      v_schedule.selection_config,
      '{}'::jsonb
    ) <> '{}'::jsonb then

      v_failure :=
        'Selection config içeren periyodik sayım kuralı için seçim motoru henüz etkin değildir.';

    elsif v_schedule.freeze_inventory = true then

      v_failure :=
        'freeze_inventory için gerçek stok hareketi kilitleme altyapısı etkin olmadan periyodik sayım başlatılamaz.';
    end if;

    if v_failure is not null then
      insert into
        public.warehouse_cycle_count_schedule_runs (
          account_id,
          warehouse_id,
          rule_id,
          schedule_id,
          period_key,
          scheduled_for,
          status,
          failure_reason,
          rule_snapshot,
          attempt_count,
          last_attempt_at
        )
      values (
        v_schedule.account_id,
        v_schedule.warehouse_id,
        v_schedule.rule_id,
        v_schedule.id,
        v_period_key,
        v_schedule.next_run_at,
        'failed',
        v_failure,
        jsonb_build_object(
          'ruleCode',
            v_schedule.rule_code,
          'strategy',
            v_schedule.strategy,
          'blindCount',
            v_schedule.blind_count,
          'freezeInventory',
            v_schedule.freeze_inventory,
          'selectionConfig',
            v_schedule.selection_config,
          'autoRelease',
            v_schedule.auto_release
        ),
        1,
        p_now
      )
      on conflict (
        account_id,
        schedule_id,
        period_key
      )
      do update
      set
        status = 'failed',
        failure_reason =
          excluded.failure_reason,
        rule_snapshot =
          excluded.rule_snapshot,
        attempt_count =
          public.warehouse_cycle_count_schedule_runs.attempt_count
          + 1,
        last_attempt_at =
          excluded.last_attempt_at,
        updated_at = now();

      update
        public.warehouse_cycle_count_schedules
      set
        status = 'paused',
        updated_by =
          v_schedule.rule_created_by,
        updated_at = now()
      where id =
        v_schedule.id;

      v_failed :=
        v_failed + 1;

      v_runs :=
        v_runs
        || jsonb_build_array(
          jsonb_build_object(
            'scheduleId',
              v_schedule.id,
            'periodKey',
              v_period_key,
            'status',
              'failed',
            'reason',
              'unsupported_configuration'
          )
        );

      continue;
    end if;

    -- =========================================================
    -- EXISTING PERIOD RUN
    -- =========================================================

    select *
    into v_existing_run
    from public.warehouse_cycle_count_schedule_runs
    where account_id =
        v_schedule.account_id
      and schedule_id =
        v_schedule.id
      and period_key =
        v_period_key
    for update;

    if found
      and v_existing_run.status in (
        'generated',
        'released',
        'skipped'
      ) then

      -- Önceki transaction count/run üretmiş fakat schedule cursor
      -- ilerletme aşamasında kesilmişse duplicate count üretmeyiz.
      update
        public.warehouse_cycle_count_schedules
      set
        last_run_at =
          v_schedule.next_run_at,
        next_run_at =
          v_next_run_at,
        updated_at = now()
      where id =
        v_schedule.id;

      v_runs :=
        v_runs
        || jsonb_build_array(
          jsonb_build_object(
            'scheduleId',
              v_schedule.id,
            'periodKey',
              v_period_key,
            'status',
              'already_processed',
            'cycleCountId',
              v_existing_run.cycle_count_id
          )
        );

      continue;
    end if;

    if found
      and v_existing_run.status = 'failed'
      and v_existing_run.attempt_count >= 5 then

      update
        public.warehouse_cycle_count_schedules
      set
        status = 'paused',
        updated_by =
          v_schedule.rule_created_by,
        updated_at = now()
      where id =
        v_schedule.id;

      v_failed :=
        v_failed + 1;

      v_runs :=
        v_runs
        || jsonb_build_array(
          jsonb_build_object(
            'scheduleId',
              v_schedule.id,
            'periodKey',
              v_period_key,
            'status',
              'paused_after_failures',
            'attemptCount',
              v_existing_run.attempt_count
          )
        );

      continue;
    end if;

    -- Her schedule kendi subtransaction'ında çalışır.
    -- Bir schedule başarısız olduğunda batch'in geri kalanı devam eder.
    begin
      if v_existing_run.id is null then
        insert into
          public.warehouse_cycle_count_schedule_runs (
            account_id,
            warehouse_id,
            rule_id,
            schedule_id,
            period_key,
            scheduled_for,
            status,
            rule_snapshot,
            attempt_count,
            last_attempt_at
          )
        values (
          v_schedule.account_id,
          v_schedule.warehouse_id,
          v_schedule.rule_id,
          v_schedule.id,
          v_period_key,
          v_schedule.next_run_at,
          'pending',
          jsonb_build_object(
            'ruleCode',
              v_schedule.rule_code,
            'ruleName',
              v_schedule.rule_name,
            'strategy',
              v_schedule.strategy,
            'blindCount',
              v_schedule.blind_count,
            'freezeInventory',
              v_schedule.freeze_inventory,
            'toleranceQuantity',
              v_schedule.tolerance_quantity,
            'tolerancePercentage',
              v_schedule.tolerance_percentage,
            'priority',
              v_schedule.priority,
            'selectionConfig',
              v_schedule.selection_config,
            'autoRelease',
              v_schedule.auto_release,
            'cadence',
              v_schedule.cadence,
            'timezone',
              v_schedule.timezone
          ),
          1,
          p_now
        )
        returning *
        into v_run;

      else
        update
          public.warehouse_cycle_count_schedule_runs
        set
          status = 'pending',
          cycle_count_id = null,
          generated_at = null,
          released_at = null,
          failure_reason = null,
          attempt_count =
            attempt_count + 1,
          last_attempt_at =
            p_now,
          updated_at = now()
        where id =
          v_existing_run.id
        returning *
        into v_run;
      end if;

      select count(*)
      into v_item_count
      from public.warehouse_inventory_balances b
      where b.account_id =
          v_schedule.account_id
        and b.warehouse_id =
          v_schedule.warehouse_id
        and b.quantity > 0;

      if v_item_count = 0 then
        update
          public.warehouse_cycle_count_schedule_runs
        set
          status = 'skipped',
          failure_reason =
            'Planlanan fiziksel sayım anında pozitif stok bakiyesi bulunamadı.',
          updated_at = now()
        where id =
          v_run.id;

        update
          public.warehouse_cycle_count_schedules
        set
          last_run_at =
            v_schedule.next_run_at,
          next_run_at =
            v_next_run_at,
          updated_at = now()
        where id =
          v_schedule.id;

        v_skipped :=
          v_skipped + 1;

        v_runs :=
          v_runs
          || jsonb_build_array(
            jsonb_build_object(
              'scheduleId',
                v_schedule.id,
              'runId',
                v_run.id,
              'periodKey',
                v_period_key,
              'status',
                'skipped',
              'reason',
                'no_positive_inventory'
            )
          );

        continue;
      end if;

      v_blind :=
        v_schedule.blind_count
        or v_schedule.strategy = 'blind_count';

      v_count_status :=
        case
          when v_schedule.auto_release
            then 'released'
          else 'planned'
        end;

      v_cycle_count_id :=
        gen_random_uuid();

      v_cycle_count_number :=
        'CC-'
        || to_char(
          p_now at time zone
            v_schedule.timezone,
          'YYYYMMDD'
        )
        || '-'
        || lpad(
          nextval(
            'public.warehouse_cycle_count_number_seq'
          )::text,
          8,
          '0'
        );

      insert into
        public.warehouse_cycle_counts (
          id,
          account_id,
          warehouse_id,
          cycle_count_number,
          strategy,
          status,
          rule_id,
          schedule_id,
          reference_type,
          reference_id,
          reference_number,
          blind_count,
          freeze_inventory,
          tolerance_quantity,
          tolerance_percentage,
          priority,
          planned_at,
          released_at,
          created_by,
          notes
        )
      values (
        v_cycle_count_id,
        v_schedule.account_id,
        v_schedule.warehouse_id,
        v_cycle_count_number,
        v_schedule.strategy,
        v_count_status,
        v_schedule.rule_id,
        v_schedule.id,
        'periodic_schedule',
        v_schedule.id::text,
        v_period_key,
        v_blind,
        false,
        v_schedule.tolerance_quantity,
        v_schedule.tolerance_percentage,
        v_schedule.priority,
        v_schedule.next_run_at,
        case
          when v_schedule.auto_release
            then p_now
          else null
        end,
        v_schedule.rule_created_by,
        'Periyodik '
          || case
               when v_schedule.cadence = 'annual'
                 then 'yıllık'
               else 'aylık'
             end
          || ' fiziksel sayım · '
          || v_period_key
      );

      with snapshot as (
        select
          b.*,

          row_number() over (
            order by
              b.location_id,
              b.product_id,
              b.sku_id
                nulls first,
              b.lot_number
                nulls first,
              b.serial_number
                nulls first,
              b.stock_status,
              b.id
          )::integer
            as line_number

        from public.warehouse_inventory_balances b

        where b.account_id =
            v_schedule.account_id
          and b.warehouse_id =
            v_schedule.warehouse_id
          and b.quantity > 0
      )
      insert into
        public.warehouse_cycle_count_items (
          account_id,
          cycle_count_id,
          line_number,
          warehouse_id,
          location_id,
          product_id,
          sku_id,
          inventory_balance_id,
          stock_status,
          tracking,
          unit,
          status,
          blind_count,
          expected_quantity,
          damaged_quantity,
          unit_cost,
          currency,
          tolerance_quantity,
          tolerance_percentage,
          recount_required,
          adjustment_required,
          created_by
        )
      select
        s.account_id,
        v_cycle_count_id,
        s.line_number,
        s.warehouse_id,
        s.location_id,
        s.product_id,
        s.sku_id,
        s.id,
        s.stock_status,

        nullif(
          jsonb_strip_nulls(
            jsonb_build_object(
              'lotNumber',
                s.lot_number,
              'serialNumber',
                s.serial_number
            )
          ),
          '{}'::jsonb
        ),

        s.unit,
        'pending',
        v_blind,
        s.quantity,
        0,
        null,
        null,
        v_schedule.tolerance_quantity,
        v_schedule.tolerance_percentage,
        false,
        false,
        v_schedule.rule_created_by

      from snapshot s;

      get diagnostics
        v_item_count =
          row_count;

      insert into
        public.warehouse_cycle_count_tasks (
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
          created_by
        )
      select
        i.account_id,
        i.cycle_count_id,
        i.id,
        i.warehouse_id,
        i.location_id,
        i.product_id,

        case
          when i.blind_count
            then 'blind_count'

          when i.tracking ->> 'serialNumber'
            is not null
            then 'count_serial'

          when i.tracking ->> 'lotNumber'
            is not null
            then 'count_lot'

          else 'count_product'
        end,

        'pending',
        v_schedule.priority,
        i.line_number,
        null,
        v_schedule.next_run_at,
        v_schedule.rule_created_by

      from public.warehouse_cycle_count_items i

      where i.account_id =
          v_schedule.account_id
        and i.cycle_count_id =
          v_cycle_count_id;

      get diagnostics
        v_task_count =
          row_count;

      if v_task_count <>
        v_item_count then

        raise exception using
          errcode = '55000',
          message =
            'Periyodik sayım item ve task sayıları uyuşmuyor.';
      end if;

      update
        public.warehouse_cycle_count_schedule_runs
      set
        status =
          case
            when v_schedule.auto_release
              then 'released'
            else 'generated'
          end,

        cycle_count_id =
          v_cycle_count_id,

        generated_at =
          p_now,

        released_at =
          case
            when v_schedule.auto_release
              then p_now
            else null
          end,

        failure_reason =
          null,

        updated_at =
          now()

      where id =
        v_run.id;

      update
        public.warehouse_cycle_count_schedules
      set
        last_run_at =
          v_schedule.next_run_at,

        next_run_at =
          v_next_run_at,

        updated_at =
          now()

      where id =
        v_schedule.id;

      if v_schedule.auto_release then
        v_released :=
          v_released + 1;
      else
        v_generated :=
          v_generated + 1;
      end if;

      v_runs :=
        v_runs
        || jsonb_build_array(
          jsonb_build_object(
            'scheduleId',
              v_schedule.id,
            'runId',
              v_run.id,
            'periodKey',
              v_period_key,
            'status',
              case
                when v_schedule.auto_release
                  then 'released'
                else 'generated'
              end,
            'cycleCountId',
              v_cycle_count_id,
            'cycleCountNumber',
              v_cycle_count_number,
            'itemCount',
              v_item_count,
            'taskCount',
              v_task_count,
            'nextRunAt',
              v_next_run_at
          )
        );

    exception
      when others then
        v_failure :=
          left(
            coalesce(
              sqlerrm,
              'Bilinmeyen periodic runtime hatası.'
            ),
            1000
          );

        insert into
          public.warehouse_cycle_count_schedule_runs (
            account_id,
            warehouse_id,
            rule_id,
            schedule_id,
            period_key,
            scheduled_for,
            status,
            failure_reason,
            rule_snapshot,
            attempt_count,
            last_attempt_at
          )
        values (
          v_schedule.account_id,
          v_schedule.warehouse_id,
          v_schedule.rule_id,
          v_schedule.id,
          v_period_key,
          v_schedule.next_run_at,
          'failed',
          v_failure,
          jsonb_build_object(
            'ruleCode',
              v_schedule.rule_code,
            'strategy',
              v_schedule.strategy,
            'autoRelease',
              v_schedule.auto_release
          ),
          1,
          p_now
        )
        on conflict (
          account_id,
          schedule_id,
          period_key
        )
        do update
        set
          status = 'failed',
          cycle_count_id = null,
          generated_at = null,
          released_at = null,
          failure_reason =
            excluded.failure_reason,
          attempt_count =
            public.warehouse_cycle_count_schedule_runs.attempt_count
            + 1,
          last_attempt_at =
            excluded.last_attempt_at,
          updated_at = now()
        returning *
        into v_run;

        if v_run.attempt_count >= 5 then
          update
            public.warehouse_cycle_count_schedules
          set
            status = 'paused',
            updated_by =
              v_schedule.rule_created_by,
            updated_at = now()
          where id =
            v_schedule.id;
        end if;

        v_failed :=
          v_failed + 1;

        v_runs :=
          v_runs
          || jsonb_build_array(
            jsonb_build_object(
              'scheduleId',
                v_schedule.id,
              'runId',
                v_run.id,
              'periodKey',
                v_period_key,
              'status',
                'failed',
              'attemptCount',
                v_run.attempt_count
            )
          );
    end;
  end loop;

  return jsonb_build_object(
    'ok',
      true,
    'processed',
      v_processed,
    'generated',
      v_generated,
    'released',
      v_released,
    'skipped',
      v_skipped,
    'failed',
      v_failed,
    'runs',
      v_runs
  );
end;
$warehouse_cycle_count_process_due_schedules$;

revoke all
on function
  public.warehouse_cycle_count_process_due_schedules(
    integer,
    timestamptz
  )
from public;

revoke all
on function
  public.warehouse_cycle_count_process_due_schedules(
    integer,
    timestamptz
  )
from anon;

revoke all
on function
  public.warehouse_cycle_count_process_due_schedules(
    integer,
    timestamptz
  )
from authenticated;

grant execute
on function
  public.warehouse_cycle_count_process_due_schedules(
    integer,
    timestamptz
  )
to service_role;

comment on function
  public.warehouse_cycle_count_process_due_schedules(
    integer,
    timestamptz
  )
is
  'WarehouseIQ internal monthly/annual physical Cycle Count scheduler runtime. Browser/authenticated kullanıcılar doğrudan çalıştıramaz.';
