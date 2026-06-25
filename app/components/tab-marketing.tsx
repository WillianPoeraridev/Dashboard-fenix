"use client";

import { useState, useEffect, useMemo } from "react";
import { fmtBRL, fmtPctRaw } from "@/lib/format";
import { ORIGEM_LABEL } from "@/lib/labels";
import { Secao, CardTopo, Carregando } from "./ui";

interface CanalResp {
  canal: string;
  leadsTotais: number;
  inviaveis: number;
  leadsAptos: number;
  vendas: number;
  investimentoCents: number;
}

const parseReaisToCents = (s: string): number => {
  const n = parseFloat((s || "").replace(",", "."));
  return isNaN(n) ? 0 : Math.round(n * 100);
};
const centsToInput = (cents: number): string => (cents ? String(cents / 100).replace(".", ",") : "");
const fmtCacCents = (cents: number | null): string => (cents === null ? "—" : fmtBRL(cents / 100));

export function TabMarketing({ ano, mes }: { ano: number; mes: number }) {
  const [canais, setCanais] = useState<CanalResp[]>([]);
  const [invest, setInvest] = useState<Record<string, string>>({});
  const [custo, setCusto] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    setMsg("");
    fetch(`/api/marketing?ano=${ano}&mes=${mes}`)
      .then((r) => r.json())
      .then((d) => {
        const cs: CanalResp[] = d.canais ?? [];
        setCanais(cs);
        const inv: Record<string, string> = {};
        for (const c of cs) inv[c.canal] = centsToInput(c.investimentoCents);
        setInvest(inv);
        setCusto(centsToInput(d.custoEquipeComercialCents ?? 0));
      })
      .finally(() => setLoading(false));
  }, [ano, mes]);

  // Recálculo ao vivo (mesma fórmula do servidor) conforme o gerente edita.
  const calc = useMemo(() => {
    const custoCents = parseReaisToCents(custo);
    const totalVendas = canais.reduce((s, c) => s + c.vendas, 0);
    const cacEquipe = totalVendas > 0 ? custoCents / totalVendas : null;
    let investTotal = 0;
    const linhas = canais.map((c) => {
      const investimentoCents = parseReaisToCents(invest[c.canal] ?? "");
      investTotal += investimentoCents;
      const cacCanal = c.vendas > 0 ? investimentoCents / c.vendas : null;
      const cacTotal = c.vendas > 0 ? (cacCanal ?? 0) + (cacEquipe ?? 0) : null;
      return {
        ...c,
        investimentoCents,
        conversao: c.leadsAptos > 0 ? (c.vendas / c.leadsAptos) * 100 : null,
        cacCanal,
        cacEquipe,
        cacTotal,
      };
    });
    const totLeads = canais.reduce((s, c) => s + c.leadsTotais, 0);
    const totInv = canais.reduce((s, c) => s + c.inviaveis, 0);
    const totAptos = totLeads - totInv;
    return {
      linhas,
      totalVendas,
      cacEquipe,
      custoCents,
      investTotal,
      totLeads,
      totInv,
      totAptos,
      cacTotalGeral: totalVendas > 0 ? (investTotal + custoCents) / totalVendas : null,
    };
  }, [canais, invest, custo]);

  async function salvar() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/marketing?ano=${ano}&mes=${mes}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ano,
          mes,
          custoEquipeComercialCents: parseReaisToCents(custo),
          investimentos: canais.map((c) => ({ canal: c.canal, valorCents: parseReaisToCents(invest[c.canal] ?? "") })),
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Erro ao salvar"); }
      setMsg("Salvo ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Carregando />;

  const inputStyle: React.CSSProperties = { width: 110, padding: "5px 8px", border: "1px solid var(--border-strong)", borderRadius: 6, fontSize: 13, textAlign: "right" };
  const th: React.CSSProperties = { padding: "8px 8px", color: "var(--fg-muted)", fontWeight: 600, whiteSpace: "nowrap" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Topo: custo equipe + consolidados */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", backgroundColor: "var(--surface)" }}>
          <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 4 }}>Custo equipe comercial (mês)</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>R$</span>
            <input value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" style={{ ...inputStyle, width: "100%", fontWeight: 700, fontSize: 16 }} />
          </div>
        </div>
        <CardTopo label="CAC equipe / venda" valor={fmtCacCents(calc.cacEquipe)} cor="var(--indigo)" />
        <CardTopo label="Total de vendas" valor={String(calc.totalVendas)} cor="var(--success)" />
        <CardTopo label="Investimento total" valor={fmtBRL(calc.investTotal / 100)} cor="var(--info)" />
        <CardTopo label="CAC TOTAL GERAL" valor={fmtCacCents(calc.cacTotalGeral)} cor="var(--warning-strong)" bg="var(--warning-bg)" />
      </div>

      <Secao titulo="CAC por Canal">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", backgroundColor: "var(--surface-2)" }}>
                <th style={{ ...th, textAlign: "left" }}>Canal</th>
                <th style={{ ...th, textAlign: "right" }}>Leads totais</th>
                <th style={{ ...th, textAlign: "right" }}>Inviáveis</th>
                <th style={{ ...th, textAlign: "right" }}>Leads aptos</th>
                <th style={{ ...th, textAlign: "right" }}>Vendas</th>
                <th style={{ ...th, textAlign: "right" }}>Conversão</th>
                <th style={{ ...th, textAlign: "right" }}>Investimento</th>
                <th style={{ ...th, textAlign: "right" }}>CAC canal</th>
                <th style={{ ...th, textAlign: "right" }}>+ CAC equipe</th>
                <th style={{ ...th, textAlign: "right" }}>CAC total</th>
              </tr>
            </thead>
            <tbody>
              {calc.linhas.map((l, i) => (
                <tr key={l.canal} style={{ borderBottom: "1px solid var(--border)", backgroundColor: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                  <td style={{ padding: "8px", fontWeight: 600 }}>{ORIGEM_LABEL[l.canal] ?? l.canal}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>{l.leadsTotais}</td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--danger)" }}>{l.inviaveis || "—"}</td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--indigo)" }}>{l.leadsAptos}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "var(--success)" }}>{l.vendas}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>{l.conversao === null ? "—" : fmtPctRaw(l.conversao)}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    <input
                      value={invest[l.canal] ?? ""}
                      onChange={(e) => setInvest((p) => ({ ...p, [l.canal]: e.target.value }))}
                      placeholder="0,00"
                      style={inputStyle}
                      inputMode="decimal"
                    />
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--info)" }}>{fmtCacCents(l.cacCanal)}</td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--indigo)" }}>{fmtCacCents(l.cacEquipe)}</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "var(--warning-strong)" }}>{fmtCacCents(l.cacTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border)", backgroundColor: "var(--surface-2)", fontWeight: 700 }}>
                <td style={{ padding: "8px" }}>Total</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{calc.totLeads}</td>
                <td style={{ padding: "8px", textAlign: "right", color: "var(--danger)" }}>{calc.totInv || "—"}</td>
                <td style={{ padding: "8px", textAlign: "right", color: "var(--indigo)" }}>{calc.totAptos}</td>
                <td style={{ padding: "8px", textAlign: "right", color: "var(--success)" }}>{calc.totalVendas}</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{calc.totAptos > 0 ? fmtPctRaw((calc.totalVendas / calc.totAptos) * 100) : "—"}</td>
                <td style={{ padding: "8px", textAlign: "right", color: "var(--info)" }}>{fmtBRL(calc.investTotal / 100)}</td>
                <td style={{ padding: "8px", textAlign: "right" }} />
                <td style={{ padding: "8px", textAlign: "right" }} />
                <td style={{ padding: "8px", textAlign: "right", color: "var(--warning-strong)" }}>{fmtCacCents(calc.cacTotalGeral)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
          <button
            onClick={salvar}
            disabled={saving}
            style={{ padding: "8px 18px", backgroundColor: saving ? "var(--fg-subtle)" : "var(--accent)", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Salvando..." : "Salvar investimentos e custo"}
          </button>
          {msg && <span style={{ fontSize: 13, color: msg.includes("✓") ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>{msg}</span>}
        </div>

        <p style={{ fontSize: 11, color: "var(--fg-subtle)", marginTop: 12, lineHeight: 1.5 }}>
          Leads aptos = leads totais − inviáveis (região, porte e inadimplência). Conversão = vendas ÷ leads aptos.
          CAC do canal = investimento ÷ vendas do canal. CAC equipe = custo da equipe comercial ÷ total de vendas
          (mesmo valor para todo canal). CAC total = CAC do canal + CAC equipe.
        </p>
      </Secao>
    </div>
  );
}
