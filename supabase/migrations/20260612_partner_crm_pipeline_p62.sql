-- P6.2 — Partner CRM pipeline: lead → qualified → demo → pilot → negotiation → won | lost

alter table public.partner_applications
  drop constraint if exists partner_applications_status_check;

update public.partner_applications
set status = case status
  when 'new' then 'lead'
  when 'contacted' then 'lead'
  when 'qualified' then 'qualified'
  when 'integrating' then 'pilot'
  when 'live' then 'won'
  when 'rejected' then 'lost'
  else status
end
where status in ('new', 'contacted', 'integrating', 'live', 'rejected');

alter table public.partner_applications
  alter column status set default 'lead';

alter table public.partner_applications
  add constraint partner_applications_status_check
  check (status in (
    'lead',
    'qualified',
    'demo',
    'pilot',
    'negotiation',
    'won',
    'lost'
  ));

comment on column public.partner_applications.status is
  'P6.2 partner AE CRM: lead, qualified, demo, pilot, negotiation, won, lost';
