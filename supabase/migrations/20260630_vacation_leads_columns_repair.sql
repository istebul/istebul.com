-- Repair: vacation_leads columns used by vacation-intake edge function
alter table public.vacation_leads
  add column if not exists travelers_count int,
  add column if not exists children_ages text,
  add column if not exists expectations text;
