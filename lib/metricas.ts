// Cópia adaptada de crm-comercial-fenix/lib/metricas.ts (funções puras) — manter
// em sincronia. Diferença: tipo de venda local (estrutural) em vez de VendaComRelacoes.
import { calcularDiasUteisDoMes, calcularDiasTrabalhadosAteHoje } from "./dias-uteis";

/** Shape mínimo de venda que as métricas consomem. */
export interface VendaMetrica {
  vendedorId: string;
  definicao: string;
  statusInstalacao: string;
  valorCents: number | null;
  regiao: string;
  vendedor: { name: string };
}

export interface MetricasVendedor {
  vendedorId: string;
  vendedorNome: string;
  metaFinanceira: number;
  metaInstalacao: number;
  vendaAtual: number;
  cancelamentoValor: number;
  cancelamentoQtd: number;
  qtdVendas: number;
  qtdInstaladas: number;
  qtdLeads: number;
  qtdInvRegiao: number;
  ticketMedio: number;
  projecao: number;
  projecaoResultadoMeta: number;
  projecaoOtimista: number;
  projecaoOtimistaResultadoMeta: number;
  faltamParaMeta: number;
  metaDiariaFinanceira: number;
  metaDiariaQtd: number;
  recalibTotalQtd: number;
  recalibTicket: number;
  pctCancelamento: number;
  leadsAptos: number;
  conversao: number;
  pctAtingimento: number;
  pipeline: number;
  pipelineQtd: number;
  vendaParcial: number;
  vendaParcialQtd: number;
  preVenda: number;
  preVendaQtd: number;
}

export interface MetricasResumo {
  meta: number;
  realizado: number;
  projecao: number;
  projecaoMeta: number;
  projecaoOtimista: number;
  projecaoOtimistaMeta: number;
  qtdVendas: number;
  qtdInstaladas: number;
  ticketMedio: number;
  faltam: number;
  projecaoVendas: number;
  projecaoInstaladas: number;
  faltamPorDia: number;
  pipeline: number;
  pipelineQtd: number;
  vendaParcial: number;
  vendaParcialQtd: number;
  preVenda: number;
  preVendaQtd: number;
}

export interface MetricasConsolidado {
  geral: MetricasResumo;
  porRegiao: Record<string, MetricasResumo>;
  vendedores: MetricasVendedor[];
  diasUteis: number;
  diasTrabalhados: number;
  diasRestantes: number;
  metaCancelamentoPct: number;
  metaInstalacaoGeral: number;
}

interface Competencia {
  ano: number;
  mes: number;
  metaFinanceiraGeral: number | null;
  metaInstalacaoGeral: number | null;
  metaFinanceiraMatriz: number | null;
  metaFinanceiraLitoral: number | null;
  metaFinanceiraSinos: number | null;
  diasUteis: number | null;
  diasTrabalhados: number | null;
  metaCancelamentoPct: number | null;
}

interface MetaVendedorRow {
  vendedorId: string;
  metaFinanceira: number | null;
  metaInstalacao: number | null;
  vendedor: { id: string; name: string };
}

export function calcularMetricasVendedor(
  vendedorId: string,
  vendedorNome: string,
  vendas: VendaMetrica[],
  metaRow: MetaVendedorRow | undefined,
  comp: Competencia
): MetricasVendedor {
  const minhas = vendas.filter((v) => v.vendedorId === vendedorId);

  const vendasDef = minhas.filter((v) => v.definicao === "VENDA");
  const instaladas = vendasDef.filter((v) => v.statusInstalacao === "SIM");
  const canceladas = vendasDef.filter((v) => v.statusInstalacao === "CANCELADO");
  const preVendaList = vendasDef.filter((v) => v.statusInstalacao !== "CANCELADO");
  const leads = minhas.filter((v) => v.definicao === "LEAD");
  const invRegiao = minhas.filter((v) => v.definicao === "INV_REGIAO");
  const inviaveis = minhas.filter((v) => v.definicao.startsWith("INV_"));

  const vendaAtual = instaladas.reduce((s, v) => s + (v.valorCents ?? 0), 0) / 100;
  const preVenda = preVendaList.reduce((s, v) => s + (v.valorCents ?? 0), 0) / 100;
  const cancelamentoValor = canceladas.reduce((s, v) => s + (v.valorCents ?? 0), 0) / 100;
  const cancelamentoQtd = canceladas.length;
  const qtdVendas = vendasDef.length;
  const qtdInstaladas = instaladas.length;
  const ticketMedio = qtdInstaladas > 0 ? vendaAtual / qtdInstaladas : 0;

  const metaFinanceira = (metaRow?.metaFinanceira ?? 0) / 100;
  const metaInstalacao = metaRow?.metaInstalacao ?? 0;
  const faltamParaMeta = metaFinanceira - vendaAtual;

  const diasUteis = comp.diasUteis ?? calcularDiasUteisDoMes(comp.ano, comp.mes);
  const diasTrabalhados = comp.diasTrabalhados ?? calcularDiasTrabalhadosAteHoje(comp.ano, comp.mes);
  const diasRestantes = Math.max(diasUteis - diasTrabalhados, 0);

  const projecao = diasTrabalhados > 0 ? (vendaAtual / diasTrabalhados) * diasUteis : 0;
  const projecaoResultadoMeta = metaFinanceira > 0 ? (projecao / metaFinanceira) * 100 : 0;
  const projecaoOtimista = diasTrabalhados > 0 ? (qtdVendas / diasTrabalhados) * diasUteis * ticketMedio : 0;
  const projecaoOtimistaResultadoMeta = metaFinanceira > 0 ? (projecaoOtimista / metaFinanceira) * 100 : 0;

  const metaDiariaFinanceira = diasRestantes > 0 ? faltamParaMeta / diasRestantes : 0;
  const metaDiariaQtd = diasRestantes > 0
    ? Math.ceil(Math.max(metaInstalacao - qtdInstaladas, 0) / diasRestantes)
    : 0;

  const pctCancelamento = qtdVendas > 0 ? (cancelamentoQtd / qtdVendas) * 100 : 0;

  const leadsAptos = leads.length + inviaveis.length;
  const totalAtendidos = qtdInstaladas + leadsAptos;
  const conversao = totalAtendidos > 0 ? (qtdInstaladas / totalAtendidos) * 100 : 0;

  const pctAtingimento = metaFinanceira > 0 ? (vendaAtual / metaFinanceira) * 100 : 0;

  const pipelineVendas = vendasDef.filter((v) => v.statusInstalacao === "PENDENTE" || v.statusInstalacao === "AGENDADO");
  const pipeline = pipelineVendas.reduce((s, v) => s + (v.valorCents ?? 0), 0) / 100;
  const pipelineQtd = pipelineVendas.length;

  const recalibTotalQtd = ticketMedio > 0 ? Math.ceil(faltamParaMeta / ticketMedio) : 0;
  const recalibTicket = recalibTotalQtd > 0 ? faltamParaMeta / recalibTotalQtd : 0;

  return {
    vendedorId,
    vendedorNome,
    metaFinanceira,
    metaInstalacao,
    vendaAtual,
    cancelamentoValor,
    cancelamentoQtd,
    qtdVendas,
    qtdInstaladas,
    qtdLeads: leads.length,
    qtdInvRegiao: invRegiao.length,
    ticketMedio,
    projecao,
    projecaoResultadoMeta,
    projecaoOtimista,
    projecaoOtimistaResultadoMeta,
    faltamParaMeta,
    metaDiariaFinanceira,
    metaDiariaQtd,
    recalibTotalQtd,
    recalibTicket,
    pctCancelamento,
    leadsAptos,
    conversao,
    pctAtingimento,
    pipeline,
    pipelineQtd,
    vendaParcial: pipeline,
    vendaParcialQtd: pipelineQtd,
    preVenda,
    preVendaQtd: preVendaList.length,
  };
}

export function calcularConsolidado(
  vendas: VendaMetrica[],
  metas: MetaVendedorRow[],
  comp: Competencia
): MetricasConsolidado {
  const diasUteis = comp.diasUteis ?? calcularDiasUteisDoMes(comp.ano, comp.mes);
  const diasTrabalhados = comp.diasTrabalhados ?? calcularDiasTrabalhadosAteHoje(comp.ano, comp.mes);
  const diasRestantes = Math.max(diasUteis - diasTrabalhados, 0);

  const vendedorIds = [...new Set(vendas.map((v) => v.vendedorId))];
  const metasMap = new Map(metas.map((m) => [m.vendedorId, m]));

  for (const m of metas) {
    if (!vendedorIds.includes(m.vendedorId)) vendedorIds.push(m.vendedorId);
  }

  const vendedoresMetricas = vendedorIds.map((id) => {
    const meta = metasMap.get(id);
    const nome = meta?.vendedor.name ?? vendas.find((v) => v.vendedorId === id)?.vendedor.name ?? "—";
    return calcularMetricasVendedor(id, nome, vendas, meta, comp);
  });

  const vendasDef = vendas.filter((v) => v.definicao === "VENDA");
  const instaladas = vendasDef.filter((v) => v.statusInstalacao === "SIM");
  const preVendaListGeral = vendasDef.filter((v) => v.statusInstalacao !== "CANCELADO");
  const metaGeral = (comp.metaFinanceiraGeral ?? 0) / 100;
  const realizadoGeral = instaladas.reduce((s, v) => s + (v.valorCents ?? 0), 0) / 100;
  const preVendaGeral = preVendaListGeral.reduce((s, v) => s + (v.valorCents ?? 0), 0) / 100;
  const projecaoGeral = diasTrabalhados > 0 ? (realizadoGeral / diasTrabalhados) * diasUteis : 0;
  const ticketGeral = instaladas.length > 0 ? realizadoGeral / instaladas.length : 0;
  const projecaoOtimistaGeral = diasTrabalhados > 0 ? (vendasDef.length / diasTrabalhados) * diasUteis * ticketGeral : 0;

  const pipelineGeralVendas = vendasDef.filter((v) => v.statusInstalacao === "PENDENTE" || v.statusInstalacao === "AGENDADO");
  const pipelineGeral = pipelineGeralVendas.reduce((s, v) => s + (v.valorCents ?? 0), 0) / 100;

  const faltamGeral = metaGeral - realizadoGeral;
  const geral: MetricasResumo = {
    meta: metaGeral,
    realizado: realizadoGeral,
    projecao: projecaoGeral,
    projecaoMeta: metaGeral > 0 ? (projecaoGeral / metaGeral) * 100 : 0,
    projecaoOtimista: projecaoOtimistaGeral,
    projecaoOtimistaMeta: metaGeral > 0 ? (projecaoOtimistaGeral / metaGeral) * 100 : 0,
    qtdVendas: vendasDef.length,
    qtdInstaladas: instaladas.length,
    ticketMedio: ticketGeral,
    faltam: faltamGeral,
    projecaoVendas: diasTrabalhados > 0 ? (vendasDef.length / diasTrabalhados) * diasUteis : 0,
    projecaoInstaladas: diasTrabalhados > 0 ? (instaladas.length / diasTrabalhados) * diasUteis : 0,
    faltamPorDia: diasRestantes > 0 ? faltamGeral / diasRestantes : 0,
    pipeline: pipelineGeral,
    pipelineQtd: pipelineGeralVendas.length,
    vendaParcial: pipelineGeral,
    vendaParcialQtd: pipelineGeralVendas.length,
    preVenda: preVendaGeral,
    preVendaQtd: preVendaListGeral.length,
  };

  const porRegiao: Record<string, MetricasResumo> = {};
  const regioes = ["MATRIZ", "LITORAL", "SINOS"] as const;
  const metaRegiaoMap: Record<string, number> = {
    MATRIZ: (comp.metaFinanceiraMatriz ?? 0) / 100,
    LITORAL: (comp.metaFinanceiraLitoral ?? 0) / 100,
    SINOS: (comp.metaFinanceiraSinos ?? 0) / 100,
  };

  for (const regiao of regioes) {
    const vendasR = vendasDef.filter((v) => v.regiao === regiao);
    const instR = vendasR.filter((v) => v.statusInstalacao === "SIM");
    const preVendaListR = vendasR.filter((v) => v.statusInstalacao !== "CANCELADO");
    const realizadoR = instR.reduce((s, v) => s + (v.valorCents ?? 0), 0) / 100;
    const preVendaR = preVendaListR.reduce((s, v) => s + (v.valorCents ?? 0), 0) / 100;
    const metaR = metaRegiaoMap[regiao];
    const projR = diasTrabalhados > 0 ? (realizadoR / diasTrabalhados) * diasUteis : 0;
    const ticketR = instR.length > 0 ? realizadoR / instR.length : 0;
    const projOtimistaR = diasTrabalhados > 0 ? (vendasR.length / diasTrabalhados) * diasUteis * ticketR : 0;

    const pipelineR = vendasR.filter((v) => v.statusInstalacao === "PENDENTE" || v.statusInstalacao === "AGENDADO");
    const pipelineRVal = pipelineR.reduce((s, v) => s + (v.valorCents ?? 0), 0) / 100;

    const faltamR = metaR - realizadoR;
    porRegiao[regiao] = {
      meta: metaR,
      realizado: realizadoR,
      projecao: projR,
      projecaoMeta: metaR > 0 ? (projR / metaR) * 100 : 0,
      projecaoOtimista: projOtimistaR,
      projecaoOtimistaMeta: metaR > 0 ? (projOtimistaR / metaR) * 100 : 0,
      qtdVendas: vendasR.length,
      qtdInstaladas: instR.length,
      ticketMedio: ticketR,
      faltam: faltamR,
      projecaoVendas: diasTrabalhados > 0 ? (vendasR.length / diasTrabalhados) * diasUteis : 0,
      projecaoInstaladas: diasTrabalhados > 0 ? (instR.length / diasTrabalhados) * diasUteis : 0,
      faltamPorDia: diasRestantes > 0 ? faltamR / diasRestantes : 0,
      pipeline: pipelineRVal,
      pipelineQtd: pipelineR.length,
      vendaParcial: pipelineRVal,
      vendaParcialQtd: pipelineR.length,
      preVenda: preVendaR,
      preVendaQtd: preVendaListR.length,
    };
  }

  return {
    geral,
    porRegiao,
    vendedores: vendedoresMetricas.sort((a, b) => b.vendaAtual - a.vendaAtual),
    diasUteis,
    diasTrabalhados,
    diasRestantes,
    metaCancelamentoPct: comp.metaCancelamentoPct ?? 0,
    metaInstalacaoGeral: comp.metaInstalacaoGeral ?? 0,
  };
}
