begin;

create schema if not exists nck;
comment on schema nck is 'New Creation Kids application data and database objects.';

grant usage on schema nck to anon, authenticated, service_role;

do $$
declare
  type_name text;
begin
  foreach type_name in array array[
    'subscription_status',
    'plan_tier',
    'organization_role',
    'admin_role'
  ]
  loop
    if to_regtype(format('public.%I', type_name)) is not null
      and to_regtype(format('nck.%I', type_name)) is null
    then
      execute format('alter type public.%I set schema nck', type_name);
    end if;
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations',
    'organization_members',
    'subscriptions',
    'purchase_orders',
    'products',
    'resource_categories',
    'resources',
    'resource_downloads',
    'subscription_email_events',
    'admin_roles',
    'page_performance_logs',
    'lesson_plans',
    'email_templates',
    'curriculum_term_notes',
    'curriculum_settings',
    'ministry_leader_resource_sections',
    'ministry_leader_resource_items',
    'help_faq_sections',
    'help_faq_items',
    'leader_resource_sections',
    'leader_resource_items',
    'family_resource_cards',
    'family_resource_lessons',
    'family_resource_terms',
    'curriculum_unit_overviews',
    'curriculum_unit_graphics',
    'users',
    'locations',
    'forecasts',
    'observations',
    'accuracy_scores'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null
      and to_regclass(format('nck.%I', table_name)) is null
    then
      execute format('alter table public.%I set schema nck', table_name);
    end if;
  end loop;
end $$;

do $$
begin
  if to_regprocedure('public.build_curriculum_lesson_content(text,text)') is not null
    and to_regprocedure('nck.build_curriculum_lesson_content(text,text)') is null
  then
    alter function public.build_curriculum_lesson_content(text, text) set schema nck;
    alter function nck.build_curriculum_lesson_content(text, text) set search_path = nck;
  end if;
end $$;

create or replace function nck.is_active_member(target_org uuid)
returns boolean
language sql
stable
set search_path = nck
as $$
  select exists (
    select 1
    from nck.organization_members om
    join nck.subscriptions s on s.organization_id = om.organization_id
    where om.organization_id = target_org
      and om.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  );
$$;

alter table if exists nck.organizations enable row level security;
alter table if exists nck.organization_members enable row level security;
alter table if exists nck.subscriptions enable row level security;
alter table if exists nck.purchase_orders enable row level security;
alter table if exists nck.products enable row level security;
alter table if exists nck.resource_categories enable row level security;
alter table if exists nck.resources enable row level security;
alter table if exists nck.resource_downloads enable row level security;
alter table if exists nck.subscription_email_events enable row level security;
alter table if exists nck.admin_roles enable row level security;
alter table if exists nck.page_performance_logs enable row level security;
alter table if exists nck.lesson_plans enable row level security;
alter table if exists nck.email_templates enable row level security;
alter table if exists nck.curriculum_term_notes enable row level security;
alter table if exists nck.curriculum_settings enable row level security;
alter table if exists nck.ministry_leader_resource_sections enable row level security;
alter table if exists nck.ministry_leader_resource_items enable row level security;
alter table if exists nck.help_faq_sections enable row level security;
alter table if exists nck.help_faq_items enable row level security;
alter table if exists nck.leader_resource_sections enable row level security;
alter table if exists nck.leader_resource_items enable row level security;
alter table if exists nck.family_resource_cards enable row level security;
alter table if exists nck.family_resource_lessons enable row level security;
alter table if exists nck.family_resource_terms enable row level security;
alter table if exists nck.curriculum_unit_overviews enable row level security;
alter table if exists nck.curriculum_unit_graphics enable row level security;
alter table if exists nck.users enable row level security;
alter table if exists nck.locations enable row level security;
alter table if exists nck.forecasts enable row level security;
alter table if exists nck.observations enable row level security;
alter table if exists nck.accuracy_scores enable row level security;

drop policy if exists "team members can manage their own lesson plans" on nck.lesson_plans;
drop policy if exists "team members can read shared or own lesson plans" on nck.lesson_plans;
drop policy if exists "team members can create their own lesson plans" on nck.lesson_plans;
drop policy if exists "team members can update their own lesson plans" on nck.lesson_plans;
drop policy if exists "team members can delete their own lesson plans" on nck.lesson_plans;
drop policy if exists "members can read own organization" on nck.organizations;
drop policy if exists "admins can read their own admin role" on nck.admin_roles;
drop policy if exists "active members can read categories" on nck.resource_categories;
drop policy if exists "members can read team membership" on nck.organization_members;
drop policy if exists "owners can invite members" on nck.organization_members;
drop policy if exists "owners can delete members" on nck.organization_members;
drop policy if exists "members can read active subscription" on nck.subscriptions;
drop policy if exists "active members can read resources" on nck.resources;
drop policy if exists "active members can read curriculum term notes" on nck.curriculum_term_notes;
drop policy if exists "active owners can read ministry leader sections" on nck.ministry_leader_resource_sections;
drop policy if exists "active owners can read ministry leader items" on nck.ministry_leader_resource_items;
drop policy if exists "active members can read help faq sections" on nck.help_faq_sections;
drop policy if exists "active members can read help faq items" on nck.help_faq_items;
drop policy if exists "active members can read leader resource sections" on nck.leader_resource_sections;
drop policy if exists "active members can read leader resource items" on nck.leader_resource_items;
drop policy if exists "active members can log downloads" on nck.resource_downloads;
drop policy if exists "active members can read family resource cards" on nck.family_resource_cards;
drop policy if exists "active members can read family resource lessons" on nck.family_resource_lessons;
drop policy if exists "active members can read family resource terms" on nck.family_resource_terms;
drop policy if exists "active members can read unit overviews" on nck.curriculum_unit_overviews;
drop policy if exists "active members can read unit graphics" on nck.curriculum_unit_graphics;

drop function if exists public.is_active_member(uuid);

create policy "members can read own organization"
on nck.organizations
for select
to authenticated
using (nck.is_active_member(id));

create policy "admins can read their own admin role"
on nck.admin_roles
for select
to authenticated
using (user_id = auth.uid());

create policy "active members can read categories"
on nck.resource_categories
for select
to authenticated
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

create policy "members can read team membership"
on nck.organization_members
for select
to authenticated
using (nck.is_active_member(organization_id));

create policy "owners can invite members"
on nck.organization_members
for insert
to authenticated
with check (
  exists (
    select 1
    from nck.organization_members owner_row
    join nck.subscriptions s on s.organization_id = owner_row.organization_id
    where owner_row.organization_id = nck.organization_members.organization_id
      and owner_row.user_id = auth.uid()
      and owner_row.role = 'owner'
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  )
);

create policy "owners can delete members"
on nck.organization_members
for delete
to authenticated
using (
  exists (
    select 1
    from nck.organization_members owner_row
    join nck.subscriptions s on s.organization_id = owner_row.organization_id
    where owner_row.organization_id = organization_members.organization_id
      and owner_row.user_id = auth.uid()
      and owner_row.role = 'owner'
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  )
);

create policy "members can read active subscription"
on nck.subscriptions
for select
to authenticated
using (nck.is_active_member(organization_id));

create policy "active members can read resources"
on nck.resources
for select
to authenticated
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

create policy "active owners can read ministry leader sections"
on nck.ministry_leader_resource_sections
for select
to authenticated
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
to authenticated
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
to authenticated
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
to authenticated
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

create policy "active members can read leader resource sections"
on nck.leader_resource_sections
for select
to authenticated
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
to authenticated
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

create policy "active members can read curriculum term notes"
on nck.curriculum_term_notes
for select
to authenticated
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

create policy "active members can log downloads"
on nck.resource_downloads
for insert
to authenticated
with check (nck.is_active_member(organization_id));

create policy "team members can read shared or own lesson plans"
on nck.lesson_plans
for select
to authenticated
using (
  nck.is_active_member(organization_id)
  and (is_shared = true or user_id = auth.uid())
);

create policy "team members can create their own lesson plans"
on nck.lesson_plans
for insert
to authenticated
with check (
  user_id = auth.uid()
  and nck.is_active_member(organization_id)
);

create policy "team members can update their own lesson plans"
on nck.lesson_plans
for update
to authenticated
using (
  user_id = auth.uid()
  and nck.is_active_member(organization_id)
)
with check (
  user_id = auth.uid()
  and nck.is_active_member(organization_id)
);

create policy "team members can delete their own lesson plans"
on nck.lesson_plans
for delete
to authenticated
using (
  user_id = auth.uid()
  and nck.is_active_member(organization_id)
);

create policy "active members can read family resource cards"
on nck.family_resource_cards
for select
to authenticated
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
to authenticated
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
to authenticated
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

create policy "active members can read unit overviews"
on nck.curriculum_unit_overviews
for select
to authenticated
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
to authenticated
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

do $$
begin
  if to_regclass('nck.users') is not null then
    drop policy if exists "users can manage own weather profile" on nck.users;

    create policy "users can manage own weather profile"
    on nck.users
    for all
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());
  end if;

  if to_regclass('nck.locations') is not null then
    drop policy if exists "users can manage own locations" on nck.locations;

    create policy "users can manage own locations"
    on nck.locations
    for all
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;

  if to_regclass('nck.forecasts') is not null then
    drop policy if exists "users can read own forecasts" on nck.forecasts;
    drop policy if exists "service role manages forecasts" on nck.forecasts;

    create policy "users can read own forecasts"
    on nck.forecasts
    for select
    to authenticated
    using (
      exists (
        select 1
        from nck.locations l
        where l.id = forecasts.location_id
          and l.user_id = auth.uid()
      )
    );

    create policy "service role manages forecasts"
    on nck.forecasts
    for all
    to service_role
    using (true)
    with check (true);
  end if;

  if to_regclass('nck.observations') is not null then
    drop policy if exists "users can read own observations" on nck.observations;
    drop policy if exists "service role manages observations" on nck.observations;

    create policy "users can read own observations"
    on nck.observations
    for select
    to authenticated
    using (
      exists (
        select 1
        from nck.locations l
        where l.id = observations.location_id
          and l.user_id = auth.uid()
      )
    );

    create policy "service role manages observations"
    on nck.observations
    for all
    to service_role
    using (true)
    with check (true);
  end if;

  if to_regclass('nck.accuracy_scores') is not null then
    drop policy if exists "users can read own accuracy scores" on nck.accuracy_scores;
    drop policy if exists "service role manages accuracy scores" on nck.accuracy_scores;

    create policy "users can read own accuracy scores"
    on nck.accuracy_scores
    for select
    to authenticated
    using (
      exists (
        select 1
        from nck.locations l
        where l.id = accuracy_scores.location_id
          and l.user_id = auth.uid()
      )
    );

    create policy "service role manages accuracy scores"
    on nck.accuracy_scores
    for all
    to service_role
    using (true)
    with check (true);
  end if;
end $$;

grant select, insert, update, delete on all tables in schema nck to anon, authenticated, service_role;
grant usage, select, update on all sequences in schema nck to anon, authenticated, service_role;
grant execute on function nck.is_active_member(uuid) to authenticated, service_role;

alter default privileges for role postgres in schema nck grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema nck grant usage, select, update on sequences to anon, authenticated, service_role;

commit;
