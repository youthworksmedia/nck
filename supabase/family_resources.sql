create extension if not exists "pgcrypto";

create schema if not exists nck;

create table if not exists nck.family_resource_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  icon text not null default '',
  badge text not null default '',
  meta text not null default '',
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.family_resource_lessons (
  id uuid primary key default gen_random_uuid(),
  term integer not null check (term between 1 and 6),
  lesson_number integer not null,
  title text not null,
  scripture text not null default '',
  discussion_url text,
  activity_url text,
  memory_url text,
  memory_text text,
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.family_resource_terms (
  id uuid primary key default gen_random_uuid(),
  term integer not null unique check (term between 1 and 6),
  memory_text text not null default '',
  memory_url text,
  reading_guide_url text,
  reading_guide_canva_url text,
  parent_devotion_url text,
  parent_devotion_canva_url text,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into nck.family_resource_cards (id, title, description, icon, badge, meta, display_order, published)
values
  ('00000000-0000-4000-8000-000000000701', 'Family Discussion Guide', 'Conversation starters for families — connecting Sunday''s lesson to life at home.', '💬', 'Weekly PDF', 'per lesson', 1, true),
  ('00000000-0000-4000-8000-000000000702', 'Activity Sheet', 'Printable colouring and activity pages tied to each week''s lesson. Best for ages 3–7.', '🎨', 'Ages 3–7', 'per lesson', 2, true),
  ('00000000-0000-4000-8000-000000000703', 'Memory Verse Card', 'A printable card with each term''s memory verse — designed for kids to take home and keep.', '📌', 'Per term', 'per term', 3, true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  badge = excluded.badge,
  meta = excluded.meta,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

insert into nck.family_resource_terms (id, term, memory_text, memory_url, published)
values
  ('00000000-0000-4000-8000-000000000901', 1, '"Be strong and courageous." — Joshua 1:9', null, true),
  ('00000000-0000-4000-8000-000000000902', 2, '', null, true),
  ('00000000-0000-4000-8000-000000000903', 3, '', null, true),
  ('00000000-0000-4000-8000-000000000904', 4, '', null, true),
  ('00000000-0000-4000-8000-000000000905', 5, '', null, true),
  ('00000000-0000-4000-8000-000000000906', 6, '', null, true)
on conflict (term) do update
set
  memory_text = excluded.memory_text,
  memory_url = excluded.memory_url,
  published = excluded.published,
  updated_at = timezone('utc', now());

insert into nck.family_resource_lessons (
  id,
  term,
  lesson_number,
  title,
  scripture,
  display_order,
  published
)
values
  ('00000000-0000-4000-8000-000000000801', 1, 1, 'Jesus'' final instructions', 'Acts 1:1–11', 1, true),
  ('00000000-0000-4000-8000-000000000802', 1, 2, 'The Spirit Comes', 'Acts 2', 2, true),
  ('00000000-0000-4000-8000-000000000803', 1, 3, 'Healing and Preaching', 'Acts 3–4:22', 3, true)
on conflict (id) do update
set
  term = excluded.term,
  lesson_number = excluded.lesson_number,
  title = excluded.title,
  scripture = excluded.scripture,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

alter table nck.family_resource_cards enable row level security;
alter table nck.family_resource_lessons enable row level security;
alter table nck.family_resource_terms enable row level security;

drop policy if exists "active members can read family resource cards" on nck.family_resource_cards;
drop policy if exists "active members can read family resource lessons" on nck.family_resource_lessons;
drop policy if exists "active members can read family resource terms" on nck.family_resource_terms;

create policy "active members can read family resource cards"
on nck.family_resource_cards
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

create policy "active members can read family resource lessons"
on nck.family_resource_lessons
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

create policy "active members can read family resource terms"
on nck.family_resource_terms
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
