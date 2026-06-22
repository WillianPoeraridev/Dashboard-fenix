"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { TabGeral } from "./components/tab-geral";
import { TabComercial } from "./components/tab-comercial";
import { TabRetencao } from "./components/tab-retencao";
import { TabMarketing } from "./components/tab-marketing";

type Aba = "geral" | "comercial" | "retencao" | "marketing";

const ABAS: { id: Aba; label: string }[] = [
  { id: "geral", label: "Visão Geral" },
  { id: "comercial", label: "Comercial" },
  { id: "retencao", label: "Retenção" },
  { id: "marketing", label: "Marketing / CAC" },
];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("geral");
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ color: "#6b7280" }}>Carregando...</p>
      </main>
    );
  }
  if (!session) return null;

  return (
    <main style={{ padding: "24px 40px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📊 Dashboard Fênix</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}>
            {[2024, 2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 20 }}>
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              padding: "9px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 14,
              fontWeight: aba === a.id ? 700 : 500, color: aba === a.id ? "#f97316" : "#6b7280",
              borderBottom: aba === a.id ? "2px solid #f97316" : "2px solid transparent", marginBottom: -1,
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === "geral" && <TabGeral ano={ano} mes={mes} />}
      {aba === "comercial" && <TabComercial ano={ano} mes={mes} />}
      {aba === "retencao" && <TabRetencao ano={ano} mes={mes} />}
      {aba === "marketing" && <TabMarketing ano={ano} mes={mes} />}
    </main>
  );
}
