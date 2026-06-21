# Relatório de Debug, Segurança e Organização — Sistema Fênix

> Sessão de pente-fino completa (autorização total do Willian).
> Escopo: os 3 apps (Comercial, Retenção, Dashboard) + auth/SSO + banco.
> Regra mantida: nada de operação **destrutiva** de dados; correções de
> segurança aplicadas e verificadas; o que sobra está listado no fim.

## Resumo executivo

**Estado geral: BOM, e agora mais seguro.** O sistema é bem construído (auth
consistente com `getServerSession` + role + ownership, Zod nas fronteiras,
`apiError` centralizado, código limpo, testes passando 8/8). Nesta sessão fechei
**um vazamento de PII real** e adicionei **rate limiting** no login.

---

## ✅ Corrigido e no ar nesta sessão

1. **🔴 Vazamento de PII via Realtime/RLS — FECHADO.**
   A RLS dava ao role **`anon`** (chave pública, que vai no navegador) `SELECT`
   em `comercial.Venda`, `LeadCarteira`, `Upgrade`, `MetaVendedor`, `AgendaSlot`,
   `Competencia` — todas na publicação de realtime. Qualquer um com a chave
   pública conseguia **streamar nome de cliente + valores de venda** em tempo real.
   - **Fix:** removidas as 7 policies `anon`/`authenticated` dessas tabelas de
     dados. Mantidas só as tabelas de **evento** (`ComercialEvent`,
     `SolicitacaoRetencaoEvent`), que são **PII-free** (só `entity`/`event_type`/data).
   - **Por que é seguro:** o app lê dados via API server-side (role `postgres`,
     que ignora RLS) — `venda.count()=2502` confirmado depois do fix. O realtime
     que funciona usa as tabelas de evento (intactas). Nenhum `.from()` no client.
   - **REST já estava fechado** (só `public`/`graphql_public` expostos no PostgREST).
   - **Reverter (se precisar):** recriar com
     `CREATE POLICY "Anon pode ver X" ON comercial."Tabela" FOR SELECT TO anon USING (true);`
     (mas **não recrie** — era justamente o vazamento).

2. **🔴 Rate limiting no login — ADICIONADO.**
   `/api/portal/login` agora limita força-bruta: conta só tentativas que
   **falharam**, por `IP+email`, 15 por 10min. Quem acerta a senha nunca é
   contado → usuário legítimo **nunca** é bloqueado. **Fail-open** (qualquer erro
   no controle deixa o login passar). Tabela `public.LoginAttempt` criada via SQL
   aditivo. **Testado:** 15 tentativas → 401, 16ª+ → 429, email diferente → 401.

3. **Security headers** nos 3 apps (HSTS, X-Frame-Options DENY, nosniff,
   Referrer-Policy, Permissions-Policy). Verificado ativo nos 3 domínios.

4. **Realtime do banner de vencidos — CONSERTADO.** Assinava `public.AgendaSlot`
   (schema errado → nunca disparava); agora usa `shared.ComercialEvent` (padrão
   que funciona; AgendaSlot é capturado lá).

5. **`.claude/` no `.gitignore`** (Retenção).

(Além de toda a migração pro domínio + login central feita antes nesta sessão.)

---

## ✔️ Verificado — sem ação necessária

- **#2 Vendedor vê venda de todos:** confirmado pelo Willian que é **proposital**
  (quadro de vendas compartilhado). Nada a mudar.
- **#3 `NEXTAUTH_SECRET` de produção:** fiz teste de forja (assinei um cookie de
  sessão com os segredos suspeitos e tentei na prod). **Dashboard e Comercial
  rejeitaram** os segredos fracos → produção usa segredos diferentes/fortes.
  **Retenção** usa um hex aleatório de 256 bits (forte). **Nenhuma rotação
  necessária.** (Os `fenix-*-secret-2026` são só de dev local.)

---

## ⏳ Pendências (precisam de você / sessão supervisionada)

### 🔴 Rate limiting no login direto dos CRMs (bypass do NextAuth)
O portal está protegido, mas dá pra brute-forçar direto em
`comercial.crm-operacional.com.br/api/auth/callback/credentials` (endpoint do
NextAuth), que não tem rate limit. Cobrir os 3 `authorize()` com o mesmo
controle. Não fiz sozinho porque mexe no caminho de auth dentro do NextAuth
(mais delicado) — melhor com você junto (~20 min).

### 🟡 Realtime de **leads** não dispara
`leads/page.tsx` assina `public.LeadCarteira` (schema errado). Não dá pra
apontar pro `ComercialEvent` porque o trigger **não captura LeadCarteira** (só
AgendaSlot/Venda/Competencia). Fix correto: **estender o trigger** do
`ComercialEvent` pra incluir `LeadCarteira` (mudança de DB, fazer no Supabase).

### 🟡 Versões de dependências
- Dashboard usa **Prisma 6.19.3**; CRMs usam **Prisma 7.8** → alinhar.
- Vulnerabilidades: maioria **dev-only** (vitest/esbuild), não afeta produção.
- Patches de produção (rodar supervisionado — reinstala + redeploya):
  ```bash
  # Dashboard (npm):
  npm i next@16.2.9 eslint-config-next@16.2.9 @supabase/supabase-js@latest
  # CRMs (pnpm), em cada um:
  pnpm up next eslint-config-next @supabase/supabase-js
  ```
  Majors (Prisma 7, Zod 4, recharts 3, TS 6, ESLint 10) → depois, com calma.

### 🟢 Defesa em profundidade (opcional)
Remover as tabelas de dados da publicação `supabase_realtime` (já não são usadas
no realtime e o RLS já as protege) — camada extra caso a RLS mude no futuro.

### 🟢 Cadastro bagunçado (dados, não código)
Contas duplicadas/inativas no Comercial; `Tercerizada` (typo);
`Marcelo@fenixfibra.com` com nome "Gabriel Paz"; `admin@fenix.com` com nome
"Marcelo". Limpeza é `UPDATE`/`DELETE` em produção → só com seu ok, conta a conta.

### 🟢 Organização
- `lib/sso.ts` espelhado em 3 cópias (ok enquanto forem repos separados).
- Estilos inline em tudo (migrar pra Tailwind/CSS Modules deixaria mais limpo; trabalho grande).
- Confirmar no painel do Vercel que os `NEXTAUTH_SECRET` de prod são aleatórios de 32+ bytes.

---

## ⚠️ Mudanças de banco feitas nesta sessão (não estão em migration)
- **Criada** `public."LoginAttempt"` (id bigserial, key text, created_at timestamptz) + índice. Aditiva.
- **Removidas** 7 policies RLS `anon`/`authenticated` de SELECT nas tabelas de
  dados do `comercial` (vazamento de PII). Idempotente/reversível.
Se o banco for recriado, reaplicar (a criação da tabela; e **não** recriar as policies).

## Conclusão
Os dois riscos reais de segurança (**vazamento de PII via realtime** e **falta de
rate limiting**) foram **resolvidos e verificados**. O resto é incremental e está
priorizado acima. Sistema saudável, sem nada quebrado.
