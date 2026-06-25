"use client";

import { useState, useEffect } from "react";
import type { RetencaoResumo } from "@/lib/retencao-metricas";
import { fmtBRL, fmtPctRaw, shortName } from "@/lib/format";
import { MOTIVO_LABEL, REGIAO_LABEL } from "@/lib/labels";
import { Secao, CardTopo, Carregando, SemDados } from "./ui";

export function TabRetencao({ ano, mes }: { ano: number; mes: number }) {
  const [resumo, setResumo] = useState<RetencaoResumo | null>(null);
  const [temComp, setTemComp] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/retencao?ano=${ano}&mes=${mes}`)
      .then((r) => r.json())
      .then((d) => { setResumo(d.resumo); setTemComp(d.temCompetencia); })
      .finally(() => setLoading(false));
  }, [ano, mes]);

  if (loading) return <Carregando />;
  if (!temComp || !resumo) return <SemDados texto="Nenhuma competência de retenção cadastrada para este mês." />;

  const r = resumo;
  const pctRet = (n: number, total: number) => (total > 0 ? fmtPctRaw((n / total) * 100) : "0,00%");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Cards topo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
        <CardTopo label="Cancelados" valor={String(r.totalCancelados)} cor="var(--danger)" />
        <CardTopo label="Retidos" valor={String(r.totalRetidos)} cor="var(--success)" />
        <CardTopo label="Inadimplência" valor={String(r.totalInadimplencia)} cor="var(--warning-strong)" />
        <CardTopo label="Total Empresa" valor={String(r.totalEmpresa)} />
        <CardTopo label="Taxa de Retenção" valor={fmtPctRaw(r.taxaRetencao)} cor="var(--info-strong)" />
        <CardTopo label="Saldo" valor={String(r.saldo)} cor={r.saldo >= 0 ? "var(--success)" : "var(--danger)"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Secao titulo="Indicadores da Competência">
            <LinhaInfo label="Realizado orgânico" valor={String(r.totalCancelados)} />
            <LinhaInfo label="Realizado inadimplência" valor={String(r.totalInadimplencia)} />
            <LinhaInfo label="Total empresa" valor={String(r.totalEmpresa)} destaque />
            <LinhaInfo label="Saldo" valor={String(r.saldo)} cor={r.saldo >= 0 ? "var(--success)" : "var(--danger)"} />
            {r.diasRestantes > 0 && <LinhaInfo label="Dias restantes" valor={String(r.diasRestantes)} />}
            {r.metaRecalculada !== null && (
              <LinhaInfo label="Meta recalculada" valor={String(r.metaRecalculada)} cor={r.metaRecalculada <= 0 ? "var(--success)" : "var(--warning-strong)"} />
            )}
            {r.churnGeral !== null && (
              <LinhaInfo label="Churn geral fulltime" valor={fmtPctRaw(r.churnGeral * 100)} />
            )}
            {(r.mrrCanceladoCents > 0 || r.mrrRetidoCents > 0) && (
              <>
                <LinhaInfo label="MRR perdido (cancelados)" valor={fmtBRL(r.mrrCanceladoCents / 100)} cor="var(--danger)" />
                <LinhaInfo label="MRR retido" valor={fmtBRL(r.mrrRetidoCents / 100)} cor="var(--success)" />
                {r.ticketMedioCanceladoCents !== null && <LinhaInfo label="Ticket médio cancelado" valor={fmtBRL(r.ticketMedioCanceladoCents / 100)} />}
                {r.ticketMedioRetidoCents !== null && <LinhaInfo label="Ticket médio retido" valor={fmtBRL(r.ticketMedioRetidoCents / 100)} />}
              </>
            )}
          </Secao>

          <Secao titulo={`Motivos de Cancelamento (${r.totalCancelados} cancelados)`}>
            {r.motivos.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--fg-subtle)" }}>Nenhum cancelamento registrado.</p>
            ) : (
              r.motivos.map((m) => (
                <div key={m.motivo} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--fg-secondary)" }}>{MOTIVO_LABEL[m.motivo] ?? m.motivo}</span>
                  <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>{m.count} <span style={{ color: "var(--fg-subtle)" }}>({pctRet(m.count, r.totalCancelados)})</span></span>
                </div>
              ))
            )}
          </Secao>
        </div>

        <Secao titulo="Ranking por Atendente">
          {r.atendentes.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--fg-subtle)" }}>Nenhum registro ainda.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "6px 8px", color: "var(--fg-muted)", fontWeight: 600 }}>Atendente</th>
                  <th style={{ padding: "6px 8px", color: "var(--fg-muted)", fontWeight: 600, textAlign: "right" }}>Total</th>
                  <th style={{ padding: "6px 8px", color: "var(--fg-muted)", fontWeight: 600, textAlign: "right" }}>Cancel.</th>
                  <th style={{ padding: "6px 8px", color: "var(--fg-muted)", fontWeight: 600, textAlign: "right" }}>Retidos</th>
                  <th style={{ padding: "6px 8px", color: "var(--fg-muted)", fontWeight: 600, textAlign: "right" }}>Tx. Ret.</th>
                  <th style={{ padding: "6px 8px", color: "var(--fg-muted)", fontWeight: 600, textAlign: "right" }}>MRR Perdido</th>
                  <th style={{ padding: "6px 8px", color: "var(--fg-muted)", fontWeight: 600, textAlign: "right" }}>Proj. Comissão</th>
                </tr>
              </thead>
              <tbody>
                {r.atendentes.map((a, i) => (
                  <tr key={a.nome + i} style={{ borderBottom: "1px solid var(--border)", backgroundColor: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                    <td style={{ padding: "8px", fontWeight: 600, color: "var(--fg)" }}>{shortName(a.nome)}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "var(--fg-secondary)" }}>{a.total}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "var(--danger)" }}>{a.cancelados}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "var(--success)" }}>{a.retidos}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "var(--fg-secondary)" }}>{fmtPctRaw(a.txRetencao)}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: a.mrrPerdidoCents > 0 ? "var(--danger)" : "var(--fg-subtle)" }}>{a.mrrPerdidoCents > 0 ? fmtBRL(a.mrrPerdidoCents / 100) : "—"}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "var(--success)", fontWeight: 600 }}>{a.projComissaoCents !== null ? fmtBRL(a.projComissaoCents / 100) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Secao>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Secao titulo="Cancelamentos por Região">
          {r.porRegiao.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--fg-subtle)" }}>Nenhum registro ainda.</p>
          ) : (
            r.porRegiao.map((x) => (
              <div key={x.regiao} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{REGIAO_LABEL[x.regiao] ?? x.regiao}</span>
                <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
                  <span style={{ color: "var(--danger)", fontWeight: 600 }}>{x.cancelados} cancel.</span>
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>{x.retidos} retidos</span>
                  {x.inadimplencia > 0 && <span style={{ color: "var(--warning-strong)" }}>{x.inadimplencia} inadimpl.</span>}
                  <span style={{ color: "var(--fg-muted)" }}>{pctRet(x.retidos, x.cancelados + x.retidos)} ret.</span>
                </div>
              </div>
            ))
          )}
        </Secao>

        <Secao titulo={`Cancelamentos por Cidade (${r.porCidade.length})`}>
          {r.porCidade.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--fg-subtle)" }}>Nenhum cancelamento registrado.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "5px 8px", color: "var(--fg-muted)", fontWeight: 600 }}>Cidade</th>
                  <th style={{ padding: "5px 8px", color: "var(--fg-muted)", fontWeight: 600, textAlign: "right" }}>Cancel.</th>
                  <th style={{ padding: "5px 8px", color: "var(--fg-muted)", fontWeight: 600, textAlign: "right" }}>Retidos</th>
                  <th style={{ padding: "5px 8px", color: "var(--fg-muted)", fontWeight: 600, textAlign: "right" }}>Tx. Ret.</th>
                </tr>
              </thead>
              <tbody>
                {r.porCidade.map((c, i) => (
                  <tr key={c.nome} style={{ borderBottom: "1px solid var(--border)", backgroundColor: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)" }}>
                    <td style={{ padding: "7px 8px", fontWeight: 600 }}>{c.nome}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: "var(--danger)", fontWeight: 700 }}>{c.cancelados}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: "var(--success)" }}>{c.retidos}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", color: "var(--fg-secondary)" }}>{pctRet(c.retidos, c.cancelados + c.retidos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Secao>
      </div>
    </div>
  );
}

function LinhaInfo({ label, valor, cor = "var(--fg)", destaque = false }: { label: string; valor: string; cor?: string; destaque?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", backgroundColor: destaque ? "var(--highlight-bg)" : "transparent" }}>
      <span style={{ fontSize: 13, color: "var(--fg-secondary)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: destaque ? 700 : 600, color: cor }}>{valor}</span>
    </div>
  );
}
