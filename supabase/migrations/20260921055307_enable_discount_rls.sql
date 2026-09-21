alter table nck.discount_codes enable row level security;
alter table nck.discount_redemptions enable row level security;

revoke all on table nck.discount_codes from anon, authenticated;
revoke all on table nck.discount_redemptions from anon, authenticated;
