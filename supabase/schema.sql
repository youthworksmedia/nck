create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'subscription_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.subscription_status as enum (
      'active',
      'trialing',
      'past_due',
      'canceled',
      'inactive'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'plan_tier'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.plan_tier as enum ('essential', 'growth', 'scale');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'organization_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.organization_role as enum ('owner', 'member');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'admin_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.admin_role as enum ('super_admin');
  end if;
end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_holder_name text,
  church_name text,
  billing_address_line1 text,
  billing_suburb text,
  billing_state text,
  billing_postcode text,
  billing_country text,
  billing_phone text,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.organizations
  add column if not exists account_holder_name text;
alter table public.organizations
  add column if not exists church_name text;
alter table public.organizations
  add column if not exists billing_address_line1 text;
alter table public.organizations
  add column if not exists billing_suburb text;
alter table public.organizations
  add column if not exists billing_state text;
alter table public.organizations
  add column if not exists billing_postcode text;
alter table public.organizations
  add column if not exists billing_country text;
alter table public.organizations
  add column if not exists billing_phone text;

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text,
  invitation_email text,
  role public.organization_role not null default 'member',
  joined_at date not null default current_date,
  created_at timestamptz not null default timezone('utc', now()),
  constraint organization_member_identity_check
    check (user_id is not null or invitation_email is not null)
);

alter table public.organization_members
  add column if not exists display_name text;

create unique index if not exists organization_members_user_unique
  on public.organization_members (organization_id, user_id)
  where user_id is not null;

create unique index if not exists organization_members_invitation_unique
  on public.organization_members (organization_id, invitation_email)
  where invitation_email is not null;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  tier public.plan_tier not null,
  status public.subscription_status not null default 'inactive',
  started_at date not null default current_date,
  current_period_end date not null default (current_date + interval '1 year'),
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique,
  account_holder_name text not null,
  account_holder_email text not null,
  church_name text not null,
  plan_tier public.plan_tier not null,
  amount integer not null,
  currency text not null default 'usd',
  payment_status text not null default 'paid',
  payment_provider text not null default 'fake',
  card_brand text,
  card_last4 text,
  billing_address_line1 text not null,
  billing_suburb text not null,
  billing_state text not null,
  billing_postcode text not null,
  billing_country text not null,
  billing_phone text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.resource_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  lesson_number integer not null default 1,
  scripture text not null default '',
  category_id uuid references public.resource_categories(id) on delete set null,
  category text not null,
  year_cycle text not null default 'Year A',
  term text not null default 'Term 1',
  format text not null,
  file_url text not null,
  music_file_path text,
  music_file_name text,
  worksheet_file_path text,
  worksheet_file_name text,
  manual_file_path text,
  manual_file_name text,
  publish_date date not null default current_date,
  expiry_date date,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.resources
  add column if not exists category_id uuid references public.resource_categories(id) on delete set null;
alter table public.resources
  add column if not exists lesson_number integer not null default 1;
alter table public.resources
  add column if not exists scripture text not null default '';
alter table public.resources
  add column if not exists year_cycle text not null default 'Year A';
alter table public.resources
  add column if not exists term text not null default 'Term 1';
alter table public.resources
  add column if not exists music_file_path text;
alter table public.resources
  add column if not exists music_file_name text;
alter table public.resources
  add column if not exists worksheet_file_path text;
alter table public.resources
  add column if not exists worksheet_file_name text;
alter table public.resources
  add column if not exists manual_file_path text;
alter table public.resources
  add column if not exists manual_file_name text;
alter table public.resources
  add column if not exists publish_date date not null default current_date;
alter table public.resources
  add column if not exists expiry_date date;

create table if not exists public.resource_downloads (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  downloaded_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role public.admin_role not null default 'super_admin',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_roles
  add column if not exists display_name text;

create table if not exists public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  passage text not null,
  age_group text not null,
  lesson_length integer not null check (lesson_length in (30, 45, 60)),
  learning_goal text not null check (learning_goal in ('faith formation', 'discussion', 'apologetics', 'character')),
  created_by_email text not null,
  is_shared boolean not null default false,
  lesson_data jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.email_templates (
  template_key text primary key,
  subject text not null,
  body text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.curriculum_term_notes (
  id uuid primary key default gen_random_uuid(),
  year_cycle text not null,
  term text not null,
  content text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  unique (year_cycle, term)
);

create table if not exists public.curriculum_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.resources enable row level security;
alter table public.resource_downloads enable row level security;
alter table public.admin_roles enable row level security;
alter table public.resource_categories enable row level security;
alter table public.lesson_plans enable row level security;
alter table public.curriculum_term_notes enable row level security;
alter table public.curriculum_settings enable row level security;

alter table public.lesson_plans
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.lesson_plans
  add column if not exists created_by_email text;
alter table public.lesson_plans
  add column if not exists is_shared boolean not null default false;

drop policy if exists "team members can manage their own lesson plans" on public.lesson_plans;
drop policy if exists "team members can read shared or own lesson plans" on public.lesson_plans;
drop policy if exists "team members can create their own lesson plans" on public.lesson_plans;
drop policy if exists "team members can update their own lesson plans" on public.lesson_plans;
drop policy if exists "team members can delete their own lesson plans" on public.lesson_plans;
drop policy if exists "members can read own organization" on public.organizations;
drop policy if exists "admins can read their own admin role" on public.admin_roles;
drop policy if exists "active members can read categories" on public.resource_categories;
drop policy if exists "members can read team membership" on public.organization_members;
drop policy if exists "owners can invite members" on public.organization_members;
drop policy if exists "owners can delete members" on public.organization_members;
drop policy if exists "members can read active subscription" on public.subscriptions;
drop policy if exists "active members can read resources" on public.resources;
drop policy if exists "active members can read curriculum term notes" on public.curriculum_term_notes;
drop policy if exists "active members can log downloads" on public.resource_downloads;

create or replace function public.is_active_member(target_org uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    where om.organization_id = target_org
      and om.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  );
$$;

create policy "members can read own organization"
on public.organizations
for select
using (public.is_active_member(id));

create policy "admins can read their own admin role"
on public.admin_roles
for select
using (user_id = auth.uid());

create policy "active members can read categories"
on public.resource_categories
for select
using (
  exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    where om.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  )
);

create policy "members can read team membership"
on public.organization_members
for select
using (public.is_active_member(organization_id));

create policy "owners can invite members"
on public.organization_members
for insert
with check (
  exists (
    select 1
    from public.organization_members owner_row
    join public.subscriptions s on s.organization_id = owner_row.organization_id
    where owner_row.organization_id = public.organization_members.organization_id
      and owner_row.user_id = auth.uid()
      and owner_row.role = 'owner'
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  )
);

create policy "owners can delete members"
on public.organization_members
for delete
using (
  exists (
    select 1
    from public.organization_members owner_row
    join public.subscriptions s on s.organization_id = owner_row.organization_id
    where owner_row.organization_id = organization_members.organization_id
      and owner_row.user_id = auth.uid()
      and owner_row.role = 'owner'
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  )
);

create policy "members can read active subscription"
on public.subscriptions
for select
using (public.is_active_member(organization_id));

create policy "active members can read resources"
on public.resources
for select
using (
  exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    where om.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  )
);

create policy "active members can read curriculum term notes"
on public.curriculum_term_notes
for select
using (
  exists (
    select 1
    from public.organization_members om
    join public.subscriptions s on s.organization_id = om.organization_id
    where om.user_id = auth.uid()
      and s.status in ('active', 'trialing')
      and s.current_period_end >= current_date
  )
);

create policy "active members can log downloads"
on public.resource_downloads
for insert
with check (public.is_active_member(organization_id));

create policy "team members can read shared or own lesson plans"
on public.lesson_plans
for select
using (
  public.is_active_member(organization_id)
  and (is_shared = true or user_id = auth.uid())
);

create policy "team members can create their own lesson plans"
on public.lesson_plans
for insert
with check (
  user_id = auth.uid()
  and public.is_active_member(organization_id)
);

create policy "team members can update their own lesson plans"
on public.lesson_plans
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "team members can delete their own lesson plans"
on public.lesson_plans
for delete
using (user_id = auth.uid());

insert into public.resource_categories (name)
values
  ('Templates'),
  ('Marketing'),
  ('Analytics')
on conflict do nothing;

update public.resources
set category_id = resource_categories.id
from public.resource_categories
where public.resources.category_id is null
  and lower(public.resources.category) = lower(public.resource_categories.name);

insert into public.resources (title, description, lesson_number, scripture, category, year_cycle, term, format, file_url)
values
  ('God Makes a Good World', 'Children discover that creation is good because God made it and loves what he has made.', 1, 'Genesis 1:1-31', 'Curriculum', 'Year A', 'Term 1', '', ''),
  ('Jesus Welcomes Children', 'A lesson about the kindness of Jesus and his welcome to children.', 2, 'Mark 10:13-16', 'Curriculum', 'Year A', 'Term 1', '', ''),
  ('The Good Shepherd', 'Children learn that Jesus knows, leads, and cares for his people.', 3, 'John 10:1-18', 'Curriculum', 'Year A', 'Term 1', '', ''),
  ('A New Heart', 'Children hear God’s promise to make his people new.', 1, 'Ezekiel 36:24-28', 'Curriculum', 'Year B', 'Term 1', '', ''),
  ('Living as God’s People', 'Children explore how faith shapes everyday life.', 1, 'Colossians 3:12-17', 'Curriculum', 'Year C', 'Term 1', '', '')
on conflict do nothing;

insert into public.curriculum_term_notes (year_cycle, term, content)
values
  ('Year A', 'Term 1', '<h2>Term 1 Summary</h2><p>This term introduces children to the goodness of God in creation, the welcome of Jesus, and the care of the Good Shepherd.</p><h3>Description</h3><p>Use these lessons to establish core language for your group: God made us, Jesus welcomes us, and we can trust him.</p>')
on conflict (year_cycle, term) do nothing;

insert into public.curriculum_settings (key, value)
values ('current_year_cycle', 'Year A')
on conflict (key) do nothing;
