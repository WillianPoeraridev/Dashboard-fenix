import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MOTIVO_LABEL: Record<string, string> = {
  INSATISFACAO_ATD: "Insatisfação Atendimento",
  INSATISFACAO_SERVICO: "Insatisfação Serviço",
  MUDANCA_ENDERECO: "Mudança Endereço",
  MOTIVOS_PESSOAIS: "Motivos Pessoais",
  TROCA_PROVEDOR: "Troca Provedor",
  PROBLEMAS_FINANC: "Problemas Financeiros",
  INADIMPLENCIA_90: "Inadimplência 90+",
  OUTROS: "Outros",
};

function mesRange(ano: number, mes: number) {
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0, 23, 59, 59, 999);
  return { inicio, fim };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ano = parseInt(searchParams.get("ano") || "");
    const mes = parseInt(searchParams.get("mes") || "");
    if (!ano || !mes) return NextResponse.json({ error: "ano e mes obrigatórios" }, { status: 400 });

    const { inicio, fim } = mesRange(ano, mes);

    // Vendas
    const vendas = await prisma.venda.findMany({
      where: {
        definicao: "VENDA",
        data: { gte: inicio, lte: fim },
        valorCents: { gt: 0 },
      },
      select: { valorCents: true, regiao: true },
    });

    // Leads
    const totalLeads = await prisma.leadCarteira.count();

    // Retenção
    const retencoes = await prisma.solicitacaoRetencao.findMany({
      where: { dataRegistro: { gte: inicio, lte: fim } },
      select: { status: true, motivo: true, ticketCents: true, regiao: true },
    });

    const cancelados = retencoes.filter((s) => s.status === "CANCELADO");
    const retidos = retencoes.filter((s) => s.status === "RETIDO");

    // MRR
    const mrrGanhoCents = vendas.reduce((sum, v) => sum + (v.valorCents ?? 0), 0);
    const mrrPerdidoCents = cancelados.reduce((sum, s) => sum + (s.ticketCents ?? 0), 0);
    const mrrLiquidoCents = mrrGanhoCents - mrrPerdidoCents;

    // Taxa de retenção
    const totalRetencao = cancelados.length + retidos.length;
    const taxaRetencao = totalRetencao > 0 ? (retidos.length / totalRetencao) * 100 : 0;

    // Conversão de leads
    const conversaoLeads = totalLeads > 0 ? (vendas.length / totalLeads) * 100 : 0;

    // Top motivos
    const motivoCount: Record<string, number> = {};
    for (const s of cancelados) {
      const label = MOTIVO_LABEL[s.motivo ?? ""] ?? s.motivo ?? "Outros";
      motivoCount[label] = (motivoCount[label] || 0) + 1;
    }
    const topMotivos = Object.entries(motivoCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([motivo, count]) => ({ motivo, count }));

    // Região
    const regiaoMap: Record<string, { ganho: number; perdido: number }> = {};
    for (const v of vendas) {
      const r = v.regiao || "OUTROS";
      if (!regiaoMap[r]) regiaoMap[r] = { ganho: 0, perdido: 0 };
      regiaoMap[r].ganho += v.valorCents ?? 0;
    }
    for (const s of cancelados) {
      const r = s.regiao || "OUTROS";
      if (!regiaoMap[r]) regiaoMap[r] = { ganho: 0, perdido: 0 };
      regiaoMap[r].perdido += s.ticketCents ?? 0;
    }
    const porRegiao = Object.entries(regiaoMap).map(([regiao, v]) => ({ regiao, ...v }));

    return NextResponse.json({
      mrrGanhoCents,
      mrrPerdidoCents,
      mrrLiquidoCents,
      taxaRetencao,
      conversaoLeads,
      totalVendas: vendas.length,
      totalLeads,
      totalCancelados: cancelados.length,
      totalRetidos: retidos.length,
      topMotivos,
      porRegiao,
    });
  } catch (e) {
    console.error("GET /api/kpis", e);
    return NextResponse.json({ error: "Erro ao carregar KPIs" }, { status: 500 });
  }
}