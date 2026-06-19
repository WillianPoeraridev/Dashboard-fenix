"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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

function fmtBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function fmtPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch(`/api/kpis?ano=${ano}&mes=${mes}`)
      .then((r) => r.json())
      .then(setKpi)
      .finally(() => setLoading(false));
  }, [status, ano, mes]);

  if (status === "loading" || loading) {
    return (
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ color: "#6b7280" }}>Carregando...</p>
      </main>
    );
  }

  if (!session) return null;

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: "20px 24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    flex: 1,
    minWidth: 180,
  };

  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <main style={{ padding: "24px 40px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📊 Dashboard Fênix</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))}
            style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
            {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))}
            style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
            {[2024, 2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      {kpi && (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={cardStyle}>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>MRR Ganho</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#15803d", margin: "4px 0" }}>{fmtBRL(kpi.mrrGanhoCents)}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{kpi.totalVendas} vendas</p>
            </div>
            <div style={cardStyle}>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>MRR Perdido</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#b91c1c", margin: "4px 0" }}>{fmtBRL(kpi.mrrPerdidoCents)}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{kpi.totalCancelados} cancelamentos</p>
            </div>
            <div style={cardStyle}>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>MRR Líquido</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: kpi.mrrLiquidoCents >= 0 ? "#15803d" : "#b91c1c", margin: "4px 0" }}>{fmtBRL(kpi.mrrLiquidoCents)}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>ganho − perdido</p>
            </div>
            <div style={cardStyle}>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Taxa de Retenção</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#1e40af", margin: "4px 0" }}>{fmtPct(kpi.taxaRetencao)}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{kpi.totalRetidos} retidos de {kpi.totalRetidos + kpi.totalCancelados}</p>
            </div>
            <div style={cardStyle}>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Conversão de Leads</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed", margin: "4px 0" }}>{fmtPct(kpi.conversaoLeads)}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{kpi.totalVendas} vendas / {kpi.totalLeads} leads</p>
            </div>
          </div>

          {/* Top Motivos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>🔝 Top Motivos de Cancelamento</h3>
              {kpi.topMotivos.length === 0 && <p style={{ color: "#9ca3af", fontSize: 13 }}>Nenhum cancelamento no período.</p>}
              {kpi.topMotivos.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: 13 }}>
                  <span>{m.motivo}</span>
                  <span style={{ fontWeight: 600 }}>{m.count}</span>
                </div>
              ))}
            </div>

            {/* Performance por Região */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>📍 Performance por Região</h3>
              {kpi.porRegiao.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{r.regiao}</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ color: "#15803d" }}>+{fmtBRL(r.ganho)}</span>
                    <span style={{ color: "#b91c1c" }}>−{fmtBRL(r.perdido)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}