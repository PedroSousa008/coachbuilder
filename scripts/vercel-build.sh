#!/usr/bin/env bash
# Vercel Postgres expõe POSTGRES_PRISMA_URL / POSTGRES_URL; o Prisma usa DATABASE_URL.
set -euo pipefail
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -n "${POSTGRES_PRISMA_URL:-}" ]]; then
    export DATABASE_URL="$POSTGRES_PRISMA_URL"
  elif [[ -n "${POSTGRES_URL:-}" ]]; then
    export DATABASE_URL="$POSTGRES_URL"
  elif [[ -n "${STORAGE_URL:-}" ]]; then
    export DATABASE_URL="$STORAGE_URL"
  fi
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Erro: define DATABASE_URL nas Environment Variables da Vercel,"
  echo "ou liga Neon/Postgres (POSTGRES_PRISMA_URL, POSTGRES_URL ou STORAGE_URL)."
  exit 1
fi

# Migrações via URL do pooler da Neon costumam falhar com P1002 (timeout no advisory lock).
# Na Vercel: adiciona DIRECT_URL = connection string "Direct" do dashboard Neon (host sem "-pooler").
POOLED_DATABASE_URL="$DATABASE_URL"
if [[ -n "${DIRECT_URL:-}" ]]; then
  export DATABASE_URL="$DIRECT_URL"
elif [[ "$POOLED_DATABASE_URL" == *"-pooler."* ]]; then
  echo "Erro: DATABASE_URL usa o pooler da Neon. Define DIRECT_URL nas Environment Variables da Vercel"
  echo "       (Neon → Connection details → copia a string 'Direct', sem -pooler no hostname)."
  exit 1
fi

migrate_with_retries() {
  local max=4
  local wait=8
  local i=1
  while [[ "$i" -le "$max" ]]; do
    if npx prisma migrate deploy; then
      return 0
    fi
    echo "prisma migrate deploy falhou (tentativa $i/$max). Nova tentativa em ${wait}s…"
    if [[ "$i" -eq "$max" ]]; then
      return 1
    fi
    sleep "$wait"
    i=$((i + 1))
  done
}

migrate_with_retries

export DATABASE_URL="$POOLED_DATABASE_URL"

npx prisma generate
npx prisma db seed
exec npx next build
