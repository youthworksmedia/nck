create index if not exists organization_members_user_lookup_idx
  on nck.organization_members (user_id)
  where user_id is not null;

create index if not exists organization_members_invitation_lookup_idx
  on nck.organization_members (invitation_email)
  where invitation_email is not null;
