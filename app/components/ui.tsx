"use client";

import React from "react";

// Componentes visuais compartilhados pelas abas do dashboard. Estilo inline,
// alinhado ao padrão dos CRMs (cards e seções com borda + cabeçalho cinza).

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", backgroundColor: "var(--surface)" }}>
      <div style={{ backgroundColor: "var(--surface-2)", padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)" }}>{titulo}</span>
      </div>
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  );
}

export function CardTopo({ label, valor, cor = "var(--fg)", bg, subtexto }: { label: string; valor: string; cor?: string; bg?: string; subtexto?: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", backgroundColor: bg || "var(--surface)" }}>
      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: cor }}>{valor}</div>
      {subtexto && <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: cor }}>{subtexto}</div>}
    </div>
  );
}

export function Carregando() {
  return <p style={{ color: "var(--fg-muted)", fontSize: 14, padding: "24px 0" }}>Carregando...</p>;
}

export function SemDados({ texto }: { texto: string }) {
  return (
    <div style={{ marginTop: 16, padding: 18, border: "1px dashed var(--border-strong)", borderRadius: 8, textAlign: "center", color: "var(--fg-muted)", fontSize: 14 }}>
      {texto}
    </div>
  );
}
