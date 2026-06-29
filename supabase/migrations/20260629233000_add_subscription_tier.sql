alter table profiles
add column if not exists subscription_tier text not null default 'free'
check (subscription_tier in ('free', 'plus'));
