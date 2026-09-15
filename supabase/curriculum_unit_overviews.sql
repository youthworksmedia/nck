create extension if not exists "pgcrypto";

create schema if not exists nck;

create table if not exists nck.curriculum_unit_overviews (
  id uuid primary key default gen_random_uuid(),
  year_cycle text not null,
  term text not null,
  eyebrow text not null default '',
  title text not null,
  subtitle text not null default '',
  date_label text not null default '',
  overview_html text not null default '',
  intro_video_title text not null default '',
  intro_video_meta text not null default '',
  intro_video_description text not null default '',
  intro_video_url text,
  deep_dive_video_title text not null default '',
  deep_dive_video_meta text not null default '',
  deep_dive_video_description text not null default '',
  deep_dive_video_url text,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (year_cycle, term)
);

alter table nck.curriculum_unit_overviews
  add column if not exists intro_video_url text,
  add column if not exists deep_dive_video_url text;

create table if not exists nck.curriculum_unit_graphics (
  id uuid primary key default gen_random_uuid(),
  year_cycle text not null,
  term text not null,
  title text not null,
  description text not null default '',
  icon text not null default '🖼️',
  file_path text,
  file_name text,
  include_copyright boolean not null default false,
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into nck.curriculum_unit_overviews (
  year_cycle,
  term,
  eyebrow,
  title,
  subtitle,
  date_label,
  overview_html,
  intro_video_title,
  intro_video_meta,
  intro_video_description,
  deep_dive_video_title,
  deep_dive_video_meta,
  deep_dive_video_description,
  published
)
values (
  'Year 1',
  'Quarter 1',
  'Teach · Year 1',
  'Quarter 1',
  'Luke - Set Free',
  'Jan-Mar · 12 weeks',
  '<h2>About this unit</h2><p>Over 12 weeks, kids will journey through <strong>Luke - Set Free</strong>, exploring Bible passages, big ideas and key moments that shape this unit.</p><p>Before teaching, we recommend leaders review the unit graphics and videos so the team can introduce the quarter with confidence.</p>',
  'Unit Introduction',
  'Video · 8 min',
  'Why this unit fits the bigger story',
  'Teaching Deep Dive',
  'Video · 14 min',
  'How to teach the key passages well',
  true
)
on conflict (year_cycle, term) do nothing;

alter table nck.curriculum_unit_overviews enable row level security;
alter table nck.curriculum_unit_graphics enable row level security;

drop policy if exists "active members can read unit overviews" on nck.curriculum_unit_overviews;
drop policy if exists "active members can read unit graphics" on nck.curriculum_unit_graphics;

create policy "active members can read unit overviews"
on nck.curriculum_unit_overviews
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

create policy "active members can read unit graphics"
on nck.curriculum_unit_graphics
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
