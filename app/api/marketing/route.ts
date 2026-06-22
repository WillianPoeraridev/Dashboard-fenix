import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcularCac, type VendaCac } from "@/lib/marketing";
import { ORIGEM_LABEL } from "@/lib/labels";

const CANAIS = Object.keys(ORIGEM_LABEL);

// GET — tabela de CAC por canal, ancorada em competência (ano/mês).
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ano = parseInt(searchParams.get("ano") || "");
    const mes = parseInt(searchParams.get("mes") || "");
    if (!ano || !mes) return NextResponse.json({ error: "ano e mes obrigatórios" }, { status: 400 });

    const comp = await prisma.comercialCompetencia.findUnique({ where: { ano_mes: { ano, mes } } });

    const [vendasRaw, investimentos, custo] = await Promise.all([
      comp
        ? prisma.venda.findMany({ where: { competenciaId: comp.id }, select: { origemLead: true, definicao: true } })
        : Promise.resolve([] as { origemLead: string; definicao: string }[]),
      prisma.marketingInvestimento.findMany({ where: { ano, mes }, select: { canal: true, valorCents: true } }),
      prisma.custoMensal.findUnique({ where: { ano_mes: { ano, mes } }, select: { custoEquipeComercialCents: true } }),
    ]);

    const vendas: VendaCac[] = vendasRaw.map((v) => ({ origemLead: v.origemLead, definicao: v.definicao }));
    const custoEquipeCents = custo?.custoEquipeComercialCents ?? 0;

    const cac = calcularCac(vendas, investimentos, custoEquipeCents, CANAIS);

    return NextResponse.json({
      temCompetencia: !!comp,
      custoEquipeComercialCents: custoEquipeCents,
      ...cac,
    });
  } catch (e) {
    console.error("GET /api/marketing", e);
    return NextResponse.json({ error: "Erro ao carregar marketing" }, { status: 500 });
  }
}

// POST — salva os inputs manuais do Marcelo (investimento por canal + custo equipe).
const bodySchema = z.object({
  ano: z.number().int().min(2020).max(2099),
  mes: z.number().int().min(1).max(12),
  custoEquipeComercialCents: z.number().int().min(0),
  investimentos: z
    .array(
      z.object({
        canal: z.enum(CANAIS as [string, ...string[]]),
        valorCents: z.number().int().min(0),
      }),
    )
    .max(50),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }
    const { ano, mes, custoEquipeComercialCents, investimentos } = parsed.data;

    await prisma.$transaction([
      prisma.custoMensal.upsert({
        where: { ano_mes: { ano, mes } },
        create: { ano, mes, custoEquipeComercialCents },
        update: { custoEquipeComercialCents },
      }),
      ...investimentos.map((i) =>
        prisma.marketingInvestimento.upsert({
          where: { ano_mes_canal: { ano, mes, canal: i.canal } },
          create: { ano, mes, canal: i.canal, valorCents: i.valorCents },
          update: { valorCents: i.valorCents },
        }),
      ),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/marketing", e);
    return NextResponse.json({ error: "Erro ao salvar marketing" }, { status: 500 });
  }
}
