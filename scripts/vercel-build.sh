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

is_db_connectivity_error() {
  local log="$1"
  [[ "$log" == *"Error: P1001"* ]] || [[ "$log" == *"Error: P1002"* ]] || [[ "$log" == *"Can't reach database server"* ]]
}

migrate_with_retries() {
  local max=4
  local wait=8
  local i=1
  local last_log=""
  while [[ "$i" -le "$max" ]]; do
    local out
    set +e
    out="$(npx prisma migrate deploy 2>&1)"
    local code=$?
    set -e
    printf '%s\n' "$out"
    last_log="$out"
    if [[ "$code" -eq 0 ]]; then
      return 0
    fi
    echo "prisma migrate deploy falhou (tentativa $i/$max). Nova tentativa em ${wait}s…"
    if [[ "$i" -eq "$max" ]]; then
      if is_db_connectivity_error "$last_log"; then
        echo "Aviso: base de dados indisponível durante o build (P1001/P1002)."
        echo "A continuar sem migrate/seed para não bloquear o deploy."
        return 2
      fi
      return 1
    fi
    sleep "$wait"
    i=$((i + 1))
  done
}

MIGRATE_RESULT=0
set +e
migrate_with_retries
MIGRATE_RESULT=$?
set -e

if [[ "$MIGRATE_RESULT" -eq 1 ]]; then
  echo "Erro de migração não relacionado com conectividade. A abortar build."
  exit 1
fi

export DATABASE_URL="$POOLED_DATABASE_URL"

npx prisma generate
if [[ "$MIGRATE_RESULT" -eq 2 ]]; then
  echo "Aviso: seed ignorado porque a base de dados está offline."
else
  npx prisma db seed
fi
exec npx next build
