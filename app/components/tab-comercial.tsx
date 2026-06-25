"use client";

import { useState, useEffect } from "react";
import type { MetricasConsolidado } from "@/lib/metricas";
import { fmtBRL, fmtBRLInt, fmtPctRaw, fmtPct, shortName } from "@/lib/format";
import { REGIAO_LABEL, ORIGEM_LABEL } from "@/lib/labels";
import { Secao, CardTopo, Carregando, SemDados } from "./ui";

interface Resp {
  temCompetencia: boolean;
  consolidado: MetricasConsolidado | null;
  porOrigem: { canal: string; total: number; instaladas: number; valorCents: number }[];
  porCidade: { nome: string; vendas: number; instaladas: number; valorCents: number }[];
}

export function TabComercial({ ano, mes }: { ano: number; mes: number }) {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/comercial?ano=${ano}&mes=${mes}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [ano, mes]);

  if (loading) return <Carregando />;
  if (!data || !data.temCompetencia || !data.consolidado) {
    return <SemDados texto="Nenhuma competência comercial cadastrada para este mês." />;
  }

  const { geral, porRegiao, vendedores, diasUteis, diasTrabalhados, diasRestantes, metaInstalacaoGeral } = data.consolidado;
  const pctAting = geral.meta > 0 ? (geral.realizado / geral.meta) * 100 : 0;
  const corAting = pctAting >= 100 ? "var(--success)" : pctAting >= 80 ? "var(--warning)" : "var(--danger)";
  const bgAting = pctAting >= 100 ? "var(--success-bg)" : pctAting >= 80 ? "var(--warning-bg-strong)" : "var(--danger-bg)";
  const maxOrigem = Math.max(...data.porOrigem.map((o) => o.total), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Cards gerais */}
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 10 }}>
          <CardTopo label="Meta Geral" valor={fmtBRL(geral.meta)} />
          <CardTopo label="Pré-venda" valor={fmtBRL(geral.preVenda)} cor="var(--info)" />
          <CardTopo label="Instalado" valor={fmtBRL(geral.realizado)} cor="var(--success)" />
          <CardTopo label="A instalar" valor={fmtBRL(geral.vendaParcial)} cor="var(--warning)" />
          <CardTopo label="% Atingido" valor={fmtPctRaw(pctAting)} cor={corAting} bg={bgAting} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 10 }}>
          <CardTopo label="Projeção" valor={fmtBRL(geral.projecao)} cor={geral.projecaoMeta >= 100 ? "var(--success)" : geral.projecaoMeta >= 80 ? "var(--warning)" : "var(--danger)"} subtexto={`${fmtPctRaw(geral.projecaoMeta)} da meta`} />
          <CardTopo label="Proj. Otimista" valor={fmtBRL(geral.projecaoOtimista)} cor="var(--indigo)" subtexto={`${fmtPctRaw(geral.projecaoOtimistaMeta)} da meta`} />
          <CardTopo label="Faltam" valor={fmtBRL(geral.faltam)} cor={geral.faltam <= 0 ? "var(--success)" : "var(--danger)"} />
          <CardTopo label="Faltam p/ dia" valor={fmtBRL(geral.faltamPorDia)} cor="var(--warning)" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          <CardTopo label="Vendas" valor={String(geral.qtdVendas)} />
          <CardTopo label="Instaladas" valor={String(geral.qtdInstaladas)} cor="var(--success)" />
          <CardTopo label="Meta Instalação" valor={String(metaInstalacaoGeral)} />
          <CardTopo label="Ticket Médio" valor={fmtBRL(geral.ticketMedio)} cor="var(--info)" />
          <CardTopo label="Dias Trab./Úteis" valor={`${diasTrabalhados}/${diasUteis}`} />
          <CardTopo label="Dias Restantes" valor={String(diasRestantes)} cor={diasRestantes <= 5 ? "var(--danger)" : "var(--fg)"} />
        </div>
      </div>

      {/* Por região */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {(["MATRIZ", "LITORAL", "SINOS"] as const).map((regiao) => {
          const r = porRegiao[regiao];
          if (!r) return null;
          const pct = r.meta > 0 ? (r.realizado / r.meta) * 100 : 0;
          const cor = pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--warning-deep)" : "var(--danger)";
          const bg = pct >= 80 ? "var(--success-bg)" : pct >= 50 ? "var(--warning-bg-strong)" : "var(--danger-bg)";
          return (
            <div key={regiao} style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", backgroundColor: "var(--surface)" }}>
              <div style={{ backgroundColor: "var(--surface-2)", padding: "8px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{REGIAO_LABEL[regiao]}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: cor, backgroundColor: bg, padding: "2px 8px", borderRadius: 4 }}>{fmtPctRaw(pct)}</span>
              </div>
              <div style={{ padding: "10px 14px" }}>
                <LinhaKV k="Meta" v={fmtBRL(r.meta)} />
                <LinhaKV k="Instalado" v={fmtBRL(r.realizado)} cor="var(--success)" />
                <LinhaKV k="A instalar" v={fmtBRL(r.vendaParcial)} cor="var(--warning)" />
                <LinhaKV k="Projeção" v={fmtBRL(r.projecao)} />
                <LinhaKV k="Vendas / Instal." v={`${r.qtdVendas} / ${r.qtdInstaladas}`} />
                <LinhaKV k="Ticket Médio" v={fmtBRL(r.ticketMedio)} cor="var(--info)" />
                <LinhaKV k="Faltam" v={fmtBRL(r.faltam)} cor={r.faltam <= 0 ? "var(--success)" : "var(--danger)"} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranking vendedores */}
      <Secao titulo="Ranking de Vendedores">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", backgroundColor: "var(--surface-2)" }}>
                {["#", "Vendedor", "Meta", "Pré-venda", "Instalado", "A instalar", "Faltam", "Proj. Meta", "Vendas", "Instal.", "Cancel.", "Ticket", "Leads", "Conv."].map((h) => (
                  <th key={h} style={{ padding: "8px 6px", textAlign: h === "Vendedor" ? "left" : "right", color: "var(--fg-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendedores.map((v, i) => {
                const pc = v.projecaoResultadoMeta >= 100 ? "var(--success)" : v.projecaoResultadoMeta >= 80 ? "var(--warning)" : "var(--danger)";
                return (
                  <tr key={v.vendedorId} style={{ borderBottom: "1px solid var(--border)", backgroundColor: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: "var(--fg-subtle)" }}>{i + 1}</td>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>{shortName(v.vendedorNome)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>{fmtBRLInt(v.metaFinanceira)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--info)", fontWeight: 600 }}>{fmtBRLInt(v.preVenda)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: "var(--success)" }}>{fmtBRLInt(v.vendaAtual)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--warning)" }}>{fmtBRLInt(v.vendaParcial)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: v.faltamParaMeta <= 0 ? "var(--success)" : "var(--danger)" }}>{fmtBRLInt(v.faltamParaMeta)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>
                      <span style={{ fontWeight: 700, color: pc, backgroundColor: `color-mix(in srgb, ${pc} 14%, transparent)`, padding: "2px 6px", borderRadius: 4 }}>{fmtPctRaw(v.projecaoResultadoMeta)}</span>
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>{v.qtdVendas}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--success)" }}>{v.qtdInstaladas}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--danger)" }}>{v.cancelamentoQtd}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>{fmtBRLInt(v.ticketMedio)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: "var(--indigo)" }}>{v.leadsAptos}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>{fmtPctRaw(v.conversao)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Secao>

      {/* Origem + Cidade */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Secao titulo={`Vendas por Origem (${data.porOrigem.reduce((s, o) => s + o.total, 0)} registros)`}>
          {data.porOrigem.length === 0 && <p style={{ color: "var(--fg-subtle)", fontSize: 13 }}>Sem registros.</p>}
          {data.porOrigem.map((o) => (
            <div key={o.canal} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{ORIGEM_LABEL[o.canal] ?? o.canal}</span>
                <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{o.total} ({fmtPct(o.total, data.porOrigem.reduce((s, x) => s + x.total, 0))})</span>
              </div>
              <div style={{ height: 6, backgroundColor: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${(o.total / maxOrigem) * 100}%`, height: "100%", backgroundColor: "var(--accent)", borderRadius: 3 }} />
              </div>
              {o.instaladas > 0 && (
                <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>{o.instaladas} instaladas · {fmtBRL(o.valorCents / 100)}</div>
              )}
            </div>
          ))}
        </Secao>

        <Secao titulo={`Top Cidades (${data.porCidade.length})`}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                {["Cidade", "Vendas", "Instal.", "Valor"].map((h) => (
                  <th key={h} style={{ padding: "6px", textAlign: h === "Cidade" ? "left" : "right", color: "var(--fg-muted)", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.porCidade.map((c) => (
                <tr key={c.nome} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "6px", fontWeight: 600 }}>{c.nome}</td>
                  <td style={{ padding: "6px", textAlign: "right" }}>{c.vendas}</td>
                  <td style={{ padding: "6px", textAlign: "right", color: "var(--success)" }}>{c.instaladas}</td>
                  <td style={{ padding: "6px", textAlign: "right", fontWeight: 600, color: "var(--success)" }}>{fmtBRLInt(c.valorCents / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Secao>
      </div>
    </div>
  );
}

function LinhaKV({ k, v, cor = "var(--fg)" }: { k: string; v: string; cor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
      <span style={{ color: "var(--fg-muted)" }}>{k}</span>
      <span style={{ fontWeight: 600, color: cor }}>{v}</span>
    </div>
  );
}
