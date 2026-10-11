-- Credential kaldırma ve bağlantı durumunu tek transaction içinde yönet.
-- set_credential satır kilidiyle detach işlemiyle yarışmayı önler.

create or replace function public.warehouse_integration_set_credential(
  p_integration_id uuid,
  p_secret text,
  p_name text default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_account_id uuid;
  v_existing_secret_id uuid;
  v_secret_id uuid;
  v_name text;
  v_description text;
begin
  if nullif(btrim(coalesce(p_secret, '')), '') is null then
    raise exception 'Integration credential boş olamaz.'
      using errcode = 'P0001';
  end if;

  if length(p_secret) > 50000 then
    raise exception 'Integration credential boyutu izin verilen sınırı aşıyor.'
      using errcode = 'P0001';
  end if;

  select integration.account_id, integration.credential_secret_id
    into v_account_id, v_existing_secret_id
    from public.warehouse_integrations as integration
   where integration.id = p_integration_id
   for update;

  if v_account_id is null then
    raise exception 'WarehouseIQ entegrasyonu bulunamadı: %', p_integration_id
      using errcode = 'P0001';
  end if;

  if not public.warehouse_has_account_role(
    v_account_id, array['admin']::text[]
  ) then
    raise exception 'Integration credential yönetimi için admin yetkisi gerekli.'
      using errcode = '42501';
  end if;

  v_name := coalesce(
    nullif(btrim(coalesce(p_name, '')), ''),
    'warehouseiq:' || p_integration_id::text || ':credential'
  );
  v_description := coalesce(
    nullif(btrim(coalesce(p_description, '')), ''),
    'WarehouseIQ Integration Hub credential'
  );

  if v_existing_secret_id is null then
    v_secret_id := vault.create_secret(
      p_secret, v_name, v_description, null
    );
  else
    perform vault.update_secret(
      v_existing_secret_id, p_secret, v_name, v_description, null
    );
    v_secret_id := v_existing_secret_id;
  end if;

  update public.warehouse_integrations
     set credential_secret_id = v_secret_id,
         updated_at = now(),
         last_error = null
   where id = p_integration_id;

  return v_secret_id;
end;
$function$;

create or replace function public.warehouse_integration_detach_credential(
  p_integration_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_account_id uuid;
  v_secret_id uuid;
  v_status text;
begin
  select integration.account_id,
         integration.credential_secret_id,
         integration.status
    into v_account_id, v_secret_id, v_status
    from public.warehouse_integrations as integration
   where integration.id = p_integration_id
   for update;

  if v_account_id is null then
    raise exception 'WarehouseIQ entegrasyonu bulunamadı: %', p_integration_id
      using errcode = 'P0001';
  end if;

  if not public.warehouse_has_account_role(
    v_account_id, array['admin']::text[]
  ) then
    raise exception 'Integration credential yönetimi için admin yetkisi gerekli.'
      using errcode = '42501';
  end if;

  if v_status in ('active', 'testing') then
    raise exception 'Aktif entegrasyonda veya devam eden testte credential kaldırılamaz.'
      using errcode = 'P0001';
  end if;

  update public.warehouse_integrations
     set credential_secret_id = null,
         status = case when status = 'inactive' then 'inactive' else 'draft' end,
         last_test_at = null,
         last_error = 'Credential kaldırıldı; bağlantı testini yeniden çalıştırın.',
         updated_at = now()
   where id = p_integration_id;

  -- Paylaşılan bir secret varsa başka entegrasyonun credential'ını silme.
  if v_secret_id is not null then
    delete from vault.secrets as secret
     where secret.id = v_secret_id
       and not exists (
         select 1
           from public.warehouse_integrations as other_integration
          where other_integration.credential_secret_id = v_secret_id
       );
  end if;

  return true;
end;
$function$;
