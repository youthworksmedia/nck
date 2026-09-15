create extension if not exists "pgcrypto";

create schema if not exists nck;

create table if not exists nck.ministry_leader_resource_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  display_order integer not null default 0,
  published boolean not null default true,
  visible_to_account_holders boolean not null default true,
  visible_to_team_members boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.ministry_leader_resource_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references nck.ministry_leader_resource_sections(id) on delete cascade,
  title text not null,
  description text not null default '',
  icon text not null default 'file',
  resource_type text not null default 'pdf',
  action_label text not null default '',
  file_path text,
  file_name text,
  url text,
  duration text,
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.help_faq_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.help_faq_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references nck.help_faq_sections(id) on delete cascade,
  question text not null,
  answer_html text not null default '',
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into nck.ministry_leader_resource_sections (id, title, description, display_order, published)
values
  ('00000000-0000-4000-8000-000000000101', 'Planning', 'Tools to map your ministry year', 1, true),
  ('00000000-0000-4000-8000-000000000102', 'Promotion', 'Videos and assets to share the curriculum with your church', 2, true),
  ('00000000-0000-4000-8000-000000000103', 'Coming soon', 'More leader resources in development', 3, true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

insert into nck.ministry_leader_resource_items (
  id,
  section_id,
  title,
  description,
  icon,
  resource_type,
  action_label,
  duration,
  display_order,
  published
)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Annual Planner 2027', 'Map all 4 terms onto your church calendar', 'calendar', 'pdf', 'PDF', null, 1, true),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'Ministry Budget Template', 'Plan curriculum, events and supplies', 'spreadsheet', 'xlsx', 'XLSX', null, 2, true),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102', '30-second Promo Video', 'For Sunday service screens - 1920x1080 MP4', 'play', 'video', 'Watch', '0:30', 1, true),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000102', '90-second Vision Video', 'For parent meetings - with subtitles', 'play', 'video', 'Watch', '1:30', 2, true),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000102', 'Social Media Pack', 'Instagram squares, story templates, posters', 'palette', 'zip', 'ZIP', null, 3, true),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000103', 'Volunteer Recruitment Pack', 'In development', 'people', 'coming_soon', 'Coming soon', null, 1, true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  resource_type = excluded.resource_type,
  action_label = excluded.action_label,
  duration = excluded.duration,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

insert into nck.help_faq_sections (id, title, description, display_order, published, visible_to_account_holders, visible_to_team_members)
values
  ('00000000-0000-4000-8000-000000000301', 'Class room', 'Questions about running lessons with children and leaders.', 1, true, true, true),
  ('00000000-0000-4000-8000-000000000302', 'Preparation', 'Planning, printing, and leader preparation guidance.', 2, true, true, true),
  ('00000000-0000-4000-8000-000000000303', 'Technical', 'Account, login, download, and browser support.', 3, true, true, true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  display_order = excluded.display_order,
  published = excluded.published,
  visible_to_account_holders = excluded.visible_to_account_holders,
  visible_to_team_members = excluded.visible_to_team_members,
  updated_at = timezone('utc', now());

insert into nck.help_faq_items (
  id,
  section_id,
  question,
  answer_html,
  display_order,
  published
)
values
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000301', 'How should I adapt a lesson for a mixed-age group?', '<p>Start with the main Bible idea, then choose one activity that younger children can enter easily and one discussion question that gives older children room to go deeper.</p>', 1, true),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000301', 'Can team members download resources during the week?', '<p>Yes. Invited team members with an active account can access the teaching library and download the resources they need for preparation.</p>', 2, true),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000302', 'How far ahead should leaders prepare?', '<p>We recommend downloading the lesson at least one week ahead so leaders have time to read the passage, gather materials, and pray through the session.</p>', 1, true),
  ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000302', 'What should be printed for Sunday?', '<p>Print the leader guide for each teacher and enough activity sheets for the children in your group. Keep a spare copy for new leaders or unexpected helpers.</p>', 2, true),
  ('00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000303', 'What should I do if a download does not open?', '<p>Try downloading again in a current browser. If the file still will not open, ask your account holder to check that the subscription is active and contact support with the lesson title.</p>', 1, true),
  ('00000000-0000-4000-8000-000000000406', '00000000-0000-4000-8000-000000000303', 'How does an invited member reset their password?', '<p>Use the missing password link on the login page. Account holders can also reset team member passwords from the Team page.</p>', 2, true),
  ('00000000-0000-4000-8000-000000000407', '00000000-0000-4000-8000-000000000303', 'What does copyrights mean?', '<p>Copyright explains who owns the lesson materials, artwork, downloads, and other resources on New Creation Kids. For now, please treat this as a placeholder support note: your subscription allows your church team to use the resources for ministry, while the original content remains owned by Youthworks.</p>', 3, true)
on conflict (id) do update
set
  question = excluded.question,
  answer_html = excluded.answer_html,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

alter table nck.ministry_leader_resource_sections enable row level security;
alter table nck.ministry_leader_resource_items enable row level security;
alter table nck.help_faq_sections enable row level security;
alter table nck.help_faq_items enable row level security;

drop policy if exists "active owners can read ministry leader sections" on nck.ministry_leader_resource_sections;
drop policy if exists "active owners can read ministry leader items" on nck.ministry_leader_resource_items;
drop policy if exists "active members can read help faq sections" on nck.help_faq_sections;
drop policy if exists "active members can read help faq items" on nck.help_faq_items;

create policy "active owners can read ministry leader sections"
on nck.ministry_leader_resource_sections
for select
using (
  exists (
    select 1
    from nck.organization_members om
    join nck.subscriptions s on s.organization_id = om.organization_id
    where om.user_id = auth.uid()
      and om.role = 'owner'
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  )
);

create policy "active owners can read ministry leader items"
on nck.ministry_leader_resource_items
for select
using (
  exists (
    select 1
    from nck.organization_members om
    join nck.subscriptions s on s.organization_id = om.organization_id
    where om.user_id = auth.uid()
      and om.role = 'owner'
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  )
);

create policy "active members can read help faq sections"
on nck.help_faq_sections
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

create policy "active members can read help faq items"
on nck.help_faq_items
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
