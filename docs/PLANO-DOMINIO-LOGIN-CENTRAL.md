# Migração para domínio próprio + login central por setor

> **Plano aprovado** (sessão de planejamento). Ainda **não executado**.
> Domínio: **crm-operacional.com.br** (DNS no Registro.br).

## Context

Hoje os 3 apps Fênix rodam em URLs `.vercel.app` separadas, cada um com seu
login, e o SSO ("passe") existe só pra gerência transitar. O Willian comprou o
domínio **crm-operacional.com.br** (DNS no Registro.br) e quer:

1. Subir os 3 apps pro domínio próprio, em **subdomínios por setor**.
2. Um **login central no endereço raiz** que reconhece o setor da pessoa e a
   manda pro lugar certo: vendedor → Comercial, atendente → Retenção,
   gerente/admin → Dashboard.
3. Manter o **isolamento entre setores** (atendente nunca vê o Comercial e
   vice-versa).

Restrição crítica: **o sistema está em produção, em uso por 15+ pessoas, com
banco único de produção** (Supabase `qferxnctsvkdymvgvfit`). A migração não pode
derrubar o acesso de ninguém, e nenhuma etapa pode escrever/destruir dados
(nada de `prisma db push` no Dashboard; shadow models só leem).

## Decisões de arquitetura

- **Mapa de domínios:**
  - `crm-operacional.com.br` → **Dashboard** (portal de login universal + painel da gerência)
  - `comercial.crm-operacional.com.br` → **Comercial**
  - `retencao.crm-operacional.com.br` → **Retenção**
- **Reusar o "passe" SSO** (`lib/sso.ts` + `/api/sso/enter` + `encode()`), **não**
  cookie compartilhado de domínio-pai. Motivo: com o passe, cada app tem sessão
  própria por host → isolamento por setor é natural (vendedor logado não ganha
  sessão na Retenção). Cookie compartilhado faria o contrário (todos com sessão
  em tudo) e exigiria bloqueio ativo em cada app — pior pro requisito do Willian.
- **Não unificar/migrar as tabelas `User`.** Cada CRM referencia seus usuários por
  id em FKs (`Venda.vendedorId`, `SolicitacaoRetencao.atendenteId`, etc.).
  Migrar quebraria essas FKs. O portal valida contra as 3 tabelas existentes via
  **shadow models** (só leitura).

## Etapas

### 1. Domínios no Vercel (Claude) — não afeta produção
- Adicionar o domínio em cada projeto Vercel (via API REST, token em
  `~/AppData/Roaming/com.vercel.cli/Data/auth.json`):
  - projeto Comercial → `comercial.crm-operacional.com.br`
  - projeto Retenção → `retencao.crm-operacional.com.br`
  - projeto Dashboard → `crm-operacional.com.br` + `www.crm-operacional.com.br`
- Coletar os registros DNS que o Vercel devolve (valores de A/CNAME).
- Os apps continuam acessíveis nos `.vercel.app` o tempo todo aqui.

### 2. DNS no Registro.br (Willian) — Claude passa campo a campo
- Na tela "Configurar zona DNS": apex `crm-operacional.com.br` (registro **A** →
  IP do Vercel), `www` (CNAME → `cname.vercel-dns.com`), `comercial` (CNAME),
  `retencao` (CNAME). Valores exatos saem da etapa 1.
- Aguardar propagação (verificar com `nslookup`/checagem no Vercel).

### 3. Portal de login no Dashboard (Claude)
- **`fenix-dashboard/prisma/schema.prisma`**: adicionar shadow models
  `ComercialUser` (`@@map("User")` + `@@schema("comercial")`) e `RetencaoUser`
  (`@@map("User")` + `@@schema("retencao")`) com os campos `id, name, email,
  passwordHash, role, isActive`. Declarar os enums de `role` como enum (igual já
  foi feito com `Regiao`/`StatusRetencao`, pra evitar P2032 na leitura).
  → Depois **só `prisma generate`**, nunca `db push`.
- **`fenix-dashboard/app/api/portal/login/route.ts`** (novo): POST `{email, senha}`.
  Procura o email com prioridade **gerência (`public.User`) > Comercial > Retenção**,
  valida `bcrypt.compare`. Então:
  - gerência → cria sessão local do Dashboard (`encode()` + cookie
    `__Secure-next-auth.session-token`, mesmo padrão do `enter`) → redirect `/`.
  - Comercial → `gerarPasse(email)` → redirect
    `https://comercial.crm-operacional.com.br/api/sso/enter?passe=…`.
  - Retenção → idem para `retencao.…/api/sso/enter`.
  - nada encontrado / senha errada → erro de credencial.
- **`fenix-dashboard/app/login/page.tsx`**: trocar o `signIn("credentials")` por
  chamada ao `/api/portal/login` e seguir o redirect retornado. Mantém o visual atual.

### 4. Abrir o `enter` dos CRMs pra usuários comuns (Claude)
- **`crm-comercial-fenix/app/api/sso/enter/route.ts`** e
  **`crm-retencao-fenix/app/api/sso/enter/route.ts`**: trocar a checagem
  `!user || !user.isActive || user.role !== "ADMIN"` por `!user || !user.isActive`.
  (Vendedores/atendentes passam a entrar via passe do portal; o passe é assinado
  e o user precisa existir/estar ativo na tabela local — duplo controle.)
- O navbar cross-app continua **admin-only** (já é: `temCrossApp = isAdmin && …`),
  então isolamento de navegação preservado.

### 5. Env / URLs — a "virada" (Claude, em horário de baixo uso)
- Atualizar nos 3 projetos Vercel (API REST):
  - `NEXTAUTH_URL` → o domínio de cada app.
  - `NEXT_PUBLIC_CRM_COMERCIAL_URL`, `NEXT_PUBLIC_CRM_RETENCAO_URL`,
    `NEXT_PUBLIC_DASHBOARD_URL` → os subdomínios (usados pelo navbar).
- Atualizar a allowlist `APPS`/`urlPermitida()` em **`lib/sso.ts`** dos 3 apps
  pros novos domínios (confirmar se é hardcode ou env na execução).
- Redeploy. Após isso o login passa a valer no domínio; opcional: configurar os
  `.vercel.app` pra redirecionar pro domínio novo.

### 6. Verificação (end-to-end)
- **DNS:** os 3 endereços abrem (HTTPS válido emitido pelo Vercel).
- **Portal (raiz):** login do Marcelo → cai no Dashboard; login de um vendedor →
  redireciona e abre o Comercial; login de um atendente → abre a Retenção.
  (Marcelo testável direto; pros perfis de vendedor/atendente valida-se a lógica e o
  Willian confirma com um login real de cada setor — criar usuário de teste seria
  escrita no banco e exige aval dele.)
- **Gerência transita:** botões do navbar Comercial↔Retenção↔Dashboard via passe.
- **Isolamento:** vendedor não tem botão pra Retenção; mesmo forçando
  `/api/sso/enter`, é negado por não existir em `retencao.User`.
- `npx tsc --noEmit` nos apps tocados antes de cada deploy.

## Riscos e mitigação
- **Login de produção:** a virada do `NEXTAUTH_URL` (etapa 5) é o ponto sensível —
  fazer em horário de baixo uso, com o domínio já validado na etapa 6. Antes da
  virada, tudo continua funcionando nos `.vercel.app`.
- **Banco:** portal só faz `findUnique` (leitura) e seta cookie; shadow models só
  `generate`. Nenhuma escrita. `db push` proibido no Dashboard.

## Status de execução
- [x] Etapa 1 — domínios no Vercel (3 projetos, verified)
- [x] Etapa 2 — DNS no Registro.br (A apex + 3 CNAMEs) + SSL (4 domínios servindo 200)
- [x] Etapa 3 — portal de login no Dashboard (`/api/portal/login` + shadow models + middleware)
- [x] Etapa 4 — `enter` dos CRMs aceita qualquer usuário ativo
- [x] Etapa 5 — virada: `NEXTAUTH_URL`, `NEXT_PUBLIC_*`, `APPS` pros domínios; `www`→apex (308)
- [~] Etapa 6 — verificação automática OK (login pages 200, portal 401, raiz→/login).
      Falta confirmar login real por perfil (Marcelo→Dashboard, vendedor→Comercial, atendente→Retenção).

### Mapa final em produção
- `https://crm-operacional.com.br` → Dashboard (portal de login + painel gerência)
- `https://comercial.crm-operacional.com.br` → CRM Comercial
- `https://retencao.crm-operacional.com.br` → CRM Retenção
