-- P2.1: Self-serve partner acquisition funnel (6 steps)

alter table public.partner_applications
  add column if not exists onboarding_step smallint not null default 1,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists qualification_data jsonb not null default '{}'::jsonb,
  add column if not exists lead_needs_data jsonb not null default '{}'::jsonb,
  add column if not exists test_payload_verified boolean not null default false,
  add column if not exists integration_notes text;

alter table public.partner_applications
  drop constraint if exists partner_applications_onboarding_step_check;

alter table public.partner_applications
  add constraint partner_applications_onboarding_step_check
  check (onboarding_step >= 1 and onboarding_step <= 6);
