-- Chart lead drip unsubscribe and signup conversion tracking.
-- Phase 1's chart_leads migration is already applied and remains immutable.

alter table public.chart_leads
  add column unsubscribe_token uuid not null default gen_random_uuid();

create unique index chart_leads_unsubscribe_token_idx
  on public.chart_leads (unsubscribe_token);

comment on column public.chart_leads.unsubscribe_token is
  'Opaque no-login token used by the chart-lead CAN-SPAM unsubscribe endpoint. Service-role only.';

-- Called once at the start of each drip run. It converts every lead whose
-- normalized address now exists in auth.users without exposing auth.users
-- through PostgREST or paging the Auth Admin API.
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
  set converted_at = now()
  from auth.users as account
  where lead.converted_at is null
    and account.email is not null
    and lower(account.email) = lead.email;

  get diagnostics converted_count = row_count;
  return converted_count;
end;
$$;

comment on function public.mark_chart_lead_conversions() is
  'Marks chart leads converted when their normalized email exists in auth.users. Service-role cron only.';

revoke all on function public.mark_chart_lead_conversions() from public, anon, authenticated;
grant execute on function public.mark_chart_lead_conversions() to service_role;

-- Immediate conversion path for new signups. The daily reconciliation above
-- remains the backstop for pre-existing accounts and transient trigger errors.
create or replace function public.mark_new_user_chart_lead_converted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    update public.chart_leads
    set converted_at = coalesce(converted_at, now())
    where email = lower(new.email);
  end if;
  return new;
end;
$$;

revoke all on function public.mark_new_user_chart_lead_converted() from public, anon, authenticated;

drop trigger if exists on_auth_user_chart_lead_conversion on auth.users;
create trigger on_auth_user_chart_lead_conversion
after insert or update of email on auth.users
for each row execute function public.mark_new_user_chart_lead_converted();
