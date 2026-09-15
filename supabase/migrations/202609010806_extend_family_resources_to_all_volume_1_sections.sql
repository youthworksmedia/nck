alter table public.family_resource_lessons
  drop constraint if exists family_resource_lessons_term_check;

alter table public.family_resource_lessons
  add constraint family_resource_lessons_term_check check (term between 1 and 6);

alter table public.family_resource_terms
  drop constraint if exists family_resource_terms_term_check;

alter table public.family_resource_terms
  add constraint family_resource_terms_term_check check (term between 1 and 6);

insert into public.family_resource_terms (id, term, memory_text, memory_url, published)
values
  ('00000000-0000-4000-8000-000000000905', 5, '', null, true),
  ('00000000-0000-4000-8000-000000000906', 6, '', null, true)
on conflict (term) do nothing;
