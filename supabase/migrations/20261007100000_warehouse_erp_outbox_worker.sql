-- WarehouseIQ ERP/ERI outbox worker lifecycle.
--
-- claim:
--   pending/failed -> processing
--
-- success:
--   processing -> acknowledged
--
-- failure:
--   processing -> failed + retry schedule
--
-- Stale processing rows are automatically made retryable.

create or replace function public.warehouse_erp_outbox_claim(
  p_limit integer default 10
)
returns setof public.warehouse_erp_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_erp_outbox_claim$
declare
  v_limit integer :=
    least(
      greatest(
        coalesce(p_limit, 10),
        1
      ),
      50
    );
begin
  update public.warehouse_erp_outbox
  set
    status = 'failed',
    last_error = coalesce(
      last_error,
      'İşleme kilidi zaman aşımı nedeniyle yeniden kuyruğa alındı.'
    ),
    next_attempt_at = now(),
    updated_at = now()
  where status = 'processing'
    and last_attempt_at is not null
    and last_attempt_at <
      now() - interval '15 minutes';

  return query
  update public.warehouse_erp_outbox as outbox
  set
    status = 'processing',
    attempt_count = outbox.attempt_count + 1,
    last_attempt_at = now(),
    next_attempt_at = null,
    updated_at = now()
  from (
    select candidate.id
    from public.warehouse_erp_outbox as candidate
    where candidate.status in (
      'pending',
      'failed'
    )
      and (
        candidate.next_attempt_at is null
        or candidate.next_attempt_at <= now()
      )
    order by
      candidate.created_at,
      candidate.id
    for update skip locked
    limit v_limit
  ) as claimed
  where outbox.id = claimed.id
  returning outbox.*;
end;
$warehouse_erp_outbox_claim$;

create or replace function public.warehouse_erp_outbox_ack(
  p_outbox_id uuid,
  p_response jsonb default null
)
returns public.warehouse_erp_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_erp_outbox_ack$
declare
  v_row public.warehouse_erp_outbox%rowtype;
begin
  update public.warehouse_erp_outbox
  set
    status = 'acknowledged',
    response_payload = p_response,
    sent_at = coalesce(sent_at, now()),
    acknowledged_at = now(),
    last_error = null,
    next_attempt_at = null,
    updated_at = now()
  where id = p_outbox_id
    and status = 'processing'
  returning *
  into v_row;

  if not found then
    raise exception
      'ERP/ERI outbox kaydı işlenebilir durumda değil: %',
      p_outbox_id
      using errcode = 'P0001';
  end if;

  return v_row;
end;
$warehouse_erp_outbox_ack$;

create or replace function public.warehouse_erp_outbox_fail(
  p_outbox_id uuid,
  p_error text,
  p_retry_seconds integer default 300
)
returns public.warehouse_erp_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $warehouse_erp_outbox_fail$
declare
  v_row public.warehouse_erp_outbox%rowtype;
  v_retry_seconds integer :=
    least(
      greatest(
        coalesce(p_retry_seconds, 300),
        30
      ),
      86400
    );
begin
  update public.warehouse_erp_outbox
  set
    status = 'failed',
    last_error = left(
      nullif(
        btrim(
          coalesce(
            p_error,
            'Bilinmeyen ERP/ERI entegrasyon hatası.'
          )
        ),
        ''
      ),
      4000
    ),
    next_attempt_at =
      now() + make_interval(
        secs => v_retry_seconds
      ),
    updated_at = now()
  where id = p_outbox_id
    and status = 'processing'
  returning *
  into v_row;

  if not found then
    raise exception
      'ERP/ERI outbox kaydı hata durumuna alınamadı: %',
      p_outbox_id
      using errcode = 'P0001';
  end if;

  return v_row;
end;
$warehouse_erp_outbox_fail$;

revoke all on function
  public.warehouse_erp_outbox_claim(integer)
from public;

revoke all on function
  public.warehouse_erp_outbox_claim(integer)
from anon;

revoke all on function
  public.warehouse_erp_outbox_claim(integer)
from authenticated;

grant execute on function
  public.warehouse_erp_outbox_claim(integer)
to service_role;


revoke all on function
  public.warehouse_erp_outbox_ack(uuid, jsonb)
from public;

revoke all on function
  public.warehouse_erp_outbox_ack(uuid, jsonb)
from anon;

revoke all on function
  public.warehouse_erp_outbox_ack(uuid, jsonb)
from authenticated;

grant execute on function
  public.warehouse_erp_outbox_ack(uuid, jsonb)
to service_role;


revoke all on function
  public.warehouse_erp_outbox_fail(uuid, text, integer)
from public;

revoke all on function
  public.warehouse_erp_outbox_fail(uuid, text, integer)
from anon;

revoke all on function
  public.warehouse_erp_outbox_fail(uuid, text, integer)
from authenticated;

grant execute on function
  public.warehouse_erp_outbox_fail(uuid, text, integer)
to service_role;
