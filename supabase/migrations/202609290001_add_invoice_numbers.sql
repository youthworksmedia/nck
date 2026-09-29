alter table nck.purchase_orders
  add column if not exists invoice_number text;

create table if not exists nck.invoice_counters (
  plan_tier nck.plan_tier primary key,
  next_number integer not null default 1 check (next_number > 0)
);

with numbered_orders as (
  select
    id,
    'nck-' || lower(plan_tier::text) || '-' || lpad(
      row_number() over (partition by plan_tier order by created_at, id)::text,
      5,
      '0'
    ) as generated_invoice_number
  from nck.purchase_orders
  where invoice_number is null
)
update nck.purchase_orders purchase_order
set invoice_number = numbered_orders.generated_invoice_number
from numbered_orders
where purchase_order.id = numbered_orders.id;

alter table nck.purchase_orders
  alter column invoice_number set not null;

create unique index if not exists purchase_orders_invoice_number_key
  on nck.purchase_orders(invoice_number);

insert into nck.invoice_counters (plan_tier, next_number)
select
  plan_tier,
  coalesce(max(substring(invoice_number from '-([0-9]+)$')::integer), 0) + 1
from nck.purchase_orders
group by plan_tier
on conflict (plan_tier) do update
set next_number = greatest(nck.invoice_counters.next_number, excluded.next_number);

create or replace function nck.assign_purchase_order_invoice_number()
returns trigger
language plpgsql
set search_path = nck, public
as $$
declare
  assigned_sequence integer;
begin
  if new.invoice_number is not null and btrim(new.invoice_number) <> '' then
    new.invoice_number := lower(new.invoice_number);
    return new;
  end if;

  insert into nck.invoice_counters (plan_tier, next_number)
  values (new.plan_tier, 2)
  on conflict (plan_tier) do update
  set next_number = nck.invoice_counters.next_number + 1
  returning next_number - 1 into assigned_sequence;

  new.invoice_number := 'nck-' || lower(new.plan_tier::text) || '-' || lpad(assigned_sequence::text, 5, '0');

  return new;
end;
$$;

drop trigger if exists assign_purchase_order_invoice_number on nck.purchase_orders;

create trigger assign_purchase_order_invoice_number
before insert on nck.purchase_orders
for each row
execute function nck.assign_purchase_order_invoice_number();
