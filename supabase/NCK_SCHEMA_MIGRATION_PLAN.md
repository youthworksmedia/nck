# NCK Supabase Schema Isolation Plan

## Audit Summary

All application-owned database objects in this repository are treated as New Creation Kids objects and should live in the `nck` schema. Supabase-managed schemas and infrastructure remain untouched.

NCK enum types:

- `subscription_status`
- `plan_tier`
- `organization_role`
- `admin_role`

NCK application tables:

- Account, membership, billing: `organizations`, `organization_members`, `subscriptions`, `purchase_orders`, `products`, `subscription_email_events`
- Admin/profile/access: `admin_roles`, `users`
- Curriculum and resources: `resource_categories`, `resources`, `resource_downloads`, `lesson_plans`, `curriculum_term_notes`, `curriculum_settings`, `email_templates`
- Family resources: `family_resource_cards`, `family_resource_lessons`, `family_resource_terms`
- Leader resources: `leader_resource_sections`, `leader_resource_items`, `ministry_leader_resource_sections`, `ministry_leader_resource_items`
- Help and unit overview content: `help_faq_sections`, `help_faq_items`, `curriculum_unit_overviews`, `curriculum_unit_graphics`
- Weather feature data: `locations`, `forecasts`, `observations`, `accuracy_scores`
- Telemetry: `page_performance_logs`

NCK database functions:

- `is_active_member(uuid)`
- `build_curriculum_lesson_content(text, text)`, when present

NCK storage:

- Existing generic bucket: `resource-files`
- New NCK-specific bucket name: `nck-resource-files`

Edge Functions and cron:

- `log-forecasts` and `log-observations` call the Next.js API routes.
- `weather_cron.sql` schedules those Edge Functions through `pg_cron`, `pg_net`, and Vault. These Supabase-managed schemas remain in place.

No repository-defined views or triggers were found.

## Migration Plan

1. Add the PostgreSQL schema `nck`.
2. Move existing NCK enum types from `public` to `nck`.
3. Move existing NCK application tables from `public` to `nck` using `ALTER ... SET SCHEMA`, preserving data, indexes, constraints, and foreign keys.
4. Move the curriculum helper function when it exists.
5. Recreate `nck.is_active_member(uuid)` with schema-qualified `nck` references.
6. Recreate RLS policies against `nck` tables.
7. Keep Supabase-managed `storage` schema metadata out of the database migration. Use the Supabase Storage API/dashboard for any bucket migration from `resource-files` to `nck-resource-files`.
8. Grant `anon`, `authenticated`, and `service_role` access to the exposed `nck` schema while relying on RLS policies for row access.
9. Configure Supabase Data API exposed schemas to include `nck`.
10. Update application Supabase clients to default database queries to `nck`.

## RLS Review Notes

- Existing member/owner checks were preserved and rewritten to reference `nck.organization_members` and `nck.subscriptions`.
- Weather service-role policies were rewritten to use `TO service_role` instead of `auth.role()`.
- Lesson-plan update/delete policies now also require active membership for the target organization.
- No anonymous read policies were added.

## Deployment Checklist

- Back up the database before applying the migration.
- In Supabase Dashboard, add `nck` to Project Settings > Data API > Exposed schemas.
- Apply migrations with Supabase CLI after reviewing `supabase/migrations/20260914064313_isolate_nck_schema.sql`.
- Confirm `public` no longer contains NCK application tables.
- Confirm `nck` contains the moved NCK tables, enum types, functions, indexes, constraints, and policies.
- Confirm Storage contains either the legacy `resource-files` bucket or the preferred `nck-resource-files` bucket. Migrate objects through the Storage API before switching `SUPABASE_RESOURCE_BUCKET` permanently.
- Run authentication, checkout/account creation, invite/member management, admin CRUD, resource downloads/uploads, lesson-plan CRUD, weather favorites/logging, and subscription email cron checks.
- Run Supabase advisors after migration and address any new findings.
