alter table nck.help_faq_sections
  add column if not exists visible_to_account_holders boolean not null default true,
  add column if not exists visible_to_team_members boolean not null default true;

update nck.help_faq_sections
set
  visible_to_account_holders = coalesce(visible_to_account_holders, true),
  visible_to_team_members = coalesce(visible_to_team_members, true);

select pg_notify('pgrst', 'reload schema');
