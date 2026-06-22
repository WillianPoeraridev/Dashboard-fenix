# Dashboard da Gerência + Marketing/CAC

> Painel executivo do gerente (Marcelo). Raiz `crm-operacional.com.br`.
> Entregue em 2026-06-22.

## O que tem

Abas (seletor de mês/ano vale pra todas):

- **Visão Geral** — KPIs (MRR ganho/perdido/líquido, taxa de retenção, conversão)
  + top motivos de cancelamento + performance por região. (`/api/kpis`)
- **Comercial** — espelha o dashboard do CRM Comercial: cards gerais
  (meta/instalado/projeções/ticket/dias), por região, ranking de vendedores,
  vendas por origem e top cidades. Ancorado em **competência**. (`/api/comercial`)
- **Retenção** — espelha o CRM Retenção: indicadores, motivos, ranking de
  atendentes (com proj. de comissão), por região e por cidade. (`/api/retencao`)
- **Marketing / CAC** — tabela de CAC por canal + inputs manuais do gerente. (`/api/marketing`)

Tudo lê o banco **server-side** via shadow models read-only (role `postgres`,
ignora RLS). Nenhuma escrita em tabelas dos CRMs.

## Fórmula do CAC (aba Marketing)

Por canal (`origemLead`), ancorado na competência do mês:

| Campo | Cálculo |
|---|---|
| Leads totais | nº de atendimentos do canal (`Venda`) |
| Inviáveis | `definicao ∈ {INV_REGIAO, INV_PORTE, INV_INADIMPLENCIA}` |
| Leads aptos | leads totais − inviáveis |
| Vendas | `definicao = VENDA` (vendas **fechadas**) |
| Conversão | vendas ÷ leads aptos |
| Investimento | **manual** (gerente) |
| CAC do canal | investimento ÷ vendas do canal |
| CAC equipe | custo equipe comercial ÷ **total** de vendas (mesmo p/ todo canal) |
| CAC total | CAC do canal + CAC equipe |

Rodapé: **CAC total geral** = (investimento total + custo equipe) ÷ total de vendas.

Inputs manuais (investimento por canal + custo da equipe) são salvos por
competência (POST `/api/marketing`). Lógica pura em `lib/marketing.ts`.

## Mudanças de banco desta entrega (PRODUÇÃO, aditivas, NÃO estão em migration)

> O Dashboard usa shadow models — **nunca `prisma db push` aqui**. As mudanças
> abaixo foram aplicadas via SQL aditivo. Se o banco for recriado, reaplicar.

1. **Enum** (CRM Comercial) — captura de novas inviabilidades:
   ```sql
   ALTER TYPE comercial."DefinicaoVenda" ADD VALUE IF NOT EXISTS 'INV_PORTE';
   ALTER TYPE comercial."DefinicaoVenda" ADD VALUE IF NOT EXISTS 'INV_INADIMPLENCIA';
   ```
2. **Tabelas dos inputs do gerente** (schema `public`, RLS on sem policy):
   ```sql
   CREATE TABLE IF NOT EXISTS public."MarketingInvestimento" (
     id bigserial PRIMARY KEY, ano int NOT NULL, mes int NOT NULL, canal text NOT NULL,
     "valorCents" int NOT NULL DEFAULT 0, "updatedAt" timestamptz NOT NULL DEFAULT now());
   CREATE UNIQUE INDEX IF NOT EXISTS "MarketingInvestimento_ano_mes_canal_key"
     ON public."MarketingInvestimento"(ano, mes, canal);
   ALTER TABLE public."MarketingInvestimento" ENABLE ROW LEVEL SECURITY;

   CREATE TABLE IF NOT EXISTS public."CustoMensal" (
     id bigserial PRIMARY KEY, ano int NOT NULL, mes int NOT NULL,
     "custoEquipeComercialCents" int NOT NULL DEFAULT 0, "updatedAt" timestamptz NOT NULL DEFAULT now());
   CREATE UNIQUE INDEX IF NOT EXISTS "CustoMensal_ano_mes_key" ON public."CustoMensal"(ano, mes);
   ALTER TABLE public."CustoMensal" ENABLE ROW LEVEL SECURITY;
   ```

## Observações

- **CAC histórico é aproximado**: meses anteriores a esta entrega não têm
  porte/inadimplência classificados (só região). Daqui pra frente é exato,
  conforme os vendedores usam as novas opções no form de nova venda.
- A coluna **"Conv." do CRM Comercial** passou a contar porte/inadimplência no
  funil (como a de região já contava) — comportamento mais correto.
- Lógica espelhada dos CRMs (`metricas`, `format`, `labels`, `dias-uteis`) são
  **cópias** — manter em sincronia se o cálculo mudar nos CRMs.
