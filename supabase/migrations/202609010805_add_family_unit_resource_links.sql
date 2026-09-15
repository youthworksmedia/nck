alter table public.family_resource_terms
  add column if not exists reading_guide_url text,
  add column if not exists reading_guide_canva_url text,
  add column if not exists parent_devotion_url text,
  add column if not exists parent_devotion_canva_url text;
