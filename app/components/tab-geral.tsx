"use client";

import { useState, useEffect } from "react";
import { fmtBRL, fmtPctRaw } from "@/lib/format";
import { Secao, Carregando } from "./ui";

interface KpiData {
  mrrGanhoCents: number;
  mrrPerdidoCents: number;
  mrrLiquidoCents: number;
  taxaRetencao: number;
  conversaoLeads: number;
  totalVendas: number;
  totalLeads: number;
  totalCancelados: number;
  totalRetidos: number;
  topMotivos: { motivo: string; count: number }[];
  porRegiao: { regiao: string; ganho: number; perdido: number }[];
}

export function TabGeral({ ano, mes }: { ano: number; mes: number }) {
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/kpis?ano=${ano}&mes=${mes}`)
      .then((r) => r.json())
      .then(setKpi)
      .finally(() => setLoading(false));
  }, [ano, mes]);

  if (loading) return <Carregando />;
  if (!kpi) return null;

  const card: React.CSSProperties = {
    backgroundColor: "var(--surface)", borderRadius: 10, padding: "20px 24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", flex: 1, minWidth: 180,
  };

  return (
    <>
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={card}>
          <p style={{ fontSize: 12, color: "var(--fg-muted)", margin: 0 }}>MRR Ganho</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "var(--success)", margin: "4px 0" }}>{fmtBRL(kpi.mrrGanhoCents / 100)}</p>
          <p style={{ fontSize: 11, color: "var(--fg-subtle)", margin: 0 }}>{kpi.totalVendas} vendas</p>
        </div>
        <div style={card}>
          <p style={{ fontSize: 12, color: "var(--fg-muted)", margin: 0 }}>MRR Perdido</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "var(--danger)", margin: "4px 0" }}>{fmtBRL(kpi.mrrPerdidoCents / 100)}</p>
          <p style={{ fontSize: 11, color: "var(--fg-subtle)", margin: 0 }}>{kpi.totalCancelados} cancelamentos</p>
        </div>
        <div style={card}>
          <p style={{ fontSize: 12, color: "var(--fg-muted)", margin: 0 }}>MRR Líquido</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: kpi.mrrLiquidoCents >= 0 ? "var(--success)" : "var(--danger)", margin: "4px 0" }}>{fmtBRL(kpi.mrrLiquidoCents / 100)}</p>
          <p style={{ fontSize: 11, color: "var(--fg-subtle)", margin: 0 }}>ganho − perdido</p>
        </div>
        <div style={card}>
          <p style={{ fontSize: 12, color: "var(--fg-muted)", margin: 0 }}>Taxa de Retenção</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "var(--info-strong)", margin: "4px 0" }}>{fmtPctRaw(kpi.taxaRetencao)}</p>
          <p style={{ fontSize: 11, color: "var(--fg-subtle)", margin: 0 }}>{kpi.totalRetidos} retidos de {kpi.totalRetidos + kpi.totalCancelados}</p>
        </div>
        <div style={card}>
          <p style={{ fontSize: 12, color: "var(--fg-muted)", margin: 0 }}>Conversão de Leads</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "var(--violet)", margin: "4px 0" }}>{fmtPctRaw(kpi.conversaoLeads)}</p>
          <p style={{ fontSize: 11, color: "var(--fg-subtle)", margin: 0 }}>{kpi.totalVendas} vendas / {kpi.totalLeads} leads</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Secao titulo="🔝 Top Motivos de Cancelamento">
          {kpi.topMotivos.length === 0 && <p style={{ color: "var(--fg-subtle)", fontSize: 13 }}>Nenhum cancelamento no período.</p>}
          {kpi.topMotivos.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <span>{m.motivo}</span>
              <span style={{ fontWeight: 600 }}>{m.count}</span>
            </div>
          ))}
        </Secao>
        <Secao titulo="📍 Performance por Região">
          {kpi.porRegiao.length === 0 && <p style={{ color: "var(--fg-subtle)", fontSize: 13 }}>Sem dados no período.</p>}
          {kpi.porRegiao.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{r.regiao}</span>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: "var(--success)" }}>+{fmtBRL(r.ganho / 100)}</span>
                <span style={{ color: "var(--danger)" }}>−{fmtBRL(r.perdido / 100)}</span>
              </div>
            </div>
          ))}
        </Secao>
      </div>
    </>
  );
}
