"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const COMERCIAL = "https://comercial.crm-operacional.com.br";
const RETENCAO = "https://retencao.crm-operacional.com.br";

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading" || !session || pathname === "/login") return null;

  const primeiroNome = session.user?.name?.split(" ")[0] ?? session.user?.name;

  return (
    <nav style={{
      backgroundColor: "#1e2530",
      borderBottom: "1px solid #2a3340",
      padding: "0 40px",
      height: 52,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 40,
    }}>
      {/* Esquerda: logo + páginas do app */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: 14, color: "#fff", letterSpacing: "-0.01em", textDecoration: "none" }}>
          Fênix Dashboard
        </Link>
        <div style={{ display: "flex", gap: 2 }}>
          <NavLink href="/" atual={pathname === "/"}>Painel</NavLink>
        </div>
      </div>

      {/* Direita: navegação entre apps (fixa) + usuário */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", gap: 2 }}>
          <SsoLink to={COMERCIAL}>Comercial</SsoLink>
          <SsoLink to={RETENCAO}>Retenção</SsoLink>
        </div>
        <div style={{ width: 1, height: 24, backgroundColor: "#2a3340" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", backgroundColor: "#f97316", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
          }}>
            {primeiroNome?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>{primeiroNome}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, backgroundColor: "rgba(249,115,22,0.1)", color: "#f97316",
            padding: "2px 7px", borderRadius: 20, letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            Gerente
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            padding: "5px 12px", border: "1px solid #374151", borderRadius: 6, background: "transparent",
            color: "#9ca3af", cursor: "pointer", fontSize: 12, fontWeight: 500,
          }}
        >
          Sair
        </button>
      </div>
    </nav>
  );
}

function NavLink({ href, atual, children }: { href: string; atual: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      padding: "5px 12px", borderRadius: 6, fontSize: 13,
      fontWeight: atual ? 600 : 400, color: atual ? "#fff" : "#9ca3af",
      backgroundColor: atual ? "rgba(255,255,255,0.08)" : "transparent", textDecoration: "none",
    }}>
      {children}
    </Link>
  );
}

function SsoLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <a
      href={`/api/sso/start?to=${encodeURIComponent(to)}`}
      style={{
        padding: "5px 12px", borderRadius: 6, fontSize: 13, fontWeight: 500,
        color: "#f97316", backgroundColor: "rgba(249,115,22,0.1)", textDecoration: "none",
        display: "inline-flex", alignItems: "center", gap: 4,
      }}
    >
      {children}
      <span style={{ fontSize: 10, opacity: 0.7 }}>→</span>
    </a>
  );
}
