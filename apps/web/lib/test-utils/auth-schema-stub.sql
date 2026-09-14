-- Minimal auth.users / auth.uid() stub so committed migrations can replay
-- on a from-scratch local Postgres that is not a Supabase project.
-- Same shape as docs/delete-own-group-person-retest.sql and
-- docs/rls-second-user-retest.sql.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create schema if not exists auth;

create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key,
  aud text,
  role text,
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  confirmation_token text default '',
  recovery_token text default '',
  email_change_token_new text default '',
  email_change text default '',
  is_sso_user boolean not null default false,
  is_anonymous boolean not null default false
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;

-- Blog-post migration 20260909011620 inserts a public storage bucket.
-- A from-scratch local replay is not a Supabase project, so stub the table.
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean,
  file_size_limit integer,
  allowed_mime_types text[]
);

