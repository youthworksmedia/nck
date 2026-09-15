create schema if not exists nck;

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

alter table nck.page_performance_logs enable row level security;
