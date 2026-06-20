# CLAUDE.md — Dashboard-fenix

## ⚠️ CRÍTICO — LER ANTES DE QUALQUER COISA

**O banco é PRODUÇÃO.** Rodar local conecta nos dados REAIS do Supabase
(`qferxnctsvkdymvgvfit`). **Cuidado com testes destrutivos rodando local** —
qualquer `DELETE`, `UPDATE`, seed, etc. afeta a operação de verdade da Fênix.
Não há banco de dev separado (ainda).

**NUNCA rode `prisma db push` neste app.** O Dashboard usa "shadow models"
(subconjuntos das tabelas reais dos CRMs); um `db push` destruiria as tabelas
reais de produção. Ver gotchas em [SETUP.md](./SETUP.md).

Antes de qualquer operação que escreva no banco: confirmar com o Willian.

## Contexto

App Next.js 16 (Dashboard gerência). Package manager: **npm** (não usar pnpm).
Setup completo da máquina: ver [SETUP.md](./SETUP.md).
