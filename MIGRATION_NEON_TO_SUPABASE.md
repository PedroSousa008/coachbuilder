# Migração Neon -> Supabase (sem perder dados)

Guia para migrar a base PostgreSQL atual para Supabase mantendo a app 100% sincronizada.

## 1) Preparar a base nova

1. Criar projeto no Supabase.
2. Em `Project Settings -> Database`, copiar a connection string PostgreSQL (URI).
3. Guardar essa URI como `TARGET_DATABASE_URL`.

## 2) Tirar backup e restaurar na nova base

No teu terminal local (com `pg_dump`, `pg_restore` e `psql` instalados):

```bash
SOURCE_DATABASE_URL="postgresql://...neon..." \
TARGET_DATABASE_URL="postgresql://...supabase..." \
bash scripts/db-migrate-neon-to-supabase.sh
```

O script:
- cria dump em `.db-migration/`
- restaura no destino
- faz validação rápida de contagens das tabelas principais

## 3) Atualizar variáveis da app

### Local (.env.local)

```env
DATABASE_URL="postgresql://...supabase..."
```

### Vercel

Atualizar `DATABASE_URL` em todos os ambientes (`Production`, `Preview`, `Development`) para o URL do Supabase.

## 4) Validar antes de desligar Neon

Checklist rápida:
- login funciona
- mensagens diretas e grupos funcionam
- dados de equipa/perfil aparecem
- operações de escrita funcionam (criar/editar/remover)
- sem erros em logs de API

## 5) Rollback (se algo falhar)

Se houver problema:
1. repor `DATABASE_URL` para Neon (local + Vercel)
2. redeploy na Vercel

Não apagar Neon até validares tudo em produção.

## Notas de segurança

- Nunca commitar URLs com password.
- Guardar dumps em local seguro.
- Em produção, depois da migração, considerar:
  - backups automáticos
  - política de retenção
  - monitorização de erros e latência
