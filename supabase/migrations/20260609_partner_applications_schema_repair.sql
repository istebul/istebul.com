-- Repair: ensure partner_applications P2/P2.1 columns exist (idempotent for partial prod deploys)

alter table public.partner_applications
  add column if not exists onboarding_token text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists webhook_url_draft text,
  add column if not exists partner_endpoint_id uuid references public.partner_endpoints(id) on delete set null,
  add column if not exists billing_plan text not null default 'pilot',
  add column if not exists onboarding_step smallint not null default 1,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists qualification_data jsonb not null default '{}'::jsonb,
  add column if not exists lead_needs_data jsonb not null default '{}'::jsonb,
  add column if not exists test_payload_verified boolean not null default false,
  add column if not exists integration_notes text;

create unique index if not exists partner_applications_onboarding_token_key
  on public.partner_applications (onboarding_token)
  where onboarding_token is not null;

alter table public.partner_applications
  drop constraint if exists partner_applications_billing_plan_check;

alter table public.partner_applications
  add constraint partner_applications_billing_plan_check
  check (
    billing_plan in (
      'pilot',
      'starter',
      'growth',
      'enterprise',
      'cpl',
      'subscription'
    )
  );

alter table public.partner_applications
  drop constraint if exists partner_applications_onboarding_step_check;

alter table public.partner_applications
  add constraint partner_applications_onboarding_step_check
  check (onboarding_step >= 1 and onboarding_step <= 6);
