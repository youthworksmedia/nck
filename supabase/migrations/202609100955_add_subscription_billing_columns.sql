alter table public.subscriptions
  add column if not exists currency text not null default 'aud',
  add column if not exists stripe_price_id text;

notify pgrst, 'reload schema';
