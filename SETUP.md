# SETUP — Sistema Fênix (3 apps)

> Guia pra rodar o sistema inteiro numa máquina nova. Espelhado nos 3 repositórios — mantenha sincronizado se editar.

## Visão geral

Três apps **Next.js 16** independentes (cada um com seu repo no GitHub e seu projeto no Vercel):

| App | Repo | Produção | Package manager |
|---|---|---|---|
| CRM Comercial | `crm-comercial-fenix` | https://crm-comercial-fenix.vercel.app | **pnpm** |
| CRM Retenção | `crm-retencao-fenix` | https://crm-retencao-fenix.vercel.app | **pnpm** |
| Dashboard (gerência) | `Dashboard-fenix` | https://fenix-dashboard-murex.vercel.app | **npm** |

- **Banco:** PostgreSQL único no Supabase (`qferxnctsvkdymvgvfit`, us-west-2), com schemas `comercial`, `retencao`, `shared`, `public`. Os 3 apps apontam pro mesmo banco.
- **Auth:** NextAuth (Credentials). Login único (SSO) entre apps via "passe" pra gerência.
- **Deploy:** Vercel, **automático a cada `git push` na `main`**.

---

## Pré-requisitos

- **Node 22+** (o Vercel usa 24 — pode instalar a 24 pra bater)
- **pnpm 9+** → `npm i -g pnpm` (os CRMs usam pnpm)
- **Vercel CLI** → `npm i -g vercel` (pra puxar os `.env` e gerenciar deploy/env)
- **git**

---

## 1. Clonar os 3 repos

```bash
git clone https://github.com/WillianPoeraridev/crm-comercial-fenix.git
git clone https://github.com/WillianPoeraridev/crm-retencao-fenix.git
git clone https://github.com/WillianPoeraridev/Dashboard-fenix.git
```

## 2. Configurar os `.env`  ⚠️ (puxar do Vercel)

Os `.env` **não** estão no git (têm segredos) e **não devem ser copiados de outra máquina** (podem estar incompletos). Puxe do Vercel, que tem o conjunto completo:

```bash
vercel login
# dentro de CADA projeto:
vercel link                                     # selecione o projeto Fênix correspondente
vercel env pull .env --environment=production   # recria o .env completo
```

Variáveis esperadas por app (o `env pull` traz todas — lista só pra conferência):

- **Comercial / Retenção:** `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SSO_SECRET`, `NEXT_PUBLIC_DASHBOARD_URL`, e a URL do outro CRM (`NEXT_PUBLIC_CRM_RETENCAO_URL` / `NEXT_PUBLIC_CRM_COMERCIAL_URL`). Retenção tem ainda `SEED_ADMIN_PASSWORD` / `SEED_ATENDENTE_PASSWORD`.
- **Dashboard:** `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `SSO_SECRET`, `SEED_GERENTE_PASSWORD`.

> Pra **testar login localmente**, troque `NEXTAUTH_URL` no `.env` pra `http://localhost:<porta>` (a porta em que cada app roda — veja abaixo). Sem isso o callback do NextAuth falha em dev.

## 3. Instalar dependências

```bash
# nos CRMs:
pnpm install
# no Dashboard:
npm install
```
O Prisma Client é gerado automaticamente (postinstall / build).

## 4. Rodar local (portas diferentes pra não colidir)

```bash
# crm-comercial-fenix
pnpm dev                 # http://localhost:3000

# crm-retencao-fenix
pnpm dev -- -p 3001      # http://localhost:3001

# Dashboard-fenix
npm run dev -- -p 3002   # http://localhost:3002
```

## 5. Deploy

Todos os 3 têm **auto-deploy**: `git push` na `main` → o Vercel builda e publica sozinho. Não precisa de `vercel --prod` manual.

Pra **mexer em variável de ambiente** no Vercel, use o painel (Settings → Environment Variables) ou a API. ⚠️ No Windows, `vercel env add` engole o valor do stdin — prefira o painel ou a API REST.

---

## Arquitetura (resumo)

- **Realtime:** tabela de eventos em `shared` (`ComercialEvent`, `SolicitacaoRetencaoEvent`) alimentada por trigger; o frontend assina `postgres_changes` **sem filtro** e dá `router.refresh()`. RLS com policy `for select using(true)` (role `public`). Runbook: `docs/RUNBOOK-REALTIME-COMERCIAL.md`.
- **SSO (gerência):** "passe" HMAC curto (`SSO_SECRET` compartilhado). `lib/sso.ts` + `/api/sso/start` (gera) + `/api/sso/enter` (consome e cria sessão). Botões nos navbars.
- **Transbordo:** card no Comercial = vendas pendentes de instalação de competências anteriores (`lib/comercial.ts` → `getTransbordo`).

## ⚠️ Gotchas importantes

1. **O banco é o de PRODUÇÃO.** Rodar local conecta nos dados reais — cuidado com testes destrutivos. (Ideal futuro: um banco de dev separado.)
2. **Dashboard tem "shadow models"** (subconjuntos das tabelas reais dos CRMs). **NUNCA** rode `prisma db push` no Dashboard — destruiria as tabelas reais. Campos enum devem ser declarados como enum (senão Prisma falha com P2032 na leitura).
3. **Lockfiles:** os CRMs têm `pnpm-lock.yaml` E `package-lock.json` — use **pnpm**. O Dashboard usa **npm**. Não misture.
4. **Migrations do realtime/RLS** foram feitas direto no Supabase (não versionadas em migration). Se recriar o banco, reaplicar via runbook.

## Acessos

- **Marcelo (gerência):** `marcelo@fenixfibra.com.br` — existe nos 3 apps (GERENTE no Dashboard, ADMIN nos CRMs), mesma senha (`SEED_GERENTE_PASSWORD`). Pode logar direto em qualquer um ou usar o SSO.
