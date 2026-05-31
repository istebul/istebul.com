-- Partner applications CRM CRUD fields (idempotent, backward compatible).
-- Soft archive only — no physical deletes from admin panel.

alter table public.partner_applications
  add column if not exists website text,
  add column if not exists source_channel text not null default 'web',
  add column if not exists is_active boolean not null default true,
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists next_action text,
  add column if not exists contacted_at timestamptz,
  add column if not exists follow_up_at timestamptz;

update public.partner_applications
set
  is_active = coalesce(is_active, true),
  is_archived = coalesce(is_archived, false),
  source_channel = coalesce(nullif(trim(source_channel), ''), 'web')
where is_active is null
   or is_archived is null
   or source_channel is null
   or trim(source_channel) = '';

alter table public.partner_applications
  drop constraint if exists partner_applications_status_check;

alter table public.partner_applications
  add constraint partner_applications_status_check
  check (status in (
    'lead',
    'qualified',
    'demo',
    'pilot',
    'negotiation',
    'won',
    'lost',
    'inactive',
    'new',
    'contacted',
    'integrating',
    'live',
    'rejected'
  ));

alter table public.partner_applications
  drop constraint if exists partner_applications_category_check;

alter table public.partner_applications
  add constraint partner_applications_category_check
  check (category in (
    'auto',
    'housing',
    'finance',
    'travel',
    'insurance',
    'general',
    'dealer_partner',
    'finance_partner',
    'insurance_partner',
    'premium_report',
    'general_sales'
  ));

create index if not exists partner_applications_active_idx
  on public.partner_applications (is_archived, is_active, created_at desc);

create index if not exists partner_applications_company_name_idx
  on public.partner_applications (lower(company_name));

comment on column public.partner_applications.is_archived is
  'Soft delete / archive — hidden from default admin list when true';
comment on column public.partner_applications.source_channel is
  'web | manual | import | test — CRM origin channel';

-- Manual CRM seed partners (not endpoints). Idempotent by company_name.
insert into public.partner_applications (
  company_name,
  contact_name,
  phone,
  email,
  category,
  status,
  source_channel,
  is_active,
  is_archived,
  notes,
  next_action,
  webhook_ready
)
select
  v.company_name,
  'CRM — manuel kayıt',
  v.phone,
  v.email,
  v.category,
  'lead',
  'manual',
  true,
  false,
  'Admin CRM seed — endpoint ayrı oluşturulur.',
  'İlk outbound + ICP doğrulama',
  false
from (
  values
    ('Arabam', 'auto', '5000000001', 'crm+arabam@partner-crm.local'),
    ('OTORAPOR', 'auto', '5000000002', 'crm+otorapor@partner-crm.local'),
    ('Auto King', 'auto', '5000000003', 'crm+autoking@partner-crm.local'),
    ('Emlakjet', 'housing', '5000000004', 'crm+emlakjet@partner-crm.local'),
    ('Endeksa', 'housing', '5000000005', 'crm+endeksa@partner-crm.local'),
    ('Altın Emlak', 'housing', '5000000006', 'crm+altinemlak@partner-crm.local'),
    ('Coldwell Banker TR', 'housing', '5000000007', 'crm+coldwell@partner-crm.local'),
    ('Hangikredi', 'finance', '5000000008', 'crm+hangikredi@partner-crm.local'),
    ('Hesapkurdu', 'finance', '5000000009', 'crm+hesapkurdu@partner-crm.local'),
    ('ENUYGUN', 'finance', '5000000010', 'crm+enuygun@partner-crm.local'),
    ('Koalay', 'insurance', '5000000011', 'crm+koalay@partner-crm.local')
) as v(company_name, category, phone, email)
where not exists (
  select 1
  from public.partner_applications p
  where lower(trim(p.company_name)) = lower(trim(v.company_name))
);
