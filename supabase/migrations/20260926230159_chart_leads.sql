-- Anonymous Quick Chart email capture and drip state.
--
-- chart_data stores only the validated BirthFormInput needed to recompute a
-- chart with the current engine. It deliberately does not store computed
-- placements or aspects.

create table public.chart_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  chart_data jsonb not null,
  source text not null default 'free_chart',
  subscribed boolean not null default true,
  drip_step integer not null default 0 check (drip_step between 0 and 3),
  last_drip_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chart_leads_email_normalized check (email = lower(btrim(email))),
  constraint chart_leads_chart_data_object check (jsonb_typeof(chart_data) = 'object')
);

comment on table public.chart_leads is
  'Anonymous Quick Chart leads. Stores validated birth inputs only; drip jobs recompute placements with the current astrology engine. Service-role only.';

alter table public.chart_leads enable row level security;
-- No client policies. API and future cron routes use the service role.
revoke all on table public.chart_leads from anon, authenticated;

create or replace function public.set_chart_leads_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_chart_leads_updated_at() from public, anon, authenticated;

create trigger chart_leads_set_updated_at
before update on public.chart_leads
for each row execute function public.set_chart_leads_updated_at();
