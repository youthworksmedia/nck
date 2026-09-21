alter table nck.discount_codes
  add column if not exists plan_tiers jsonb not null default '[]'::jsonb;

update nck.discount_codes
set plan_tiers = jsonb_build_array(plan_tier::text)
where plan_tiers = '[]'::jsonb;
