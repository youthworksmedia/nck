create extension if not exists "pgcrypto";

create schema if not exists nck;

create table if not exists nck.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude numeric(8, 4) not null,
  longitude numeric(8, 4) not null,
  favorited boolean not null default false,
  user_id uuid not null references nck.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.forecasts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references nck.locations(id) on delete cascade,
  provider text not null check (provider in ('BOM', 'YR')),
  forecast_for_date date not null,
  predicted_temp numeric(5, 2),
  predicted_rain numeric(8, 2),
  predicted_wind numeric(8, 2),
  raw_data jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.observations (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references nck.locations(id) on delete cascade,
  observed_date date not null,
  actual_temp numeric(5, 2),
  actual_rain numeric(8, 2),
  actual_wind numeric(8, 2),
  raw_data jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.accuracy_scores (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references nck.locations(id) on delete cascade,
  provider text not null check (provider in ('BOM', 'YR')),
  temp_accuracy numeric(6, 2) not null default 0,
  rain_accuracy numeric(6, 2) not null default 0,
  combined_score numeric(6, 2) not null default 0,
  sample_size integer not null default 0,
  last_updated timestamptz not null default timezone('utc', now()),
  unique (location_id, provider)
);

create index if not exists locations_user_id_idx on nck.locations (user_id, favorited);
create unique index if not exists locations_user_coordinates_unique on nck.locations (user_id, latitude, longitude);
create index if not exists forecasts_location_provider_idx on nck.forecasts (location_id, provider, forecast_for_date desc);
create index if not exists observations_location_date_idx on nck.observations (location_id, observed_date desc);

alter table nck.users enable row level security;
alter table nck.locations enable row level security;
alter table nck.forecasts enable row level security;
alter table nck.observations enable row level security;
alter table nck.accuracy_scores enable row level security;

drop policy if exists "users can manage own weather profile" on nck.users;
create policy "users can manage own weather profile"
on nck.users
for all
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "users can manage own locations" on nck.locations;
create policy "users can manage own locations"
on nck.locations
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users can read own forecasts" on nck.forecasts;
create policy "users can read own forecasts"
on nck.forecasts
for select
using (
  exists (
    select 1
    from nck.locations l
    where l.id = forecasts.location_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists "service role manages forecasts" on nck.forecasts;
create policy "service role manages forecasts"
on nck.forecasts
for all
to service_role
using (true)
with check (true);

drop policy if exists "users can read own observations" on nck.observations;
create policy "users can read own observations"
on nck.observations
for select
using (
  exists (
    select 1
    from nck.locations l
    where l.id = observations.location_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists "service role manages observations" on nck.observations;
create policy "service role manages observations"
on nck.observations
for all
to service_role
using (true)
with check (true);

drop policy if exists "users can read own accuracy scores" on nck.accuracy_scores;
create policy "users can read own accuracy scores"
on nck.accuracy_scores
for select
using (
  exists (
    select 1
    from nck.locations l
    where l.id = accuracy_scores.location_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists "service role manages accuracy scores" on nck.accuracy_scores;
create policy "service role manages accuracy scores"
on nck.accuracy_scores
for all
to service_role
using (true)
with check (true);
