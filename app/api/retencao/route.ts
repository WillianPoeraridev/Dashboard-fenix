import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularRetencao, type SolicitacaoRet } from "@/lib/retencao-metricas";

// Dashboard da gerência — consolidado de retenção (espelha o CRM Retenção).
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ano = parseInt(searchParams.get("ano") || "");
    const mes = parseInt(searchParams.get("mes") || "");
    if (!ano || !mes) return NextResponse.json({ error: "ano e mes obrigatórios" }, { status: 400 });

    const comp = await prisma.retencaoCompetencia.findUnique({ where: { ano_mes: { ano, mes } } });
    if (!comp) {
      return NextResponse.json({ temCompetencia: false, resumo: null });
    }

    const [solicRaw, atendentes, cidades] = await Promise.all([
      prisma.solicitacaoRetencao.findMany({
        where: { competenciaId: comp.id },
        select: { status: true, motivo: true, regiao: true, cidade: true, ticketCents: true, atendenteId: true },
      }),
      prisma.retencaoUser.findMany({ select: { id: true, name: true } }),
      prisma.retencaoCidade.findMany({ select: { id: true, nome: true } }),
    ]);

    const nomeAtendente = new Map(atendentes.map((a) => [a.id, a.name]));
    const nomeCidade = new Map(cidades.map((c) => [c.id, c.nome]));

    const solicitacoes: SolicitacaoRet[] = solicRaw.map((s) => ({
      status: s.status,
      motivo: s.motivo,
      regiao: s.regiao,
      cidade: s.cidade,
      ticketCents: s.ticketCents,
      atendenteId: s.atendenteId,
    }));

    const resumo = calcularRetencao(
      solicitacoes,
      {
        metaCancelamentos: comp.metaCancelamentos,
        orcamentoComissaoCents: comp.orcamentoComissaoCents,
        baseAtivosTotal: comp.baseAtivosTotal,
        diasUteis: comp.diasUteis,
        diasTrabalhados: comp.diasTrabalhados,
      },
      nomeAtendente,
      nomeCidade,
    );

    return NextResponse.json({ temCompetencia: true, resumo });
  } catch (e) {
    console.error("GET /api/retencao", e);
    return NextResponse.json({ error: "Erro ao carregar retenção" }, { status: 500 });
  }
}
