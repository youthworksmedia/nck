insert into public.help_faq_items (
  id,
  section_id,
  question,
  answer_html,
  display_order,
  published
)
values (
  '00000000-0000-4000-8000-000000000407',
  '00000000-0000-4000-8000-000000000303',
  'What does copyrights mean?',
  '<p>Copyright explains who owns the lesson materials, artwork, downloads, and other resources on New Creation Kids. For now, please treat this as a placeholder support note: your subscription allows your church team to use the resources for ministry, while the original content remains owned by Youthworks.</p>',
  3,
  true
)
on conflict (id) do update
set
  section_id = excluded.section_id,
  question = excluded.question,
  answer_html = excluded.answer_html,
  display_order = excluded.display_order,
  published = excluded.published,
  updated_at = timezone('utc', now());
