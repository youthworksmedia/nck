create table if not exists nck.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null default '',
  plan_tier nck.plan_tier not null,
  discount_type text not null check (discount_type in ('amount', 'percent')),
  discount_value numeric(10, 2) not null check (discount_value > 0),
  max_uses_per_account integer check (max_uses_per_account is null or max_uses_per_account > 0),
  starts_on date not null default current_date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists discount_codes_plan_tier_idx
  on nck.discount_codes (plan_tier);

create table if not exists nck.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_code_id uuid not null references nck.discount_codes(id) on delete cascade,
  organization_id uuid not null references nck.organizations(id) on delete cascade,
  purchase_order_id uuid references nck.purchase_orders(id) on delete set null,
  redeemed_at timestamptz not null default timezone('utc', now())
);

create index if not exists discount_redemptions_code_org_idx
  on nck.discount_redemptions (discount_code_id, organization_id);

alter table nck.purchase_orders
  alter column amount type numeric(10, 2) using amount::numeric,
  add column if not exists discount_code_id uuid,
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric(10, 2) not null default 0,
  add column if not exists original_amount numeric(10, 2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_orders_discount_code_id_fkey'
      and conrelid = 'nck.purchase_orders'::regclass
  ) then
    alter table nck.purchase_orders
      add constraint purchase_orders_discount_code_id_fkey
      foreign key (discount_code_id)
      references nck.discount_codes(id)
      on delete set null;
  end if;
end $$;
