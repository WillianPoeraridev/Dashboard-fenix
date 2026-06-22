// Cálculo puro do CAC (Custo de Aquisição de Cliente) por canal — pedido do Marcelo.
//
// Por canal (origemLead):
//   leadsTotais   = todos os atendimentos do canal
//   inviaveis     = definicao ∈ {INV_REGIAO, INV_PORTE, INV_INADIMPLENCIA}
//   leadsAptos    = leadsTotais − inviaveis
//   vendas        = definicao = VENDA (vendas fechadas)
//   conversao     = vendas / leadsAptos
//   cacCanal      = investimento(canal) / vendas(canal)
//   cacEquipe     = custoEquipeComercial / totalVendas   (mesmo valor p/ todo canal)
//   cacTotal      = cacCanal + cacEquipe
// Geral:
//   cacTotalGeral = (investimentoTotal + custoEquipeComercial) / totalVendas

export interface VendaCac {
  origemLead: string;
  definicao: string;
}

export interface CanalCac {
  canal: string;
  leadsTotais: number;
  inviaveis: number;
  leadsAptos: number;
  vendas: number;
  conversao: number | null; // %
  investimentoCents: number;
  cacCanalCents: number | null;
  cacEquipeCents: number | null;
  cacTotalCents: number | null;
}

export interface CacTotais {
  leadsTotais: number;
  inviaveis: number;
  leadsAptos: number;
  vendas: number;
  conversao: number | null;
  investimentoCents: number;
  custoEquipeCents: number;
  cacEquipeCents: number | null;
  cacTotalGeralCents: number | null;
}

export interface CacResultado {
  canais: CanalCac[];
  totais: CacTotais;
}

const isInviavel = (definicao: string) => definicao.startsWith("INV_");

export function calcularCac(
  vendas: VendaCac[],
  investimentos: { canal: string; valorCents: number }[],
  custoEquipeComercialCents: number,
  canaisConhecidos: string[] = [],
): CacResultado {
  const investMap = new Map<string, number>();
  for (const i of investimentos) investMap.set(i.canal, i.valorCents);

  // Conjunto de canais: os que têm venda/lead + os que têm investimento + os conhecidos.
  const canais = new Set<string>(canaisConhecidos);
  for (const v of vendas) canais.add(v.origemLead);
  for (const i of investimentos) canais.add(i.canal);

  const agg = new Map<string, { leadsTotais: number; inviaveis: number; vendas: number }>();
  for (const canal of canais) agg.set(canal, { leadsTotais: 0, inviaveis: 0, vendas: 0 });
  for (const v of vendas) {
    const a = agg.get(v.origemLead)!;
    a.leadsTotais++;
    if (isInviavel(v.definicao)) a.inviaveis++;
    if (v.definicao === "VENDA") a.vendas++;
  }

  const totalVendas = [...agg.values()].reduce((s, a) => s + a.vendas, 0);
  const cacEquipeCents = totalVendas > 0 ? custoEquipeComercialCents / totalVendas : null;

  const lista: CanalCac[] = [...agg.entries()].map(([canal, a]) => {
    const leadsAptos = a.leadsTotais - a.inviaveis;
    const investimentoCents = investMap.get(canal) ?? 0;
    const cacCanalCents = a.vendas > 0 ? investimentoCents / a.vendas : null;
    const cacTotalCents =
      a.vendas > 0 ? (cacCanalCents ?? 0) + (cacEquipeCents ?? 0) : null;
    return {
      canal,
      leadsTotais: a.leadsTotais,
      inviaveis: a.inviaveis,
      leadsAptos,
      vendas: a.vendas,
      conversao: leadsAptos > 0 ? (a.vendas / leadsAptos) * 100 : null,
      investimentoCents,
      cacCanalCents,
      cacEquipeCents,
      cacTotalCents,
    };
  });

  // Ordena: mais vendas primeiro, depois mais leads.
  lista.sort((x, y) => y.vendas - x.vendas || y.leadsTotais - x.leadsTotais);

  const leadsTotais = lista.reduce((s, c) => s + c.leadsTotais, 0);
  const inviaveis = lista.reduce((s, c) => s + c.inviaveis, 0);
  const leadsAptos = leadsTotais - inviaveis;
  const investimentoCents = lista.reduce((s, c) => s + c.investimentoCents, 0);

  return {
    canais: lista,
    totais: {
      leadsTotais,
      inviaveis,
      leadsAptos,
      vendas: totalVendas,
      conversao: leadsAptos > 0 ? (totalVendas / leadsAptos) * 100 : null,
      investimentoCents,
      custoEquipeCents: custoEquipeComercialCents,
      cacEquipeCents,
      cacTotalGeralCents:
        totalVendas > 0 ? (investimentoCents + custoEquipeComercialCents) / totalVendas : null,
    },
  };
}
