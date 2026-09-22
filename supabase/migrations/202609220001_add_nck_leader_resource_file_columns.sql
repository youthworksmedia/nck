alter table nck.leader_resource_items
  add column if not exists file_path text,
  add column if not exists file_name text;
