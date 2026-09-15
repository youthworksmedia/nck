create schema if not exists nck;

alter table nck.organizations enable row level security;
alter table nck.organization_members enable row level security;
alter table nck.subscriptions enable row level security;

create or replace function nck.is_active_member(target_org uuid)
returns boolean
language sql
stable
SET search_path = nck
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

drop policy if exists "members can read own organization" on nck.organizations;
create policy "members can read own organization"
on nck.organizations
for select
using (nck.is_active_member(id));

drop policy if exists "members can read team membership" on nck.organization_members;
create policy "members can read team membership"
on nck.organization_members
for select
using (nck.is_active_member(organization_id));

drop policy if exists "owners can invite members" on nck.organization_members;
create policy "owners can invite members"
on nck.organization_members
for insert
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

drop policy if exists "owners can delete members" on nck.organization_members;
create policy "owners can delete members"
on nck.organization_members
for delete
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

drop policy if exists "members can read active subscription" on nck.subscriptions;
create policy "members can read active subscription"
on nck.subscriptions
for select
using (nck.is_active_member(organization_id));
