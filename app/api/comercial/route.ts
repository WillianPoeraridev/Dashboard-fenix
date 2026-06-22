import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularConsolidado, type VendaMetrica } from "@/lib/metricas";

// Dashboard da gerência — consolidado comercial (espelha o CRM Comercial).
// Ancorado em competência (ano/mês), igual ao dashboard do CRM. Só leitura.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ano = parseInt(searchParams.get("ano") || "");
    const mes = parseInt(searchParams.get("mes") || "");
    if (!ano || !mes) return NextResponse.json({ error: "ano e mes obrigatórios" }, { status: 400 });

    const comp = await prisma.comercialCompetencia.findUnique({ where: { ano_mes: { ano, mes } } });
    if (!comp) {
      return NextResponse.json({ temCompetencia: false, consolidado: null, porOrigem: [], porCidade: [] });
    }

    const [vendasRaw, metasRaw, users, cidades] = await Promise.all([
      prisma.venda.findMany({
        where: { competenciaId: comp.id },
        select: { vendedorId: true, definicao: true, statusInstalacao: true, valorCents: true, regiao: true, origemLead: true, cidadeId: true },
      }),
      prisma.metaVendedor.findMany({
        where: { competenciaId: comp.id },
        select: { vendedorId: true, metaFinanceira: true, metaInstalacao: true },
      }),
      prisma.comercialUser.findMany({ select: { id: true, name: true } }),
      prisma.comercialCidade.findMany({ select: { id: true, nome: true } }),
    ]);

    const nomeVendedor = new Map(users.map((u) => [u.id, u.name]));
    const nomeCidade = new Map(cidades.map((c) => [c.id, c.nome]));

    const vendas: VendaMetrica[] = vendasRaw.map((v) => ({
      vendedorId: v.vendedorId,
      definicao: v.definicao,
      statusInstalacao: v.statusInstalacao,
      valorCents: v.valorCents,
      regiao: v.regiao,
      vendedor: { name: nomeVendedor.get(v.vendedorId) ?? "—" },
    }));

    const metas = metasRaw.map((m) => ({
      vendedorId: m.vendedorId,
      metaFinanceira: m.metaFinanceira,
      metaInstalacao: m.metaInstalacao,
      vendedor: { id: m.vendedorId, name: nomeVendedor.get(m.vendedorId) ?? "—" },
    }));

    const consolidado = calcularConsolidado(vendas, metas, comp);

    // Por origem (canal): total de atendimentos, instaladas e valor instalado.
    const origemMap: Record<string, { total: number; instaladas: number; valorCents: number }> = {};
    for (const v of vendasRaw) {
      if (!origemMap[v.origemLead]) origemMap[v.origemLead] = { total: 0, instaladas: 0, valorCents: 0 };
      origemMap[v.origemLead].total++;
      if (v.definicao === "VENDA" && v.statusInstalacao === "SIM") {
        origemMap[v.origemLead].instaladas++;
        origemMap[v.origemLead].valorCents += v.valorCents ?? 0;
      }
    }
    const porOrigem = Object.entries(origemMap)
      .map(([canal, d]) => ({ canal, ...d }))
      .sort((a, b) => b.total - a.total);

    // Por cidade (só vendas).
    const cidadeMap: Record<string, { nome: string; vendas: number; instaladas: number; valorCents: number }> = {};
    for (const v of vendasRaw) {
      if (v.definicao !== "VENDA") continue;
      if (!cidadeMap[v.cidadeId]) cidadeMap[v.cidadeId] = { nome: nomeCidade.get(v.cidadeId) ?? v.cidadeId, vendas: 0, instaladas: 0, valorCents: 0 };
      cidadeMap[v.cidadeId].vendas++;
      if (v.statusInstalacao === "SIM") {
        cidadeMap[v.cidadeId].instaladas++;
        cidadeMap[v.cidadeId].valorCents += v.valorCents ?? 0;
      }
    }
    const porCidade = Object.values(cidadeMap)
      .sort((a, b) => b.valorCents - a.valorCents)
      .slice(0, 15);

    return NextResponse.json({ temCompetencia: true, consolidado, porOrigem, porCidade });
  } catch (e) {
    console.error("GET /api/comercial", e);
    return NextResponse.json({ error: "Erro ao carregar comercial" }, { status: 500 });
  }
}
