create table if not exists profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  created_at timestamptz default now()
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  is_self boolean default false,
  display_name text not null,
  relation text,
  is_minor boolean default false,
  birth_date date,
  birth_time time,
  birth_precision text not null default 'date' check (birth_precision in ('exact', 'date', 'year')),
  birth_lat numeric,
  birth_lng numeric,
  birth_place text,
  tz_offset_min int,
  linked_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists charts (
  person_id uuid primary key references people(id) on delete cascade,
  house_system text default 'placidus',
  data jsonb not null,
  engine_version int not null,
  computed_at timestamptz default now()
);

create table if not exists relationships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  person_a uuid not null references people(id),
  person_b uuid not null references people(id),
  relation_type text not null
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  kind text default 'group',
  created_at timestamptz default now()
);

create table if not exists group_members (
  group_id uuid references groups(id) on delete cascade,
  person_id uuid references people(id),
  primary key (group_id, person_id)
);

create table if not exists synastry (
  owner_id uuid not null references auth.users(id),
  person_low uuid not null references people(id),
  person_high uuid not null references people(id),
  relation_type text not null,
  data jsonb not null,
  engine_version int not null,
  computed_at timestamptz default now(),
  primary key (person_low, person_high, relation_type)
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  about_person uuid references people(id),
  pair_low uuid,
  pair_high uuid,
  body text not null,
  transit_snapshot jsonb,
  created_at timestamptz default now()
);

create table if not exists threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  mode text not null check (mode in ('ask', 'shared')),
  subject_person uuid references people(id),
  pair_low uuid,
  pair_high uuid,
  group_id uuid references groups(id),
  created_at timestamptz default now()
);

create table if not exists thread_participants (
  thread_id uuid references threads(id) on delete cascade,
  user_id uuid references auth.users(id),
  consented_at timestamptz,
  left_at timestamptz,
  primary key (thread_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references threads(id) on delete cascade,
  sender text not null,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists transits (
  person_id uuid references people(id),
  day date,
  data jsonb not null,
  primary key (person_id, day)
);

alter table profiles enable row level security;
alter table people enable row level security;
alter table charts enable row level security;
alter table relationships enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table synastry enable row level security;
alter table notes enable row level security;
alter table threads enable row level security;
alter table thread_participants enable row level security;
alter table messages enable row level security;
alter table transits enable row level security;
