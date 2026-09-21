create extension if not exists "pgcrypto";

create schema if not exists nck;
comment on schema nck is 'New Creation Kids application data and database objects.';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'subscription_status'
      and typnamespace = 'nck'::regnamespace
  ) then
    create type nck.subscription_status as enum (
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
      and typnamespace = 'nck'::regnamespace
  ) then
    create type nck.plan_tier as enum ('essential', 'growth', 'scale');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'organization_role'
      and typnamespace = 'nck'::regnamespace
  ) then
    create type nck.organization_role as enum ('owner', 'member');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'admin_role'
      and typnamespace = 'nck'::regnamespace
  ) then
    create type nck.admin_role as enum ('super_admin');
  end if;
end $$;

create table if not exists nck.organizations (
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

alter table nck.organizations
  add column if not exists account_holder_name text;
alter table nck.organizations
  add column if not exists church_name text;
alter table nck.organizations
  add column if not exists billing_address_line1 text;
alter table nck.organizations
  add column if not exists billing_suburb text;
alter table nck.organizations
  add column if not exists billing_state text;
alter table nck.organizations
  add column if not exists billing_postcode text;
alter table nck.organizations
  add column if not exists billing_country text;
alter table nck.organizations
  add column if not exists billing_phone text;

create table if not exists nck.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references nck.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text,
  invitation_email text,
  role nck.organization_role not null default 'member',
  joined_at date not null default current_date,
  created_at timestamptz not null default timezone('utc', now()),
  constraint organization_member_identity_check
    check (user_id is not null or invitation_email is not null)
);

alter table nck.organization_members
  add column if not exists display_name text;

create unique index if not exists organization_members_user_unique
  on nck.organization_members (organization_id, user_id)
  where user_id is not null;

create unique index if not exists organization_members_invitation_unique
  on nck.organization_members (organization_id, invitation_email)
  where invitation_email is not null;

create index if not exists organization_members_user_lookup_idx
  on nck.organization_members (user_id)
  where user_id is not null;

create index if not exists organization_members_invitation_lookup_idx
  on nck.organization_members (invitation_email)
  where invitation_email is not null;

create table if not exists nck.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references nck.organizations(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  currency text not null default 'aud',
  tier nck.plan_tier not null,
  status nck.subscription_status not null default 'inactive',
  started_at date not null default current_date,
  current_period_end date not null default (current_date + interval '1 year'),
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table nck.subscriptions
  add column if not exists stripe_price_id text,
  add column if not exists currency text not null default 'aud';

create table if not exists nck.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references nck.organizations(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique,
  account_holder_name text not null,
  account_holder_email text not null,
  church_name text not null,
  plan_tier nck.plan_tier not null,
  amount numeric(10, 2) not null,
  currency text not null default 'aud',
  discount_code_id uuid,
  discount_code text,
  discount_amount numeric(10, 2) not null default 0,
  original_amount numeric(10, 2),
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

alter table nck.purchase_orders
  alter column currency set default 'aud';

alter table nck.purchase_orders
  alter column amount type numeric(10, 2) using amount::numeric;

alter table nck.purchase_orders
  add column if not exists discount_code_id uuid,
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric(10, 2) not null default 0,
  add column if not exists original_amount numeric(10, 2);

create table if not exists nck.products (
  id uuid primary key default gen_random_uuid(),
  plan_tier nck.plan_tier not null unique,
  title text not null,
  product_type text not null,
  summary_html text not null,
  prices jsonb not null default '{"AUD": 0}'::jsonb,
  default_currency text not null default 'AUD',
  stripe_price_ids jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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

insert into nck.products (
  plan_tier,
  title,
  product_type,
  summary_html,
  prices,
  default_currency,
  display_order
)
values
  (
    'essential',
    'Small',
    '1-15 students',
    '<p>A great fit for smaller ministries with full curriculum access and unlimited invited accounts.</p><ul><li>Full library of downloadable resources</li><li>Unlimited invited account access</li><li>Invoices and order history for account holders</li><li>Shared curriculum access tied to one active annual subscription</li><li>Secure login and account management</li></ul>',
    '{"AUD": 200}'::jsonb,
    'AUD',
    1
  ),
  (
    'growth',
    'Medium',
    '16-50 students',
    '<p>Made for growing ministries with full curriculum access and unlimited invited accounts.</p><ul><li>Full library of downloadable resources</li><li>Unlimited invited account access</li><li>Invoices and order history for account holders</li><li>Shared curriculum access tied to one active annual subscription</li><li>Secure login and account management</li></ul>',
    '{"AUD": 300}'::jsonb,
    'AUD',
    2
  ),
  (
    'scale',
    'Large',
    '51+ students',
    '<p>For larger ministries with full curriculum access and unlimited invited accounts.</p><ul><li>Full library of downloadable resources</li><li>Unlimited invited account access</li><li>Invoices and order history for account holders</li><li>Shared curriculum access tied to one active annual subscription</li><li>Secure login and account management</li></ul>',
    '{"AUD": 500}'::jsonb,
    'AUD',
    3
  )
on conflict (plan_tier) do update
set
  title = excluded.title,
  product_type = excluded.product_type,
  summary_html = excluded.summary_html,
  prices = nck.products.prices || excluded.prices,
  default_currency = excluded.default_currency,
  display_order = excluded.display_order,
  updated_at = timezone('utc', now());

create table if not exists nck.resource_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  lesson_number integer not null default 1,
  scripture text not null default '',
  category_id uuid references nck.resource_categories(id) on delete set null,
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

alter table nck.resources
  add column if not exists category_id uuid references nck.resource_categories(id) on delete set null;
alter table nck.resources
  add column if not exists lesson_number integer not null default 1;
alter table nck.resources
  add column if not exists scripture text not null default '';
alter table nck.resources
  add column if not exists year_cycle text not null default 'Year A';
alter table nck.resources
  add column if not exists term text not null default 'Term 1';
alter table nck.resources
  add column if not exists music_file_path text;
alter table nck.resources
  add column if not exists music_file_name text;
alter table nck.resources
  add column if not exists worksheet_file_path text;
alter table nck.resources
  add column if not exists worksheet_file_name text;
alter table nck.resources
  add column if not exists manual_file_path text;
alter table nck.resources
  add column if not exists manual_file_name text;
alter table nck.resources
  add column if not exists publish_date date not null default current_date;
alter table nck.resources
  add column if not exists expiry_date date;

create table if not exists nck.resource_downloads (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references nck.resources(id) on delete cascade,
  organization_id uuid not null references nck.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  downloaded_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.subscription_email_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  subscription_id uuid references nck.subscriptions(id) on delete cascade,
  organization_id uuid references nck.organizations(id) on delete cascade,
  event_type text not null,
  recipient_email text not null,
  status text not null default 'sent',
  message text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role nck.admin_role not null default 'super_admin',
  created_at timestamptz not null default timezone('utc', now())
);

alter table nck.admin_roles
  add column if not exists display_name text;

create table if not exists nck.page_performance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  event_type text not null check (event_type in ('initial_load', 'client_navigation')),
  source_path text,
  target_path text,
  final_path text not null,
  duration_ms integer,
  ttfb_ms integer,
  dom_complete_ms integer,
  window_loaded_ms integer,
  viewport_width integer,
  viewport_height integer,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists page_performance_logs_created_at_idx
  on nck.page_performance_logs (created_at desc);

create index if not exists page_performance_logs_final_path_idx
  on nck.page_performance_logs (final_path);

create table if not exists nck.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references nck.organizations(id) on delete cascade,
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

create table if not exists nck.email_templates (
  template_key text primary key,
  subject text not null,
  body text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.curriculum_term_notes (
  id uuid primary key default gen_random_uuid(),
  year_cycle text not null,
  term text not null,
  content text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  unique (year_cycle, term)
);

create table if not exists nck.curriculum_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

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

create table if not exists nck.ministry_leader_resource_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  display_order integer not null default 0,
  published boolean not null default true,
  visible_to_account_holders boolean not null default true,
  visible_to_team_members boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.ministry_leader_resource_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references nck.ministry_leader_resource_sections(id) on delete cascade,
  title text not null,
  description text not null default '',
  icon text not null default 'file',
  resource_type text not null default 'pdf',
  action_label text not null default '',
  file_path text,
  file_name text,
  url text,
  duration text,
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.help_faq_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.help_faq_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references nck.help_faq_sections(id) on delete cascade,
  question text not null,
  answer_html text not null default '',
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.leader_resource_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists nck.leader_resource_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references nck.leader_resource_sections(id) on delete cascade,
  title text not null,
  description text not null default '',
  eyebrow text not null default '',
  duration text,
  resource_type text not null default 'video',
  url text,
  file_path text,
  file_name text,
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into nck.ministry_leader_resource_sections (id, title, description, display_order, published)
values
  ('00000000-0000-4000-8000-000000000101', 'Planning', 'Tools to map your ministry year', 1, true),
  ('00000000-0000-4000-8000-000000000102', 'Promotion', 'Videos and assets to share the curriculum with your church', 2, true),
  ('00000000-0000-4000-8000-000000000103', 'Coming soon', 'More leader resources in development', 3, true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

insert into nck.help_faq_sections (id, title, description, display_order, published, visible_to_account_holders, visible_to_team_members)
values
  ('00000000-0000-4000-8000-000000000301', 'Class room', 'Questions about running lessons with children and leaders.', 1, true, true, true),
  ('00000000-0000-4000-8000-000000000302', 'Preparation', 'Planning, printing, and leader preparation guidance.', 2, true, true, true),
  ('00000000-0000-4000-8000-000000000303', 'Technical', 'Account, login, download, and browser support.', 3, true, true, true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  display_order = excluded.display_order,
  published = excluded.published,
  visible_to_account_holders = excluded.visible_to_account_holders,
  visible_to_team_members = excluded.visible_to_team_members,
  updated_at = timezone('utc', now());

insert into nck.help_faq_items (
  id,
  section_id,
  question,
  answer_html,
  display_order,
  published
)
values
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000301', 'How should I adapt a lesson for a mixed-age group?', '<p>Start with the main Bible idea, then choose one activity that younger children can enter easily and one discussion question that gives older children room to go deeper.</p>', 1, true),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000301', 'Can team members download resources during the week?', '<p>Yes. Invited team members with an active account can access the teaching library and download the resources they need for preparation.</p>', 2, true),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000302', 'How far ahead should leaders prepare?', '<p>We recommend downloading the lesson at least one week ahead so leaders have time to read the passage, gather materials, and pray through the session.</p>', 1, true),
  ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000302', 'What should be printed for Sunday?', '<p>Print the leader guide for each teacher and enough activity sheets for the children in your group. Keep a spare copy for new leaders or unexpected helpers.</p>', 2, true),
  ('00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000303', 'What should I do if a download does not open?', '<p>Try downloading again in a current browser. If the file still will not open, ask your account holder to check that the subscription is active and contact support with the lesson title.</p>', 1, true),
  ('00000000-0000-4000-8000-000000000406', '00000000-0000-4000-8000-000000000303', 'How does an invited member reset their password?', '<p>Use the missing password link on the login page. Account holders can also reset team member passwords from the Team page.</p>', 2, true),
  ('00000000-0000-4000-8000-000000000407', '00000000-0000-4000-8000-000000000303', 'What does copyrights mean?', '<p>Copyright explains who owns the lesson materials, artwork, downloads, and other resources on New Creation Kids. For now, please treat this as a placeholder support note: your subscription allows your church team to use the resources for ministry, while the original content remains owned by Youthworks.</p>', 3, true)
on conflict (id) do update
set
  question = excluded.question,
  answer_html = excluded.answer_html,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

insert into nck.leader_resource_sections (id, title, description, display_order, published)
values
  ('00000000-0000-4000-8000-000000000501', 'Video Training', '', 1, true),
  ('00000000-0000-4000-8000-000000000502', 'Tools', '', 2, true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

insert into nck.leader_resource_items (
  id,
  section_id,
  title,
  description,
  eyebrow,
  duration,
  resource_type,
  url,
  display_order,
  published
)
values
  ('00000000-0000-4000-8000-000000000601', '00000000-0000-4000-8000-000000000501', 'Adapting the curriculum', 'How to flex the lessons for your group''s age range, attention span, and church context.', 'Video', '12 min', 'video', null, 1, true),
  ('00000000-0000-4000-8000-000000000602', '00000000-0000-4000-8000-000000000501', 'More videos coming', 'New training content added each term.', '', null, 'coming_soon', null, 2, true),
  ('00000000-0000-4000-8000-000000000603', '00000000-0000-4000-8000-000000000502', 'Games Library', 'Recommended games by age group, with full instructions.', 'Tool', null, 'tool', '/leaders/games', 1, true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  eyebrow = excluded.eyebrow,
  duration = excluded.duration,
  resource_type = excluded.resource_type,
  url = excluded.url,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

insert into nck.ministry_leader_resource_items (
  id,
  section_id,
  title,
  description,
  icon,
  resource_type,
  action_label,
  duration,
  display_order,
  published
)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'Annual Planner 2027', 'Map all 4 terms onto your church calendar', 'calendar', 'pdf', 'PDF', null, 1, true),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'Ministry Budget Template', 'Plan curriculum, events and supplies', 'spreadsheet', 'xlsx', 'XLSX', null, 2, true),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102', '30-second Promo Video', 'For Sunday service screens - 1920x1080 MP4', 'play', 'video', 'Watch', '0:30', 1, true),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000102', '90-second Vision Video', 'For parent meetings - with subtitles', 'play', 'video', 'Watch', '1:30', 2, true),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000102', 'Social Media Pack', 'Instagram squares, story templates, posters', 'palette', 'zip', 'ZIP', null, 3, true),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000103', 'Volunteer Recruitment Pack', 'In development', 'people', 'coming_soon', 'Coming soon', null, 1, true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  resource_type = excluded.resource_type,
  action_label = excluded.action_label,
  duration = excluded.duration,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());

alter table nck.organizations enable row level security;
alter table nck.organization_members enable row level security;
alter table nck.subscriptions enable row level security;
alter table nck.purchase_orders enable row level security;
alter table nck.resources enable row level security;
alter table nck.resource_downloads enable row level security;
alter table nck.subscription_email_events enable row level security;
alter table nck.admin_roles enable row level security;
alter table nck.page_performance_logs enable row level security;
alter table nck.resource_categories enable row level security;
alter table nck.lesson_plans enable row level security;
alter table nck.curriculum_term_notes enable row level security;
alter table nck.curriculum_settings enable row level security;
alter table nck.dashboard_user_state enable row level security;
alter table nck.ministry_leader_resource_sections enable row level security;
alter table nck.ministry_leader_resource_items enable row level security;
alter table nck.help_faq_sections enable row level security;
alter table nck.help_faq_items enable row level security;
alter table nck.leader_resource_sections enable row level security;
alter table nck.leader_resource_items enable row level security;

alter table nck.lesson_plans
  add column if not exists organization_id uuid references nck.organizations(id) on delete cascade;
alter table nck.lesson_plans
  add column if not exists created_by_email text;
alter table nck.lesson_plans
  add column if not exists is_shared boolean not null default false;

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
drop policy if exists "members can read own dashboard state" on nck.dashboard_user_state;
drop policy if exists "members can update own dashboard state" on nck.dashboard_user_state;

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

create policy "members can read own organization"
on nck.organizations
for select
using (nck.is_active_member(id));

create policy "admins can read their own admin role"
on nck.admin_roles
for select
using (user_id = auth.uid());

create policy "active members can read categories"
on nck.resource_categories
for select
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
using (nck.is_active_member(organization_id));

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

create policy "members can read active subscription"
on nck.subscriptions
for select
using (nck.is_active_member(organization_id));

create policy "active members can read resources"
on nck.resources
for select
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
with check (nck.is_active_member(organization_id));

create policy "members can read own dashboard state"
on nck.dashboard_user_state
for select
using (user_id = auth.uid() and nck.is_active_member(organization_id));

create policy "members can update own dashboard state"
on nck.dashboard_user_state
for all
using (user_id = auth.uid() and nck.is_active_member(organization_id))
with check (user_id = auth.uid() and nck.is_active_member(organization_id));

create policy "team members can read shared or own lesson plans"
on nck.lesson_plans
for select
using (
  nck.is_active_member(organization_id)
  and (is_shared = true or user_id = auth.uid())
);

create policy "team members can create their own lesson plans"
on nck.lesson_plans
for insert
with check (
  user_id = auth.uid()
  and nck.is_active_member(organization_id)
);

create policy "team members can update their own lesson plans"
on nck.lesson_plans
for update
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
using (
  user_id = auth.uid()
  and nck.is_active_member(organization_id)
);

insert into nck.resource_categories (name)
values
  ('Templates'),
  ('Marketing'),
  ('Analytics')
on conflict do nothing;

update nck.resources
set category_id = resource_categories.id
from nck.resource_categories
where nck.resources.category_id is null
  and lower(nck.resources.category) = lower(nck.resource_categories.name);

insert into nck.resources (title, description, lesson_number, scripture, category, year_cycle, term, format, file_url)
values
  ('God Makes a Good World', 'Children discover that creation is good because God made it and loves what he has made.', 1, 'Genesis 1:1-31', 'Curriculum', 'Year A', 'Term 1', '', ''),
  ('Jesus Welcomes Children', 'A lesson about the kindness of Jesus and his welcome to children.', 2, 'Mark 10:13-16', 'Curriculum', 'Year A', 'Term 1', '', ''),
  ('The Good Shepherd', 'Children learn that Jesus knows, leads, and cares for his people.', 3, 'John 10:1-18', 'Curriculum', 'Year A', 'Term 1', '', ''),
  ('A New Heart', 'Children hear God’s promise to make his people new.', 1, 'Ezekiel 36:24-28', 'Curriculum', 'Year B', 'Term 1', '', ''),
  ('Living as God’s People', 'Children explore how faith shapes everyday life.', 1, 'Colossians 3:12-17', 'Curriculum', 'Year C', 'Term 1', '', '')
on conflict do nothing;

insert into nck.curriculum_term_notes (year_cycle, term, content)
values
  ('Year A', 'Term 1', '<h2>Term 1 Summary</h2><p>This term introduces children to the goodness of God in creation, the welcome of Jesus, and the care of the Good Shepherd.</p><h3>Description</h3><p>Use these lessons to establish core language for your group: God made us, Jesus welcomes us, and we can trust him.</p>')
on conflict (year_cycle, term) do nothing;

insert into nck.curriculum_settings (key, value)
values ('current_year_cycle', 'Year A')
on conflict (key) do nothing;

insert into nck.curriculum_settings (key, value)
values
  ('site_offline', 'false'),
  ('site_url', ''),
  ('email_sender_name', 'New Creation Kids'),
  ('email_sender_email', ''),
  ('renewal_reminder_days', '30'),
  ('cancellation_survey_url', ''),
  ('support_email', ''),
  ('homepage_testimonials', '{"testimonials":[{"quote":"New Creation Kids helped our leaders stop scrambling each week and gave us a clear Bible-shaped pathway for the year.","name":"Sarah M.","church":"Children''s Ministry Coordinator"},{"quote":"The lesson structure is easy for volunteers to follow, and the resource library makes Sunday preparation much quicker.","name":"Mark R.","church":"Senior Pastor"},{"quote":"It feels warm, thoughtful, and practical. Our team can see the curriculum plan and get what they need without chasing files.","name":"Jess T.","church":"Kids Church Team Leader"}]}')
on conflict (key) do nothing;

insert into nck.curriculum_settings (key, value)
values (
  'dashboard_welcome_settings',
  '{"firstTimeHtml":"<h2>Welcome to New Creation Kids!</h2><p>We''re glad you''re here. New Creation Kids exists for one purpose: to see children formed as disciples of Jesus. Not just taught a Bible story once a week, but discipled in a way that shapes their families, their leaders, and the church around them. Everything on this site works toward three goals: children growing as disciples, leaders equipped for the task of teaching them well, and families able to continue the conversation at home every week.</p><h2>Where to go next</h2><p><strong>Teach</strong> - weekly lesson content, activities, and leader''s notes.</p><p><strong>Leaders</strong> - training videos, tools and games library.</p><p><strong>Family</strong> - take-home resources that help parents keep discipling their kids throughout the week.</p><p>Watch the short video below to meet the team from New Creation Kids.</p>","returningHtml":"<h2>Welcome back!</h2><p>Everything you need for this week is one click away. Teach, Leaders, Family.</p>","returningHtmls":["<h2>Welcome back!</h2><p>Everything you need for this week is one click away. Teach, Leaders, Family.</p>"],"introVideoTitle":"Introduction to New Creation Kids","introVideoUrl":"","bibleVerses":[{"text":"Children are a heritage from the Lord, offspring a reward from him.","reference":"Psalm 127:3"}]}'
)
on conflict (key) do nothing;
