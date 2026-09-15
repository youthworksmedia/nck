alter table nck.curriculum_unit_graphics
  add column if not exists include_copyright boolean not null default false;
