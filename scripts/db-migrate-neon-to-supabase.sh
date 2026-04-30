#!/usr/bin/env bash
set -euo pipefail

# Migração PostgreSQL (Neon -> Supabase, ou qualquer Postgres -> Postgres)
# Requisitos locais:
# - pg_dump
# - pg_restore
# - psql
#
# Uso:
# SOURCE_DATABASE_URL="postgresql://..." TARGET_DATABASE_URL="postgresql://..." \
#   bash scripts/db-migrate-neon-to-supabase.sh

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Erro: pg_dump não encontrado no PATH."
  exit 1
fi
if ! command -v pg_restore >/dev/null 2>&1; then
  echo "Erro: pg_restore não encontrado no PATH."
  exit 1
fi
if ! command -v psql >/dev/null 2>&1; then
  echo "Erro: psql não encontrado no PATH."
  exit 1
fi

if [[ -z "${SOURCE_DATABASE_URL:-}" ]]; then
  echo "Erro: define SOURCE_DATABASE_URL com a ligação da base origem."
  exit 1
fi
if [[ -z "${TARGET_DATABASE_URL:-}" ]]; then
  echo "Erro: define TARGET_DATABASE_URL com a ligação da base destino."
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR=".db-migration"
BACKUP_FILE="${BACKUP_DIR}/coachbrain-${STAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "1) Export da BD origem..."
pg_dump \
  --dbname="${SOURCE_DATABASE_URL}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_FILE}"

echo "Backup criado em: ${BACKUP_FILE}"

echo "2) Import para BD destino..."
pg_restore \
  --dbname="${TARGET_DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${BACKUP_FILE}"

echo "3) Verificação rápida de tabelas-chave..."
psql "${TARGET_DATABASE_URL}" -v ON_ERROR_STOP=1 <<'SQL'
\pset tuples_only on
\pset pager off
SELECT 'users=' || count(*) FROM "User";
SELECT 'workspace=' || count(*) FROM "Workspace";
SELECT 'workspace_versions=' || count(*) FROM "WorkspaceVersion";
SELECT 'dm_messages=' || count(*) FROM "DmChatMessage";
SQL

echo "Migração concluída com sucesso."
echo "Próximo passo: atualizar DATABASE_URL (local + Vercel) para a base destino."
