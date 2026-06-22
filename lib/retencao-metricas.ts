// Agregação pura das métricas de Retenção — espelha crm-retencao-fenix
// app/retencao/bloco-informacoes.tsx. Recebe solicitações + mapas de nome.

export interface SolicitacaoRet {
  status: string;
  motivo: string | null;
  regiao: string;
  cidade: string; // id da cidade
  ticketCents: number | null;
  atendenteId: string;
}

export interface RetencaoCompetenciaInput {
  metaCancelamentos: number | null;
  orcamentoComissaoCents: number | null;
  baseAtivosTotal: number | null;
  diasUteis: number | null;
  diasTrabalhados: number | null;
}

export interface RetencaoResumo {
  totalCancelados: number;
  totalRetidos: number;
  totalInadimplencia: number;
  totalAtendidos: number;
  totalEmpresa: number;
  taxaRetencao: number; // %
  saldo: number;
  diasRestantes: number;
  metaRecalculada: number | null;
  churnGeral: number | null; // fração (0..1)
  mrrCanceladoCents: number;
  mrrRetidoCents: number;
  ticketMedioCanceladoCents: number | null;
  ticketMedioRetidoCents: number | null;
  motivos: { motivo: string; count: number }[];
  atendentes: {
    nome: string;
    total: number;
    cancelados: number;
    retidos: number;
    txRetencao: number; // %
    mrrPerdidoCents: number;
    mrrRetidoCents: number;
    projComissaoCents: number | null;
  }[];
  porRegiao: { regiao: string; cancelados: number; retidos: number; inadimplencia: number }[];
  porCidade: { nome: string; cancelados: number; retidos: number; inadimplencia: number }[];
}

export function calcularRetencao(
  solicitacoes: SolicitacaoRet[],
  comp: RetencaoCompetenciaInput,
  atendenteNomes: Map<string, string>,
  cidadeNomes: Map<string, string>,
): RetencaoResumo {
  const cancelados = solicitacoes.filter((s) => s.status === "CANCELADO");
  const retidos = solicitacoes.filter((s) => s.status === "RETIDO");
  const inadimplentes = solicitacoes.filter((s) => s.status === "INADIMPLENCIA");

  const totalCancelados = cancelados.length;
  const totalRetidos = retidos.length;
  const totalInadimplencia = inadimplentes.length;
  const totalAtendidos = totalCancelados + totalRetidos;
  const totalEmpresa = totalCancelados + totalInadimplencia;

  const saldo = (comp.metaCancelamentos ?? 0) - totalCancelados;
  const diasRestantes = (comp.diasUteis ?? 0) - (comp.diasTrabalhados ?? 0);
  const metaRecalculada = diasRestantes > 0 ? Math.ceil(saldo / diasRestantes) : null;
  const churnGeral =
    comp.baseAtivosTotal && comp.baseAtivosTotal > 0 ? totalEmpresa / comp.baseAtivosTotal : null;

  const mrrCanceladoCents = cancelados.reduce((s, x) => s + (x.ticketCents ?? 0), 0);
  const mrrRetidoCents = retidos.reduce((s, x) => s + (x.ticketCents ?? 0), 0);
  const ticketsCanceladosComValor = cancelados.filter((c) => c.ticketCents != null).length;
  const ticketsRetidosComValor = retidos.filter((c) => c.ticketCents != null).length;
  const ticketMedioCanceladoCents =
    ticketsCanceladosComValor > 0 ? Math.round(mrrCanceladoCents / ticketsCanceladosComValor) : null;
  const ticketMedioRetidoCents =
    ticketsRetidosComValor > 0 ? Math.round(mrrRetidoCents / ticketsRetidosComValor) : null;

  const motivosCount: Record<string, number> = {};
  for (const s of cancelados) {
    if (s.motivo && s.motivo !== "INADIMPLENCIA_90") {
      motivosCount[s.motivo] = (motivosCount[s.motivo] ?? 0) + 1;
    }
  }
  const motivos = Object.entries(motivosCount)
    .sort((a, b) => b[1] - a[1])
    .map(([motivo, count]) => ({ motivo, count }));

  const atendentesMap: Record<
    string,
    { nome: string; total: number; cancelados: number; retidos: number; mrrPerdidoCents: number; mrrRetidoCents: number }
  > = {};
  for (const s of solicitacoes) {
    if (s.status === "INADIMPLENCIA") continue;
    const id = s.atendenteId;
    if (!atendentesMap[id]) {
      atendentesMap[id] = {
        nome: atendenteNomes.get(id) ?? "—",
        total: 0,
        cancelados: 0,
        retidos: 0,
        mrrPerdidoCents: 0,
        mrrRetidoCents: 0,
      };
    }
    atendentesMap[id].total++;
    if (s.status === "CANCELADO") {
      atendentesMap[id].cancelados++;
      atendentesMap[id].mrrPerdidoCents += s.ticketCents ?? 0;
    }
    if (s.status === "RETIDO") {
      atendentesMap[id].retidos++;
      atendentesMap[id].mrrRetidoCents += s.ticketCents ?? 0;
    }
  }
  const atendentes = Object.values(atendentesMap)
    .sort((a, b) => b.retidos - a.retidos)
    .map((a) => {
      const txParticipacao = totalRetidos > 0 ? a.retidos / totalRetidos : 0;
      const projComissaoCents = comp.orcamentoComissaoCents
        ? Math.round(comp.orcamentoComissaoCents * txParticipacao)
        : null;
      return {
        nome: a.nome,
        total: a.total,
        cancelados: a.cancelados,
        retidos: a.retidos,
        txRetencao: a.total > 0 ? (a.retidos / a.total) * 100 : 0,
        mrrPerdidoCents: a.mrrPerdidoCents,
        mrrRetidoCents: a.mrrRetidoCents,
        projComissaoCents,
      };
    });

  const regiaoMap: Record<string, { cancelados: number; retidos: number; inadimplencia: number }> = {};
  for (const s of solicitacoes) {
    const r = s.regiao;
    if (!regiaoMap[r]) regiaoMap[r] = { cancelados: 0, retidos: 0, inadimplencia: 0 };
    if (s.status === "CANCELADO") regiaoMap[r].cancelados++;
    if (s.status === "RETIDO") regiaoMap[r].retidos++;
    if (s.status === "INADIMPLENCIA") regiaoMap[r].inadimplencia++;
  }
  const porRegiao = Object.entries(regiaoMap)
    .sort((a, b) => b[1].cancelados - a[1].cancelados)
    .map(([regiao, v]) => ({ regiao, ...v }));

  const cidadeMap: Record<string, { nome: string; cancelados: number; retidos: number; inadimplencia: number }> = {};
  for (const s of solicitacoes) {
    const id = s.cidade;
    if (!cidadeMap[id]) cidadeMap[id] = { nome: cidadeNomes.get(id) ?? id, cancelados: 0, retidos: 0, inadimplencia: 0 };
    if (s.status === "CANCELADO") cidadeMap[id].cancelados++;
    if (s.status === "RETIDO") cidadeMap[id].retidos++;
    if (s.status === "INADIMPLENCIA") cidadeMap[id].inadimplencia++;
  }
  const porCidade = Object.values(cidadeMap)
    .filter((c) => c.cancelados > 0)
    .sort((a, b) => b.cancelados - a.cancelados);

  return {
    totalCancelados,
    totalRetidos,
    totalInadimplencia,
    totalAtendidos,
    totalEmpresa,
    taxaRetencao: totalAtendidos > 0 ? (totalRetidos / totalAtendidos) * 100 : 0,
    saldo,
    diasRestantes,
    metaRecalculada,
    churnGeral,
    mrrCanceladoCents,
    mrrRetidoCents,
    ticketMedioCanceladoCents,
    ticketMedioRetidoCents,
    motivos,
    atendentes,
    porRegiao,
    porCidade,
  };
}
