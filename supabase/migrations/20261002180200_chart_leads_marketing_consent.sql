-- Extend chart_leads for Galaxia Notes consent, nullable chart_data, and signup linkage.
-- Source values include homepage, chart, blog, welcome (legacy free_chart remains valid).

alter table public.chart_leads
  alter column chart_data drop not null;

alter table public.chart_leads
  add column if not exists consent_marketing boolean not null default false;

alter table public.chart_leads
  add column if not exists converted_user_id uuid references auth.users(id) on delete set null;

comment on column public.chart_leads.consent_marketing is
  'Opt-in for Galaxia Notes (biweekly editorial). Independent of subscribed (chart transit email). Service-role only.';

comment on column public.chart_leads.converted_user_id is
  'Set when this lead email matches a new auth.users row. Backfilled by mark_new_user_chart_lead_converted and mark_chart_lead_conversions.';

create or replace function public.mark_chart_lead_conversions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  converted_count integer;
begin
  update public.chart_leads as lead
  set
    converted_at = now(),
    converted_user_id = coalesce(lead.converted_user_id, account.id)
  from auth.users as account
  where lead.converted_at is null
    and account.email is not null
    and lower(account.email) = lead.email;

  get diagnostics converted_count = row_count;
  return converted_count;
end;
$$;

create or replace function public.mark_new_user_chart_lead_converted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    update public.chart_leads
    set
      converted_at = coalesce(converted_at, now()),
      converted_user_id = coalesce(converted_user_id, new.id)
    where email = lower(new.email);
  end if;
  return new;
end;
$$;
