# Publicar no GitHub / Vercel (1 passo no browser)

O agente já tem **3 commits prontos** no teu Mac, mas o `git push` só funciona depois de ligares o GitHub **uma vez** (sem terminal).

## Opção A — Recomendada (30 segundos, só browser)

1. Abre: **https://github.com/PedroSousa008/coachbuilder/settings/keys/new**
2. **Title:** `Cursor Deploy`
3. **Key:** copia o conteúdo de `docs/coachbuilder-deploy-key.pub` (ficheiro neste repo)
4. Marca **Allow write access**
5. Clica **Add key**
6. Volta ao Cursor e escreve no chat: **«chave GitHub adicionada»**

O agente faz o `git push` e a Vercel faz deploy sozinha.

## Opção B — Sem terminal, só Cursor (se tiveres GitHub ligado)

1. Barra lateral → ícone **Source Control** (ramo)
2. Confirma que aparecem commits por enviar
3. Clica **Sync / Push** (seta para cima)
4. Se pedir login → **Sign in with GitHub**

## Opção C — Ligar GitHub ao Cursor (para o agente voltar a fazer push)

1. **Cursor → Settings → Account / General**
2. **Sign in to GitHub** (ou reconnect)
3. Diz no chat: **«GitHub ligado»**

---

Depois do push, confirma em: https://github.com/PedroSousa008/coachbuilder/commits/main  
O último commit deve ser `fd7efb3` ou mais recente.
