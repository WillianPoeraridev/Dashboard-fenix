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
  const corAting = pctAting >= 100 ? "#15803d" : pctAting >= 80 ? "#d97706" : "#b91c1c";
  const bgAting = pctAting >= 100 ? "#dcfce7" : pctAting >= 80 ? "#fef9c3" : "#fef2f2";
  const maxOrigem = Math.max(...data.porOrigem.map((o) => o.total), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Cards gerais */}
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 10 }}>
          <CardTopo label="Meta Geral" valor={fmtBRL(geral.meta)} />
          <CardTopo label="Pré-venda" valor={fmtBRL(geral.preVenda)} cor="#0369a1" />
          <CardTopo label="Instalado" valor={fmtBRL(geral.realizado)} cor="#15803d" />
          <CardTopo label="A instalar" valor={fmtBRL(geral.vendaParcial)} cor="#d97706" />
          <CardTopo label="% Atingido" valor={fmtPctRaw(pctAting)} cor={corAting} bg={bgAting} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 10 }}>
          <CardTopo label="Projeção" valor={fmtBRL(geral.projecao)} cor={geral.projecaoMeta >= 100 ? "#15803d" : geral.projecaoMeta >= 80 ? "#d97706" : "#b91c1c"} subtexto={`${fmtPctRaw(geral.projecaoMeta)} da meta`} />
          <CardTopo label="Proj. Otimista" valor={fmtBRL(geral.projecaoOtimista)} cor="#6366f1" subtexto={`${fmtPctRaw(geral.projecaoOtimistaMeta)} da meta`} />
          <CardTopo label="Faltam" valor={fmtBRL(geral.faltam)} cor={geral.faltam <= 0 ? "#15803d" : "#b91c1c"} />
          <CardTopo label="Faltam p/ dia" valor={fmtBRL(geral.faltamPorDia)} cor="#d97706" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          <CardTopo label="Vendas" valor={String(geral.qtdVendas)} />
          <CardTopo label="Instaladas" valor={String(geral.qtdInstaladas)} cor="#15803d" />
          <CardTopo label="Meta Instalação" valor={String(metaInstalacaoGeral)} />
          <CardTopo label="Ticket Médio" valor={fmtBRL(geral.ticketMedio)} cor="#0369a1" />
          <CardTopo label="Dias Trab./Úteis" valor={`${diasTrabalhados}/${diasUteis}`} />
          <CardTopo label="Dias Restantes" valor={String(diasRestantes)} cor={diasRestantes <= 5 ? "#b91c1c" : "#111827"} />
        </div>
      </div>

      {/* Por região */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {(["MATRIZ", "LITORAL", "SINOS"] as const).map((regiao) => {
          const r = porRegiao[regiao];
          if (!r) return null;
          const pct = r.meta > 0 ? (r.realizado / r.meta) * 100 : 0;
          const cor = pct >= 80 ? "#15803d" : pct >= 50 ? "#a16207" : "#b91c1c";
          const bg = pct >= 80 ? "#dcfce7" : pct >= 50 ? "#fef9c3" : "#fef2f2";
          return (
            <div key={regiao} style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff" }}>
              <div style={{ backgroundColor: "#f9fafb", padding: "8px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{REGIAO_LABEL[regiao]}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: cor, backgroundColor: bg, padding: "2px 8px", borderRadius: 4 }}>{fmtPctRaw(pct)}</span>
              </div>
              <div style={{ padding: "10px 14px" }}>
                <LinhaKV k="Meta" v={fmtBRL(r.meta)} />
                <LinhaKV k="Instalado" v={fmtBRL(r.realizado)} cor="#15803d" />
                <LinhaKV k="A instalar" v={fmtBRL(r.vendaParcial)} cor="#d97706" />
                <LinhaKV k="Projeção" v={fmtBRL(r.projecao)} />
                <LinhaKV k="Vendas / Instal." v={`${r.qtdVendas} / ${r.qtdInstaladas}`} />
                <LinhaKV k="Ticket Médio" v={fmtBRL(r.ticketMedio)} cor="#0369a1" />
                <LinhaKV k="Faltam" v={fmtBRL(r.faltam)} cor={r.faltam <= 0 ? "#15803d" : "#b91c1c"} />
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
              <tr style={{ borderBottom: "2px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
                {["#", "Vendedor", "Meta", "Pré-venda", "Instalado", "A instalar", "Faltam", "Proj. Meta", "Vendas", "Instal.", "Cancel.", "Ticket", "Leads", "Conv."].map((h) => (
                  <th key={h} style={{ padding: "8px 6px", textAlign: h === "Vendedor" ? "left" : "right", color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendedores.map((v, i) => {
                const pc = v.projecaoResultadoMeta >= 100 ? "#15803d" : v.projecaoResultadoMeta >= 80 ? "#d97706" : "#b91c1c";
                return (
                  <tr key={v.vendedorId} style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: "#9ca3af" }}>{i + 1}</td>
                    <td style={{ padding: "8px 6px", fontWeight: 600 }}>{shortName(v.vendedorNome)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>{fmtBRLInt(v.metaFinanceira)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: "#0369a1", fontWeight: 600 }}>{fmtBRLInt(v.preVenda)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 700, color: "#15803d" }}>{fmtBRLInt(v.vendaAtual)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: "#d97706" }}>{fmtBRLInt(v.vendaParcial)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: v.faltamParaMeta <= 0 ? "#15803d" : "#b91c1c" }}>{fmtBRLInt(v.faltamParaMeta)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>
                      <span style={{ fontWeight: 700, color: pc, backgroundColor: `${pc}15`, padding: "2px 6px", borderRadius: 4 }}>{fmtPctRaw(v.projecaoResultadoMeta)}</span>
                    </td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>{v.qtdVendas}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: "#15803d" }}>{v.qtdInstaladas}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: "#b91c1c" }}>{v.cancelamentoQtd}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right" }}>{fmtBRLInt(v.ticketMedio)}</td>
                    <td style={{ padding: "8px 6px", textAlign: "right", color: "#6366f1" }}>{v.leadsAptos}</td>
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
          {data.porOrigem.length === 0 && <p style={{ color: "#9ca3af", fontSize: 13 }}>Sem registros.</p>}
          {data.porOrigem.map((o) => (
            <div key={o.canal} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{ORIGEM_LABEL[o.canal] ?? o.canal}</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>{o.total} ({fmtPct(o.total, data.porOrigem.reduce((s, x) => s + x.total, 0))})</span>
              </div>
              <div style={{ height: 6, backgroundColor: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${(o.total / maxOrigem) * 100}%`, height: "100%", backgroundColor: "#f97316", borderRadius: 3 }} />
              </div>
              {o.instaladas > 0 && (
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{o.instaladas} instaladas · {fmtBRL(o.valorCents / 100)}</div>
              )}
            </div>
          ))}
        </Secao>

        <Secao titulo={`Top Cidades (${data.porCidade.length})`}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                {["Cidade", "Vendas", "Instal.", "Valor"].map((h) => (
                  <th key={h} style={{ padding: "6px", textAlign: h === "Cidade" ? "left" : "right", color: "#6b7280", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.porCidade.map((c) => (
                <tr key={c.nome} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "6px", fontWeight: 600 }}>{c.nome}</td>
                  <td style={{ padding: "6px", textAlign: "right" }}>{c.vendas}</td>
                  <td style={{ padding: "6px", textAlign: "right", color: "#15803d" }}>{c.instaladas}</td>
                  <td style={{ padding: "6px", textAlign: "right", fontWeight: 600, color: "#15803d" }}>{fmtBRLInt(c.valorCents / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Secao>
      </div>
    </div>
  );
}

function LinhaKV({ k, v, cor = "#111827" }: { k: string; v: string; cor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
      <span style={{ color: "#6b7280" }}>{k}</span>
      <span style={{ fontWeight: 600, color: cor }}>{v}</span>
    </div>
  );
}
