-- WarehouseIQ
-- Yönetim Merkezi için kullanıcı denetim kayıtları.
-- Şifre, access token veya başka gizli kimlik doğrulama verileri tutulmaz.

create table if not exists public.warehouse_audit_logs (
  id uuid primary key default gen_random_uuid(),

  account_id uuid not null
    references public.warehouse_accounts(id)
    on delete cascade,

  warehouse_id uuid,

  actor_id uuid
    references auth.users(id)
    on delete set null,

  actor_role text,

  target_user_id uuid
    references auth.users(id)
    on delete set null,

  action text not null,

  entity_type text not null,

  entity_id uuid,

  summary text not null,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint warehouse_audit_logs_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),

  constraint warehouse_audit_logs_warehouse_fk
    foreign key (account_id, warehouse_id)
    references public.warehouses(account_id, id)
    on delete cascade
);
create index if not exists
  warehouse_audit_logs_account_created_idx
on public.warehouse_audit_logs (
  account_id,
  created_at desc
);
create index if not exists
  warehouse_audit_logs_actor_created_idx
on public.warehouse_audit_logs (
  actor_id,
  created_at desc
);
create index if not exists
  warehouse_audit_logs_target_created_idx
on public.warehouse_audit_logs (
  target_user_id,
  created_at desc
);
create index if not exists
  warehouse_audit_logs_entity_idx
on public.warehouse_audit_logs (
  entity_type,
  entity_id,
  created_at desc
);
alter table public.warehouse_audit_logs
  enable row level security;
revoke all
  on table public.warehouse_audit_logs
  from public;
revoke all
  on table public.warehouse_audit_logs
  from anon;
revoke all
  on table public.warehouse_audit_logs
  from authenticated;
grant select
  on table public.warehouse_audit_logs
  to authenticated;
drop policy if exists
  warehouse_audit_logs_admin_select
on public.warehouse_audit_logs;
create policy
  warehouse_audit_logs_admin_select
on public.warehouse_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.warehouse_users wu
    where wu.account_id = warehouse_audit_logs.account_id
      and wu.user_id = auth.uid()
      and wu.status = 'active'
      and wu.role = 'admin'
  )
);
create or replace function public.warehouse_audit_warehouse_user_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_account_id uuid;
  v_target_user_id uuid;
  v_actor_role text;
  v_action text;
  v_summary text;
  v_metadata jsonb;
begin
  v_account_id :=
    coalesce(
      new.account_id,
      old.account_id
    );

  v_target_user_id :=
    coalesce(
      new.user_id,
      old.user_id
    );

  select wu.role
  into v_actor_role
  from public.warehouse_users wu
  where wu.account_id = v_account_id
    and wu.user_id = v_actor_id
    and wu.status = 'active'
  order by wu.created_at
  limit 1;

  if tg_op = 'INSERT' then
    v_action :=
      case
        when new.status = 'invited'
          then 'user_invited'
        else 'user_created'
      end;

    v_summary :=
      case
        when new.status = 'invited'
          then 'WarehouseIQ kullanıcısı davet edildi.'
        else 'WarehouseIQ kullanıcısı oluşturuldu.'
      end;

    v_metadata := jsonb_build_object(
      'status', new.status,
      'role', new.role
    );

    insert into public.warehouse_audit_logs (
      account_id,
      actor_id,
      actor_role,
      target_user_id,
      action,
      entity_type,
      entity_id,
      summary,
      metadata
    )
    values (
      v_account_id,
      v_actor_id,
      v_actor_role,
      v_target_user_id,
      v_action,
      'warehouse_user',
      new.id,
      v_summary,
      v_metadata
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      insert into public.warehouse_audit_logs (
        account_id,
        actor_id,
        actor_role,
        target_user_id,
        action,
        entity_type,
        entity_id,
        summary,
        metadata
      )
      values (
        v_account_id,
        v_actor_id,
        v_actor_role,
        v_target_user_id,
        'user_role_changed',
        'warehouse_user',
        new.id,
        'WarehouseIQ kullanıcı rolü değiştirildi.',
        jsonb_build_object(
          'old_role', old.role,
          'new_role', new.role
        )
      );
    end if;

    if new.status is distinct from old.status then
      v_action :=
        case new.status
          when 'active' then 'user_activated'
          when 'suspended' then 'user_suspended'
          when 'inactive' then 'user_deactivated'
          when 'invited' then 'user_invited'
          else 'user_status_changed'
        end;

      insert into public.warehouse_audit_logs (
        account_id,
        actor_id,
        actor_role,
        target_user_id,
        action,
        entity_type,
        entity_id,
        summary,
        metadata
      )
      values (
        v_account_id,
        v_actor_id,
        v_actor_role,
        v_target_user_id,
        v_action,
        'warehouse_user',
        new.id,
        'WarehouseIQ kullanıcı durumu değiştirildi.',
        jsonb_build_object(
          'old_status', old.status,
          'new_status', new.status
        )
      );
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.warehouse_audit_logs (
      account_id,
      actor_id,
      actor_role,
      target_user_id,
      action,
      entity_type,
      entity_id,
      summary,
      metadata
    )
    values (
      v_account_id,
      v_actor_id,
      v_actor_role,
      v_target_user_id,
      'user_deleted',
      'warehouse_user',
      old.id,
      'WarehouseIQ kullanıcı üyeliği silindi.',
      jsonb_build_object(
        'old_status', old.status,
        'old_role', old.role
      )
    );

    return old;
  end if;

  return null;
end;
$function$;
drop trigger if exists
  trg_warehouse_audit_warehouse_user_changes
on public.warehouse_users;
create trigger
  trg_warehouse_audit_warehouse_user_changes
after insert or update or delete
on public.warehouse_users
for each row
execute function
  public.warehouse_audit_warehouse_user_changes();
revoke execute
  on function public.warehouse_audit_warehouse_user_changes()
  from public, anon, authenticated;
