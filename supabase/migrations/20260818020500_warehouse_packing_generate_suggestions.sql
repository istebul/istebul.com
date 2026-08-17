-- ============================================================
-- WarehouseIQ — A8.2.10
-- Atomic Packing Suggestion Generation
--
-- Persistence exact types:
--   packing_item_ids   uuid[]
--   container_snapshot jsonb
--   score               jsonb
--   reasons             text[]
--   warnings            text[]
--
-- Source of truth:
-- - Packing parent
-- - remaining Packing items
-- - persisted active Packing containers
--
-- Client full container snapshots are never trusted.
-- Inventory / Picking mutation YOK.
-- ============================================================

create or replace function
  public.warehouse_packing_generate_suggestions_write(
    p_request_id uuid,
    p_account_id uuid,
    p_packing_id uuid,
    p_packing_item_ids uuid[] default null,
    p_container_ids uuid[] default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_packing_generate_suggestions_write$
declare
  v_user_id uuid :=
    auth.uid();

  v_action constant text :=
    'generate_suggestions';

  v_item_ids uuid[];
  v_container_ids uuid[];

  v_payload jsonb;

  v_existing_user_id uuid;
  v_existing_action text;
  v_existing_payload jsonb;
  v_existing_response jsonb;

  v_inserted integer := 0;

  v_packing public.warehouse_packings%rowtype;
  v_container public.warehouse_packing_containers%rowtype;
  v_suggestion public.warehouse_packing_suggestions%rowtype;

  v_selected_item_count integer;
  v_container_count integer;

  v_weight_complete boolean;
  v_volume_complete boolean;

  v_total_weight numeric;
  v_total_volume numeric;

  v_temperature_controlled boolean;
  v_hazardous_material boolean;
  v_mixed_sku boolean;

  v_container_max_weight numeric;
  v_container_max_volume numeric;
  v_dimension_multiplier numeric;

  v_weight_package_count integer;
  v_volume_package_count integer;
  v_suggested_package_count integer;

  v_per_package_weight numeric;
  v_per_package_volume numeric;

  v_weight_ratio numeric;
  v_volume_ratio numeric;

  v_weight_score integer;
  v_volume_score integer;
  v_compatibility_score integer;
  v_utilization_score integer;
  v_strategy_score integer;
  v_total_score integer;

  v_reasons text[];
  v_warnings text[];

  v_score jsonb;
  v_container_snapshot jsonb;

  v_suggestion_ids uuid[] :=
    array[]::uuid[];

  v_best_suggestion_id uuid;
  v_best_score integer;

  v_suggestions jsonb;

  v_now timestamptz :=
    now();

  v_result jsonb;
begin
  -- ==========================================================
  -- AUTH
  -- ==========================================================

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message =
        'WarehouseIQ oturumu gerekli.';
  end if;

  if p_request_id is null
    or p_account_id is null
    or p_packing_id is null then

    raise exception using
      errcode = '22023',
      message =
        'İstek, firma ve paketleme kimlikleri zorunludur.';
  end if;

  if not public.warehouse_has_account_role(
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
  ) then
    raise exception using
      errcode = '42501',
      message =
        'Bu firma için ambalaj önerisi üretme yetkiniz bulunmuyor.';
  end if;

  -- ==========================================================
  -- NORMALIZE ITEM IDS
  -- ==========================================================

  if p_packing_item_ids is not null then
    select
      array_agg(
        id
        order by first_ordinality
      )
    into v_item_ids
    from (
      select
        id,
        min(ordinality) as first_ordinality
      from unnest(
        p_packing_item_ids
      ) with ordinality
        as source_ids(
          id,
          ordinality
        )
      where id is not null
      group by id
    ) normalized;

    if coalesce(
      cardinality(v_item_ids),
      0
    ) = 0 then
      raise exception using
        errcode = '22023',
        message =
          'En az bir paketleme satırı seçilmelidir.';
    end if;
  end if;

  -- ==========================================================
  -- NORMALIZE CONTAINER IDS
  -- ==========================================================

  if p_container_ids is not null then
    select
      array_agg(
        id
        order by first_ordinality
      )
    into v_container_ids
    from (
      select
        id,
        min(ordinality) as first_ordinality
      from unnest(
        p_container_ids
      ) with ordinality
        as source_ids(
          id,
          ordinality
        )
      where id is not null
      group by id
    ) normalized;

    if coalesce(
      cardinality(v_container_ids),
      0
    ) = 0 then
      raise exception using
        errcode = '22023',
        message =
          'Ambalaj önerisi için en az bir ambalaj seçilmelidir.';
    end if;
  end if;

  -- ==========================================================
  -- IDEMPOTENCY
  -- ==========================================================

  v_payload :=
    jsonb_strip_nulls(
      jsonb_build_object(
        'packingId',
          p_packing_id,
        'packingItemIds',
          case
            when p_packing_item_ids is null
              then null
            else to_jsonb(v_item_ids)
          end,
        'containerIds',
          case
            when p_container_ids is null
              then null
            else to_jsonb(v_container_ids)
          end
      )
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
  from public.warehouse_packing_write_requests
  where account_id = p_account_id
    and request_id = p_request_id
  for update;

  if found then
    if v_existing_user_id <> v_user_id then
      raise exception using
        errcode = '42501',
        message =
          'Bu istek kimliği başka bir kullanıcıya aittir.';
    end if;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir paketleme işlemi için kullanılamaz.';
    end if;

    if v_existing_response is not null then
      return v_existing_response;
    end if;

    raise exception using
      errcode = '40001',
      message =
        'Aynı istek halen işleniyor. Tekrar deneyin.';
  end if;

  insert into public.warehouse_packing_write_requests (
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
    from public.warehouse_packing_write_requests
    where account_id = p_account_id
      and request_id = p_request_id
    for update;

    if v_existing_user_id <> v_user_id then
      raise exception using
        errcode = '42501',
        message =
          'Bu istek kimliği başka bir kullanıcıya aittir.';
    end if;

    if v_existing_action <> v_action
      or v_existing_payload <> v_payload then
      raise exception using
        errcode = '23505',
        message =
          'Aynı istek kimliği farklı bir paketleme işlemi için kullanılamaz.';
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
  -- PACKING
  -- ==========================================================

  select *
  into v_packing
  from public.warehouse_packings
  where account_id = p_account_id
    and id = p_packing_id
  for share;

  if not found then
    raise exception using
      errcode = 'P0002',
      message =
        'Paketleme kaydı bulunamadı.';
  end if;

  if v_packing.status in (
    'packed',
    'shipping_ready',
    'cancelled'
  ) then
    raise exception using
      errcode = '22023',
      message =
        'Tamamlanmış veya iptal edilmiş paketleme için ambalaj önerisi oluşturulamaz.';
  end if;

  -- ==========================================================
  -- RESOLVE PACKING ITEMS
  -- ==========================================================

  if p_packing_item_ids is null then
    select
      array_agg(
        id
        order by line_number,
                 id
      )
    into v_item_ids
    from public.warehouse_packing_items
    where account_id = p_account_id
      and packing_id = v_packing.id
      and remaining_quantity > 0;

    if coalesce(
      cardinality(v_item_ids),
      0
    ) = 0 then
      raise exception using
        errcode = '22023',
        message =
          'Ambalaj önerisi oluşturulacak paketleme satırı bulunamadı.';
    end if;

  else
    select count(*)
    into v_selected_item_count
    from public.warehouse_packing_items
    where account_id = p_account_id
      and packing_id = v_packing.id
      and id = any(v_item_ids)
      and remaining_quantity > 0;

    if v_selected_item_count <>
      cardinality(v_item_ids) then
      raise exception using
        errcode = '22023',
        message =
          'Seçilen paketleme satırlarından biri bulunamadı veya daha önce tamamlandı.';
    end if;
  end if;

  perform 1
  from public.warehouse_packing_items
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = any(v_item_ids)
  for share;

  -- ==========================================================
  -- BUILD REQUIREMENT
  -- ==========================================================

  select
    bool_and(
      unit_weight is not null
      and weight_unit is not null
    ),

    sum(
      case
        when unit_weight is null
          or weight_unit is null
          then 0
        when weight_unit = 'g'
          then
            (unit_weight / 1000)
            * remaining_quantity
        else
          unit_weight
          * remaining_quantity
      end
    ),

    bool_and(
      unit_volume is not null
      and volume_unit is not null
    ),

    sum(
      case
        when unit_volume is null
          or volume_unit is null
          then 0
        when volume_unit = 'm3'
          then
            (unit_volume * 1000000)
            * remaining_quantity
        else
          unit_volume
          * remaining_quantity
      end
    ),

    bool_or(
      temperature_controlled
    ),

    bool_or(
      hazardous_material
    ),

    count(
      distinct (
        product_id::text
        || ':'
        || coalesce(
          sku_id::text,
          ''
        )
      )
    ) > 1

  into
    v_weight_complete,
    v_total_weight,
    v_volume_complete,
    v_total_volume,
    v_temperature_controlled,
    v_hazardous_material,
    v_mixed_sku

  from public.warehouse_packing_items
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = any(v_item_ids);

  if not coalesce(
    v_weight_complete,
    false
  ) then
    v_total_weight :=
      null;
  end if;

  if not coalesce(
    v_volume_complete,
    false
  ) then
    v_total_volume :=
      null;
  end if;

  v_temperature_controlled :=
    coalesce(
      v_temperature_controlled,
      false
    );

  v_hazardous_material :=
    coalesce(
      v_hazardous_material,
      false
    );

  v_mixed_sku :=
    coalesce(
      v_mixed_sku,
      false
    );

  -- ==========================================================
  -- ACTIVE DB-BACKED CONTAINERS
  -- ==========================================================

  select count(*)
  into v_container_count
  from public.warehouse_packing_containers
  where account_id = p_account_id
    and active = true
    and (
      v_container_ids is null
      or id = any(v_container_ids)
    );

  if v_container_count = 0 then
    raise exception using
      errcode = '22023',
      message =
        'Ambalaj önerisi için aktif ambalaj bulunamadı.';
  end if;

  perform 1
  from public.warehouse_packing_containers
  where account_id = p_account_id
    and active = true
    and (
      v_container_ids is null
      or id = any(v_container_ids)
    )
  for share;

  -- ==========================================================
  -- EVALUATE
  -- ==========================================================

  for v_container in
    select *
    from public.warehouse_packing_containers
    where account_id = p_account_id
      and active = true
      and (
        v_container_ids is null
        or id = any(v_container_ids)
      )
    order by
      created_at,
      id
  loop
    if v_temperature_controlled
      and not v_container.temperature_controlled then
      continue;
    end if;

    if v_hazardous_material
      and not v_container.hazardous_material_allowed then
      continue;
    end if;

    -- EXACT persistence types.
    v_reasons :=
      array[]::text[];

    v_warnings :=
      array[]::text[];

    -- ========================================================
    -- CONTAINER CAPACITY
    -- ========================================================

    v_container_max_weight :=
      case
        when v_container.maximum_weight is null
          or v_container.weight_unit is null
          then null
        when v_container.weight_unit = 'g'
          then v_container.maximum_weight / 1000
        else
          v_container.maximum_weight
      end;

    v_container_max_volume :=
      null;

    if v_container.maximum_volume is not null
      and v_container.volume_unit is not null then

      v_container_max_volume :=
        case
          when v_container.volume_unit = 'm3'
            then
              v_container.maximum_volume
              * 1000000
          else
            v_container.maximum_volume
        end;

    elsif v_container.dimensions is not null then
      v_dimension_multiplier :=
        case
          when coalesce(
            v_container.dimensions ->> 'unit',
            'cm'
          ) = 'mm'
            then 0.1
          when coalesce(
            v_container.dimensions ->> 'unit',
            'cm'
          ) = 'm'
            then 100
          else 1
        end;

      v_container_max_volume :=
        (
          v_container.dimensions
            ->> 'length'
        )::numeric
        * v_dimension_multiplier
        * (
          v_container.dimensions
            ->> 'width'
        )::numeric
        * v_dimension_multiplier
        * (
          v_container.dimensions
            ->> 'height'
        )::numeric
        * v_dimension_multiplier;
    end if;

    -- ========================================================
    -- PACKAGE COUNT
    -- ========================================================

    v_weight_package_count :=
      case
        when v_total_weight is not null
          and v_container_max_weight is not null
          and v_container_max_weight > 0
          then
            ceil(
              v_total_weight /
              v_container_max_weight
            )::integer
        else 1
      end;

    v_volume_package_count :=
      case
        when v_total_volume is not null
          and v_container_max_volume is not null
          and v_container_max_volume > 0
          then
            ceil(
              v_total_volume /
              v_container_max_volume
            )::integer
        else 1
      end;

    v_suggested_package_count :=
      greatest(
        1,
        v_weight_package_count,
        v_volume_package_count
      );

    v_per_package_weight :=
      coalesce(
        v_total_weight,
        0
      )
      / v_suggested_package_count;

    v_per_package_volume :=
      coalesce(
        v_total_volume,
        0
      )
      / v_suggested_package_count;

    -- ========================================================
    -- WEIGHT SCORE
    -- ========================================================

    if v_total_weight is null
      or v_container_max_weight is null
      or v_container_max_weight <= 0 then
      v_weight_score := 50;
    else
      v_weight_ratio :=
        v_per_package_weight /
        v_container_max_weight;

      v_weight_score :=
        case
          when v_weight_ratio > 1
            then 0
          when v_weight_ratio >= 0.85
            then 100
          when v_weight_ratio >= 0.70
            then 90
          when v_weight_ratio >= 0.50
            then 75
          when v_weight_ratio >= 0.25
            then 60
          else 40
        end;
    end if;

    -- ========================================================
    -- VOLUME SCORE
    -- ========================================================

    if v_total_volume is null
      or v_container_max_volume is null
      or v_container_max_volume <= 0 then
      v_volume_score := 50;
    else
      v_volume_ratio :=
        v_per_package_volume /
        v_container_max_volume;

      v_volume_score :=
        case
          when v_volume_ratio > 1
            then 0
          when v_volume_ratio >= 0.85
            then 100
          when v_volume_ratio >= 0.70
            then 90
          when v_volume_ratio >= 0.50
            then 75
          when v_volume_ratio >= 0.25
            then 60
          else 40
        end;
    end if;

    -- ========================================================
    -- COMPATIBILITY
    -- ========================================================

    v_compatibility_score :=
      70;

    if v_temperature_controlled
      and v_container.temperature_controlled then
      v_compatibility_score :=
        v_compatibility_score + 15;

      v_reasons :=
        array_append(
          v_reasons,
          'Ambalaj sıcaklık kontrollü ürünlerle uyumludur.'
        );
    end if;

    if v_hazardous_material
      and v_container.hazardous_material_allowed then
      v_compatibility_score :=
        v_compatibility_score + 15;

      v_reasons :=
        array_append(
          v_reasons,
          'Ambalaj tehlikeli madde taşımasına uygundur.'
        );
    end if;

    if v_container.type in (
      'carton',
      'box'
    ) then
      v_compatibility_score :=
        v_compatibility_score + 5;

      v_reasons :=
        array_append(
          v_reasons,
          'Ambalaj standart koli paketleme operasyonuna uygundur.'
        );
    end if;

    v_compatibility_score :=
      greatest(
        0,
        least(
          100,
          v_compatibility_score
        )
      );

    -- ========================================================
    -- UTILIZATION
    -- ========================================================

    v_utilization_score :=
      greatest(
        0,
        least(
          100,
          round(
            (
              v_weight_score +
              v_volume_score
            )::numeric / 2
          )::integer
        )
      );

    -- ========================================================
    -- STRATEGY
    -- ========================================================

    v_strategy_score :=
      case v_packing.strategy
        when 'palletization' then
          case
            when v_container.type = 'pallet'
              then 100
            else 20
          end

        when 'temperature_controlled' then
          case
            when v_container.temperature_controlled
              then 100
            else 0
          end

        when 'hazardous_material' then
          case
            when v_container.hazardous_material_allowed
              then 100
            else 0
          end

        when 'single_package'
          then 90

        when 'multi_package'
          then 80

        when 'single_sku' then
          case
            when v_mixed_sku
              then 20
            else 100
          end

        when 'mixed_sku' then
          case
            when v_mixed_sku
              then 100
            else 75
          end

        when 'weight_based' then
          case
            when v_container.maximum_weight
              is not null
              then 100
            else 50
          end

        when 'volume_based' then
          case
            when v_container.maximum_volume
              is not null
              or v_container.dimensions
                is not null
              then 100
            else 50
          end

        when 'cartonization' then
          case
            when v_container.maximum_volume
              is not null
              or v_container.dimensions
                is not null
              then 100
            else 50
          end

        when 'carrier_optimized'
          then 75

        else 0
      end;

    -- ========================================================
    -- TOTAL SCORE
    -- ========================================================

    v_total_score :=
      greatest(
        0,
        least(
          100,
          round(
            v_weight_score * 0.20
            + v_volume_score * 0.25
            + v_compatibility_score * 0.25
            + v_utilization_score * 0.20
            + v_strategy_score * 0.10
          )::integer
        )
      );

    -- ========================================================
    -- TEXT[] REASONS / WARNINGS
    -- ========================================================

    if v_total_weight is null then
      v_warnings :=
        array_append(
          v_warnings,
          'Ürün ağırlık bilgisi eksik olduğu için varsayılan ağırlık puanı kullanıldı.'
        );
    end if;

    if v_total_volume is null then
      v_warnings :=
        array_append(
          v_warnings,
          'Ürün hacim bilgisi eksik olduğu için varsayılan hacim puanı kullanıldı.'
        );
    end if;

    if v_suggested_package_count > 1 then
      v_reasons :=
        array_append(
          v_reasons,
          format(
            'Talep %s paket kullanılarak karşılanabilir.',
            v_suggested_package_count
          )
        );
    end if;

    -- ========================================================
    -- JSONB SCORE / SNAPSHOT
    -- ========================================================

    v_score :=
      jsonb_build_object(
        'weightScore',
          v_weight_score,
        'volumeScore',
          v_volume_score,
        'compatibilityScore',
          v_compatibility_score,
        'utilizationScore',
          v_utilization_score,
        'strategyScore',
          v_strategy_score,
        'totalScore',
          v_total_score
      );

    v_container_snapshot :=
      jsonb_strip_nulls(
        jsonb_build_object(
          'id',
            v_container.id,
          'tenantId',
            v_container.account_id,
          'code',
            v_container.code,
          'name',
            v_container.name,
          'type',
            v_container.type,
          'description',
            v_container.description,
          'dimensions',
            v_container.dimensions,
          'emptyWeight',
            v_container.empty_weight,
          'maximumWeight',
            v_container.maximum_weight,
          'maximumVolume',
            v_container.maximum_volume,
          'weightUnit',
            v_container.weight_unit,
          'volumeUnit',
            v_container.volume_unit,
          'temperatureControlled',
            v_container.temperature_controlled,
          'hazardousMaterialAllowed',
            v_container.hazardous_material_allowed,
          'reusable',
            v_container.reusable,
          'active',
            v_container.active,
          'createdBy',
            v_container.created_by,
          'createdAt',
            v_container.created_at,
          'updatedAt',
            v_container.updated_at
        )
      );

    -- ========================================================
    -- INSERT — EXACT TABLE TYPES
    -- ========================================================

    insert into public.warehouse_packing_suggestions (
      account_id,
      packing_id,
      packing_item_ids,
      container_id,
      strategy,
      container_snapshot,
      suggested_package_count,
      estimated_weight,
      estimated_volume,
      score,
      reasons,
      warnings,
      selected,
      created_at
    )
    values (
      p_account_id,
      v_packing.id,

      -- uuid[]
      v_item_ids,

      v_container.id,
      v_packing.strategy,

      -- jsonb
      v_container_snapshot,

      v_suggested_package_count,

      coalesce(
        v_total_weight,
        0
      ),

      coalesce(
        v_total_volume,
        0
      ),

      -- jsonb
      v_score,

      -- text[]
      v_reasons,

      -- text[]
      v_warnings,

      false,
      v_now
    )
    returning *
    into v_suggestion;

    v_suggestion_ids :=
      array_append(
        v_suggestion_ids,
        v_suggestion.id
      );

    if v_best_suggestion_id is null
      or v_total_score >
        v_best_score then

      v_best_suggestion_id :=
        v_suggestion.id;

      v_best_score :=
        v_total_score;
    end if;
  end loop;

  if cardinality(
    v_suggestion_ids
  ) = 0 then
    raise exception using
      errcode = '22023',
      message =
        'Paketleme koşullarına uygun ambalaj bulunamadı.';
  end if;

  -- ==========================================================
  -- BEST RESULT
  -- ==========================================================

  update public.warehouse_packing_suggestions
  set
    selected =
      true
  where account_id = p_account_id
    and packing_id = v_packing.id
    and id = v_best_suggestion_id;

  -- ==========================================================
  -- RESPONSE
  -- PostgreSQL arrays are converted to JSON arrays by
  -- jsonb_build_object.
  -- ==========================================================

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
            s.id,
          'packingId',
            s.packing_id,
          'packingItemIds',
            s.packing_item_ids,
          'containerId',
            s.container_id,
          'strategy',
            s.strategy,
          'container',
            s.container_snapshot,
          'suggestedPackageCount',
            s.suggested_package_count,
          'estimatedWeight',
            s.estimated_weight,
          'estimatedVolume',
            s.estimated_volume,
          'score',
            s.score,
          'reasons',
            s.reasons,
          'warnings',
            s.warnings,
          'selected',
            s.selected,
          'createdAt',
            s.created_at
        )
        order by
          s.selected desc,
          (
            s.score
              ->> 'totalScore'
          )::numeric desc,
          s.created_at,
          s.id
      ),
      '[]'::jsonb
    )
  into v_suggestions
  from public.warehouse_packing_suggestions s
  where s.account_id = p_account_id
    and s.packing_id = v_packing.id
    and s.id = any(
      v_suggestion_ids
    );

  v_result :=
    jsonb_build_object(
      'ok',
        true,
      'action',
        v_action,
      'packingId',
        v_packing.id,
      'strategy',
        v_packing.strategy,
      'suggestionCount',
        cardinality(
          v_suggestion_ids
        ),
      'selectedSuggestionId',
        v_best_suggestion_id,
      'suggestions',
        v_suggestions
    );

  update public.warehouse_packing_write_requests
  set
    response_payload =
      v_result,
    completed_at =
      v_now
  where account_id = p_account_id
    and request_id = p_request_id
    and user_id = v_user_id;

  return v_result;
end;
$warehouse_packing_generate_suggestions_write$;


revoke all on function
  public.warehouse_packing_generate_suggestions_write(
    uuid,
    uuid,
    uuid,
    uuid[],
    uuid[]
  )
from public;

revoke all on function
  public.warehouse_packing_generate_suggestions_write(
    uuid,
    uuid,
    uuid,
    uuid[],
    uuid[]
  )
from anon;

revoke all on function
  public.warehouse_packing_generate_suggestions_write(
    uuid,
    uuid,
    uuid,
    uuid[],
    uuid[]
  )
from authenticated;

grant execute on function
  public.warehouse_packing_generate_suggestions_write(
    uuid,
    uuid,
    uuid,
    uuid[],
    uuid[]
  )
to authenticated;
