#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: npm run deploy:production -- [optional-migration.sql]"
  echo
  echo "Runs typecheck, build, optionally applies one Supabase SQL file, then deploys Vercel production."
  exit 0
fi

migration_file="${1:-}"

npm run typecheck
npm run build

if [[ -n "$migration_file" ]]; then
  npx supabase db query --linked --file "$migration_file"
fi

npx vercel --prod --yes
