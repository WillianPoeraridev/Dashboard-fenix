# Relatório de Debug, Segurança e Organização — Sistema Fênix

> Sessão de pente-fino completa (autorização total do Willian).
> Escopo: os 3 apps (Comercial, Retenção, Dashboard) + auth/SSO + banco.
> Regra mantida: **nada destrutivo no banco de produção**; só corrigi e
> deployei o que é seguro; o que é arriscado/decisão sua está listado aqui.

## Resumo executivo

**Estado geral: BOM.** O sistema é bem construído — não tem nada crítico
quebrado. Pontos fortes encontrados:

- Autenticação consistente em todas as rotas de API (`getServerSession` +
  checagem de `role` + checagem de *ownership* tipo `slot.vendedorId !== session.user.id`).
- Validação de entrada com **Zod** nas fronteiras (`criarVendaSchema.parse`, etc.).
- Tratamento de erro centralizado (`apiError`), código limpo (pouquíssimo `any`/`console.log`).
- Secrets fora do git (`.env` ignorado e não trackeado nos 3).

O foco real de segurança são **3 itens** (abaixo). O resto é melhoria incremental.

---

## ✅ Já corrigido e no ar nesta sessão

1. **Security headers** nos 3 apps (`next.config.ts`): HSTS, `X-Frame-Options: DENY`
   (anti-clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
   `Permissions-Policy`. Conservador (sem CSP, que quebraria os estilos inline).
2. **`.claude/` no `.gitignore`** (Retenção) — evita commitar settings locais.

(Além de toda a migração pro domínio próprio + login central feita antes nesta sessão.)

---

## 🔴 Prioridade ALTA — precisam de decisão/ação sua

### 1. Login sem rate limiting (risco de força-bruta)
O portal `/api/portal/login` e os logins não limitam tentativas — dá pra testar
senha infinitamente. Com o portal virando a **porta única**, é o alvo nº1.

- **Por que não corrigi sozinho:** rate limit confiável em serverless precisa de
  estado compartilhado — **Upstash Redis** (recomendado, integração nativa do
  Vercel) ou uma tabela no Postgres. Os dois exigem setup/infra que é melhor
  fazer com você olhando.
- **Plano:** Upstash Ratelimit, ~10 tentativas/min por IP+email, *fail-open*
  (se o Redis cair, não trava ninguém). Tenho o código pronto. ~30 min juntos.

### 2. Visibilidade de dados entre vendedores (decisão de negócio)
`GET /api/vendas`, `/api/leads` e `/api/upgrades` retornam dados de **todos os
vendedores** pra qualquer vendedor logado. (A *criação* já força o `vendedorId`
do próprio usuário; só a *leitura* não filtra.)

- É **intencional** (quadro de vendas compartilhado do time) ou cada vendedor
  deveria ver **só o seu**? Se for pra isolar, eu adiciono o filtro por
  `vendedorId` pra não-admin (rápido e seguro). **Preciso da sua decisão.**

### 3. Força do `NEXTAUTH_SECRET` em produção
Os `.env` locais têm segredos fracos/previsíveis (ex: `fenix-comercial-secret-2026`).
Se os **mesmos** estiverem em produção, é possível forjar sessão (JWT). Não
consigo ler os de produção (vêm criptografados do Vercel).

- **Ação:** verificar/rotacionar os `NEXTAUTH_SECRET` de produção pra valores
  aleatórios fortes (32+ bytes). Rotacionar desloga todo mundo **uma vez** (fazer
  em horário de baixo uso). Posso gerar e setar via API com seu ok.

---

## 🟡 Prioridade MÉDIA

### 4. Exposição via Realtime / anon key (RLS)
O front assina mudanças com a **chave pública** (`sb_publishable_…`). As policies
de realtime são `using(true)` (qualquer um com a chave pública consegue ler os
eventos). Verificar no Supabase se os *payloads* não vazam PII de cliente
(nome/CPF). Não está no repo (RLS foi feita direto no Supabase).

### 5. Realtime de agenda/leads/banner pode não estar disparando
Essas telas assinam `schema:"public"` nas tabelas `AgendaSlot`/`LeadCarteira`,
mas elas vivem no schema **`comercial`**. Pode ser que o realtime dessas telas
nunca dispare (o de Vendas/Métricas usa o padrão certo: `ComercialEvent` em
`shared`). **Verificar ao vivo** (mexer numa agenda e ver se a outra aba atualiza).

### 6. Versões de dependências
- **Inconsistência:** Dashboard usa **Prisma 6.19.3**; CRMs usam **Prisma 7.8**. Alinhar.
- **Vulnerabilidades:** a grande maioria é **dev-only** (toolchain vitest/esbuild —
  não afeta produção). Nada urgente em runtime.
- **Patches de produção disponíveis** (rodar com supervisão, pois reinstala + redeploya):
  ```bash
  # Dashboard (npm)
  npm i next@16.2.9 eslint-config-next@16.2.9 @supabase/supabase-js@latest
  # CRMs (pnpm) — em cada um
  pnpm up next eslint-config-next @supabase/supabase-js
  ```
  Majors (Prisma 7, Zod 4, recharts 3, TS 6, ESLint 10) ficam pra depois, com calma.

---

## 🟢 Baixa / organização

### 7. Cadastro bagunçado (dados, não código)
- Contas duplicadas/inativas no Comercial; `Tercerizada` com typo (faltou o "i");
  `Marcelo@fenixfibra.com` com nome "Gabriel Paz"; `admin@fenix.com` com nome "Marcelo".
- Limpeza é `UPDATE`/`DELETE` em produção → só com seu ok, conta a conta.

### 8. `lib/sso.ts` espelhado em 3 cópias
Idêntico nos 3 apps (precisa manter sincronizado na mão). Aceitável enquanto são
repos separados; se um dia virar monorepo, vira um pacote único.

### 9. Estilos inline em tudo
Funciona, mas pra manter/escalar, migrar pra Tailwind/CSS Modules deixaria mais
organizado. Trabalho grande, sem pressa.

### 10. UX: passe SSO inválido perde a mensagem
`/api/sso/enter` com passe inválido manda pra `/login?sso=negado`, mas o `/login`
do CRM agora redireciona pro portal — a mensagem se perde. Cosmético.

---

## Conclusão
Sistema **saudável e bem-feito**, sem nada quebrado. Segurança real a endereçar:
**#1 rate limiting** e **#3 confirmar o `NEXTAUTH_SECRET` de produção**. Em
seguida, decidir **#2 (visibilidade entre vendedores)**. O resto é incremental.

Quando você voltar, é só me dizer por qual quer começar que eu toco.
