create table if not exists nck.dashboard_user_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references nck.organizations(id) on delete cascade,
  dashboard_seen_at timestamptz,
  last_resource_id uuid,
  last_resource_accessed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, organization_id)
);

alter table nck.dashboard_user_state enable row level security;

drop policy if exists "members can read own dashboard state" on nck.dashboard_user_state;
create policy "members can read own dashboard state"
on nck.dashboard_user_state
for select
using (user_id = auth.uid() and nck.is_active_member(organization_id));

drop policy if exists "members can update own dashboard state" on nck.dashboard_user_state;
create policy "members can update own dashboard state"
on nck.dashboard_user_state
for all
using (user_id = auth.uid() and nck.is_active_member(organization_id))
with check (user_id = auth.uid() and nck.is_active_member(organization_id));

insert into nck.dashboard_user_state (
  user_id,
  organization_id,
  dashboard_seen_at,
  created_at,
  updated_at
)
select
  om.user_id,
  om.organization_id,
  timezone('utc', now()),
  timezone('utc', now()),
  timezone('utc', now())
from nck.organization_members om
where om.user_id is not null
on conflict (user_id, organization_id) do nothing;

insert into nck.curriculum_settings (key, value)
values (
  'dashboard_welcome_settings',
  '{"firstTimeHtml":"<h2>Welcome to New Creation Kids!</h2><p>We''re glad you''re here. New Creation Kids exists for one purpose: to see children formed as disciples of Jesus. Not just taught a Bible story once a week, but discipled in a way that shapes their families, their leaders, and the church around them. Everything on this site works toward three goals: children growing as disciples, leaders equipped for the task of teaching them well, and families able to continue the conversation at home every week.</p><h2>Where to go next</h2><p><strong>Teach</strong> - weekly lesson content, activities, and leader''s notes.</p><p><strong>Leaders</strong> - training videos, tools and games library.</p><p><strong>Family</strong> - take-home resources that help parents keep discipling their kids throughout the week.</p><p>Watch the short video below to meet the team from New Creation Kids.</p>","returningHtml":"<h2>Welcome back!</h2><p>Everything you need for this week is one click away. Teach, Leaders, Family.</p>","returningHtmls":["<h2>Welcome back!</h2><p>Everything you need for this week is one click away. Teach, Leaders, Family.</p>"],"introVideoTitle":"Introduction to New Creation Kids","introVideoUrl":"","bibleVerses":[{"text":"Children are a heritage from the Lord, offspring a reward from him.","reference":"Psalm 127:3"}]}'
)
on conflict (key) do nothing;
