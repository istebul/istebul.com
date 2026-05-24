-- P2.3: Productized billing tiers (starter, growth, enterprise)

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

comment on column public.partner_applications.billing_plan is
  'Product tier: pilot (free validation), starter, growth, enterprise; cpl/subscription are legacy aliases';
