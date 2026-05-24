-- P2: Partner revenue platform — self-serve onboarding & attribution

alter table public.partner_applications
  add column if not exists onboarding_token text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists webhook_url_draft text,
  add column if not exists partner_endpoint_id uuid references public.partner_endpoints(id) on delete set null,
  add column if not exists billing_plan text not null default 'pilot';

create unique index if not exists partner_applications_onboarding_token_key
  on public.partner_applications (onboarding_token)
  where onboarding_token is not null;

alter table public.partner_applications
  drop constraint if exists partner_applications_billing_plan_check;

alter table public.partner_applications
  add constraint partner_applications_billing_plan_check
  check (billing_plan in ('pilot', 'cpl', 'subscription', 'enterprise'));
