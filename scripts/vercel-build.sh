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

# Migrações via pooler da Neon costumam falhar com P1002 (advisory lock). Usamos ligação direta só no migrate.
# Se DIRECT_URL existir, usa-a; senão, na Neon o host direto obtém-se ao remover "-pooler." do hostname.
POOLED_DATABASE_URL="$DATABASE_URL"
if [[ -n "${DIRECT_URL:-}" ]]; then
  MIGRATE_DATABASE_URL="$DIRECT_URL"
elif [[ "$POOLED_DATABASE_URL" == *"-pooler."* ]]; then
  MIGRATE_DATABASE_URL="${POOLED_DATABASE_URL//-pooler./.}"
  echo "migrate: URL derivada do pooler Neon (hostname sem -pooler) — ou define DIRECT_URL para forçar."
else
  MIGRATE_DATABASE_URL="$POOLED_DATABASE_URL"
fi
export DATABASE_URL="$MIGRATE_DATABASE_URL"

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

if ! migrate_with_retries; then
  echo "AVISO: prisma migrate deploy falhou após várias tentativas (DB offline/indisponível)."
  echo "AVISO: o build vai continuar para não bloquear o deploy; aplica migrações quando a base voltar."
fi

export DATABASE_URL="$POOLED_DATABASE_URL"

npx prisma generate
if ! npx prisma db seed; then
  echo "AVISO: prisma db seed falhou (possível indisponibilidade da DB)."
  echo "AVISO: o build continua sem seed para evitar falha total do deploy."
fi
exec npx next build
