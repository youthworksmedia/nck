alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscriptions enable row level security;

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

drop policy if exists "members can read own organization" on public.organizations;
create policy "members can read own organization"
on public.organizations
for select
using (public.is_active_member(id));

drop policy if exists "members can read team membership" on public.organization_members;
create policy "members can read team membership"
on public.organization_members
for select
using (public.is_active_member(organization_id));

drop policy if exists "owners can invite members" on public.organization_members;
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

drop policy if exists "owners can delete members" on public.organization_members;
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

drop policy if exists "members can read active subscription" on public.subscriptions;
create policy "members can read active subscription"
on public.subscriptions
for select
using (public.is_active_member(organization_id));
