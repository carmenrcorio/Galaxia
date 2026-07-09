-- House system is an explicit, stored user choice (Placidus default).
-- The charts row records the system actually computed; this column records
-- the user's preference, applied when charts are (re)computed.
alter table profiles
add column if not exists house_system text not null default 'placidus'
check (house_system in ('placidus', 'whole', 'equal'));
