#!/usr/bin/env bash
# Vercel Postgres expõe POSTGRES_PRISMA_URL / POSTGRES_URL; o Prisma usa DATABASE_URL.
set -euo pipefail
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -n "${POSTGRES_PRISMA_URL:-}" ]]; then
    export DATABASE_URL="$POSTGRES_PRISMA_URL"
  elif [[ -n "${POSTGRES_URL:-}" ]]; then
    export DATABASE_URL="$POSTGRES_URL"
  fi
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Erro: define DATABASE_URL nas Environment Variables da Vercel,"
  echo "ou liga Vercel Postgres ao projeto (gera POSTGRES_PRISMA_URL)."
  exit 1
fi

npx prisma migrate deploy
npx prisma generate
npx prisma db seed
exec npx next build
