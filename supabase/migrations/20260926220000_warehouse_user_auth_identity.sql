-- WarehouseIQ kullanıcılarının Supabase Auth kimliği için
-- sunucu tarafı eşleme alanı.
-- Parola bu tabloda tutulmaz.

ALTER TABLE public.warehouse_users
  ADD COLUMN IF NOT EXISTS auth_email text;
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_users_auth_email_unique
  ON public.warehouse_users (lower(auth_email))
  WHERE auth_email IS NOT NULL;
