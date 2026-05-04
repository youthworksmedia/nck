# God is Good Kids

Next.js 15 + Supabase starter for a modern annual content membership product:

- Landing page with pricing, samples, and direct checkout entry points
- Annual subscription with three price tiers and identical functionality
- Secure login for owners and invited team members
- Shared content library with downloadable resources
- Unlimited team invites tied to the owner account's active subscription

## Stack

- Next.js App Router
- Supabase Auth + Postgres + RLS
- Stripe Checkout for subscription billing
- Capacitor Android shell for the Mollersphere weather app

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase project URL and anon key.
3. Add a service role key if you plan to run admin-side sync tasks.
4. Add `WEATHER_CONTACT_EMAIL` for YR.no requests and `WEATHER_CRON_SECRET` for scheduled logging.
5. Add Stripe secret key plus the three annual price IDs.
6. Run the SQL in [supabase/schema.sql](/Users/robert/Documents/Playground 2/mollersphere/supabase/schema.sql) and [supabase/weather_app.sql](/Users/robert/Documents/Playground 2/mollersphere/supabase/weather_app.sql).
7. Install dependencies with `npm install`.
8. Start the app with `npm run dev`.

## Android weather app

The weather app now has a Capacitor Android project in [android/](/Users/robert/Documents/Playground 2/mollersphere/android) plus weather routes under [src/app/weather](/Users/robert/Documents/Playground 2/mollersphere/src/app/weather).

For local emulator development:

1. Install Java 17 and the Android SDK/Android Studio.
2. Run `npm run dev`.
3. Run `npm run cap:sync:dev`.
4. Open Android Studio with `npm run cap:open`.
5. Start an emulator and run the `app` target.

Notes:

- `cap:sync:dev` points the Android WebView at `http://10.0.2.2:3000/weather`, which is the Android emulator alias for your host machine.
- Device geolocation and settings persistence use Capacitor plugins with web fallbacks.
- Cleartext localhost traffic is enabled for emulator development via [android/app/src/main/res/xml/network_security_config.xml](/Users/robert/Documents/Playground 2/mollersphere/android/app/src/main/res/xml/network_security_config.xml).

## Scheduled weather logging

- Edge functions live in [supabase/functions/log-forecasts/index.ts](/Users/robert/Documents/Playground 2/mollersphere/supabase/functions/log-forecasts/index.ts) and [supabase/functions/log-observations/index.ts](/Users/robert/Documents/Playground 2/mollersphere/supabase/functions/log-observations/index.ts).
- Function config is in [supabase/config.toml](/Users/robert/Documents/Playground 2/mollersphere/supabase/config.toml).
- Cron SQL is in [supabase/weather_cron.sql](/Users/robert/Documents/Playground 2/mollersphere/supabase/weather_cron.sql).
- The cron SQL template uses Vault-backed secrets for the Supabase project URL and service role key.

## Data model

- `organizations`: one customer account workspace
- `organization_members`: owner and invited team members
- `subscriptions`: one annual Stripe-backed membership per organization
- `resources`: downloadable member-only assets
- `resource_downloads`: optional tracking for downloads

## Expected integration work

- Add Stripe webhooks to create/update `subscriptions` after checkout events
- Send branded invitation emails after inserts into `organization_members`
- Replace demo fallbacks with your real organization bootstrap flow after first purchase
