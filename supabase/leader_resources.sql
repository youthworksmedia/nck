create extension if not exists "pgcrypto";

create schema if not exists nck;

create table if not exists nck.leader_resource_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.leader_resource_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references nck.leader_resource_sections(id) on delete cascade,
  title text not null,
  description text not null default '',
  eyebrow text not null default '',
  duration text,
  resource_type text not null default 'video',
  url text,
  file_path text,
  file_name text,
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into nck.leader_resource_sections (id, title, description, display_order, published)
values
  ('00000000-0000-4000-8000-000000000501', 'Video Training', '', 1, true),
  ('00000000-0000-4000-8000-000000000502', 'Tools', '', 2, true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

insert into nck.leader_resource_items (
  id,
  section_id,
  title,
  description,
  eyebrow,
  duration,
  resource_type,
  url,
  display_order,
  published
)
values
  (
    '00000000-0000-4000-8000-000000000601',
    '00000000-0000-4000-8000-000000000501',
    'Adapting the curriculum',
    'How to flex the lessons for your group''s age range, attention span, and church context.',
    'Video',
    '12 min',
    'video',
    null,
    1,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000602',
    '00000000-0000-4000-8000-000000000501',
    'More videos coming',
    'New training content added each term.',
    '',
    null,
    'coming_soon',
    null,
    2,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000603',
    '00000000-0000-4000-8000-000000000502',
    'Games Library',
    'Recommended games by age group, with full instructions.',
    'Tool',
    null,
    'tool',
    '/leaders/games',
    1,
    true
  )
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  eyebrow = excluded.eyebrow,
  duration = excluded.duration,
  resource_type = excluded.resource_type,
  url = excluded.url,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

alter table nck.leader_resource_sections enable row level security;
alter table nck.leader_resource_items enable row level security;

drop policy if exists "active members can read leader resource sections" on nck.leader_resource_sections;
drop policy if exists "active members can read leader resource items" on nck.leader_resource_items;

create policy "active members can read leader resource sections"
on nck.leader_resource_sections
for select
using (
  exists (
    select 1
    from nck.organization_members om
    join nck.subscriptions s on s.organization_id = om.organization_id
    where om.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  )
);

create policy "active members can read leader resource items"
on nck.leader_resource_items
for select
using (
  exists (
    select 1
    from nck.organization_members om
    join nck.subscriptions s on s.organization_id = om.organization_id
    where om.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  )
);

select pg_notify('pgrst', 'reload schema');
