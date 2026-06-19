-- Payment infrastructure: iyzico (primary), PayTR (fallback), Stripe (passive legacy)
-- Client writes disabled; Edge Functions use service_role.

-- ---------------------------------------------------------------------------
-- payment_orders
-- ---------------------------------------------------------------------------
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null check (provider in ('iyzico', 'paytr', 'stripe')),
  product_code text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'TRY',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  conversation_id text unique,
  provider_token text,
  provider_payment_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_user_id_idx on public.payment_orders (user_id);
create index if not exists payment_orders_status_idx on public.payment_orders (status);
create index if not exists payment_orders_provider_idx on public.payment_orders (provider);
create index if not exists payment_orders_conversation_id_idx on public.payment_orders (conversation_id);

-- ---------------------------------------------------------------------------
-- subscriptions (extend existing Stripe table for TR providers)
-- ---------------------------------------------------------------------------
alter table public.subscriptions add column if not exists provider text
  check (provider is null or provider in ('iyzico', 'paytr', 'stripe'));
alter table public.subscriptions add column if not exists plan_code text;
alter table public.subscriptions add column if not exists started_at timestamptz;
alter table public.subscriptions add column if not exists provider_subscription_id text;
alter table public.subscriptions add column if not exists source_order_id uuid references public.payment_orders(id) on delete set null;

create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- ---------------------------------------------------------------------------
-- partner_billing
-- ---------------------------------------------------------------------------
create table if not exists public.partner_billing (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid,
  provider text check (provider in ('iyzico', 'paytr', 'stripe')),
  plan_code text,
  status text not null default 'pending'
    check (status in ('active', 'past_due', 'cancelled', 'expired', 'pending')),
  lead_credit_balance integer not null default 0,
  monthly_quota integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_billing_partner_id_idx on public.partner_billing (partner_id);

-- TODO(partner-rls): Bind partner_id to authenticated partner profile when partner user model is stable.

-- ---------------------------------------------------------------------------
-- partner_lead_credits
-- ---------------------------------------------------------------------------
create table if not exists public.partner_lead_credits (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid,
  source_order_id uuid references public.payment_orders(id) on delete set null,
  credit_amount integer not null default 0,
  used_amount integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists partner_lead_credits_partner_id_idx on public.partner_lead_credits (partner_id);

-- ---------------------------------------------------------------------------
-- payment_webhook_logs
-- ---------------------------------------------------------------------------
create table if not exists public.payment_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('iyzico', 'paytr', 'stripe')),
  event_type text,
  raw_payload jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  processed boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_entitlements
-- ---------------------------------------------------------------------------
create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  entitlement_code text not null,
  source_order_id uuid references public.payment_orders(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_entitlements_user_entitlement_idx
  on public.user_entitlements (user_id, entitlement_code);

-- ---------------------------------------------------------------------------
-- updated_at trigger (payment_orders)
-- ---------------------------------------------------------------------------
create or replace function public.set_payment_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists payment_orders_updated_at on public.payment_orders;
create trigger payment_orders_updated_at
  before update on public.payment_orders
  for each row execute function public.set_payment_orders_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.payment_orders enable row level security;
alter table public.partner_billing enable row level security;
alter table public.partner_lead_credits enable row level security;
alter table public.payment_webhook_logs enable row level security;
alter table public.user_entitlements enable row level security;

-- payment_orders: read own; admin read all; no client writes
drop policy if exists payment_orders_select_own on public.payment_orders;
create policy payment_orders_select_own
  on public.payment_orders for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists payment_orders_admin_select on public.payment_orders;
create policy payment_orders_admin_select
  on public.payment_orders for select to authenticated
  using (public.is_admin());

-- subscriptions: ensure admin read (user read may already exist from bootstrap)
drop policy if exists payment_subscriptions_admin_select on public.subscriptions;
create policy payment_subscriptions_admin_select
  on public.subscriptions for select to authenticated
  using (public.is_admin());

-- user_entitlements
drop policy if exists user_entitlements_select_own on public.user_entitlements;
create policy user_entitlements_select_own
  on public.user_entitlements for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists user_entitlements_admin_select on public.user_entitlements;
create policy user_entitlements_admin_select
  on public.user_entitlements for select to authenticated
  using (public.is_admin());

-- partner tables: admin-only until partner_id ↔ auth mapping is defined
drop policy if exists partner_billing_admin_select on public.partner_billing;
create policy partner_billing_admin_select
  on public.partner_billing for select to authenticated
  using (public.is_admin());

drop policy if exists partner_lead_credits_admin_select on public.partner_lead_credits;
create policy partner_lead_credits_admin_select
  on public.partner_lead_credits for select to authenticated
  using (public.is_admin());

-- webhook logs: admin read only
drop policy if exists payment_webhook_logs_admin_select on public.payment_webhook_logs;
create policy payment_webhook_logs_admin_select
  on public.payment_webhook_logs for select to authenticated
  using (public.is_admin());

-- Revoke direct writes from authenticated (service_role bypasses RLS)
revoke insert, update, delete on public.payment_orders from authenticated, anon;
revoke insert, update, delete on public.partner_billing from authenticated, anon;
revoke insert, update, delete on public.partner_lead_credits from authenticated, anon;
revoke insert, update, delete on public.payment_webhook_logs from authenticated, anon;
revoke insert, update, delete on public.user_entitlements from authenticated, anon;
