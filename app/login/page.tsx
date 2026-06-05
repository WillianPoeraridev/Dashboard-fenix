"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setErro("Email ou senha inválidos");
    } else {
      router.push("/");
    }
  }

  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#0f172a" }}>
      <form onSubmit={handleSubmit} style={{ backgroundColor: "#1e293b", padding: 40, borderRadius: 12, width: "100%", maxWidth: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
        <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>Dashboard Fênix</h1>
        <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", marginBottom: 24 }}>Acesso restrito à gerência</p>

        {erro && <div style={{ padding: "8px 12px", marginBottom: 16, backgroundColor: "#7f1d1d", border: "1px solid #991b1b", borderRadius: 6, color: "#fca5a5", fontSize: 13 }}>{erro}</div>}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: "#cbd5e1", fontSize: 13, marginBottom: 4 }}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #334155", borderRadius: 6, backgroundColor: "#0f172a", color: "#f1f5f9", fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", color: "#cbd5e1", fontSize: 13, marginBottom: 4 }}>Senha</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #334155", borderRadius: 6, backgroundColor: "#0f172a", color: "#f1f5f9", fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <button type="submit" disabled={loading} style={{
          width: "100%", padding: "10px 0", border: "none", borderRadius: 6,
          backgroundColor: loading ? "#475569" : "#3b82f6", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
        }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}