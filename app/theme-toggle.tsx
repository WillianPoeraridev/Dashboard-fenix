"use client";

import { useEffect, useState } from "react";

// Botão de tema (claro/escuro). Aplica a classe .dark no <html> e persiste em
// localStorage. O flash inicial é evitado pelo script inline no layout, que já
// define a classe antes da primeira pintura; aqui só sincronizamos o ícone.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    const theme = next ? "dark" : "light";
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* localStorage indisponível (modo privado) */
    }
    try {
      // Cookie no domínio-pai compartilha o tema entre os 3 apps (subdomínios de
      // crm-operacional.com.br). Em outros hosts (ex: *.vercel.app) vira host-only.
      const base = "crm-operacional.com.br";
      const dom = location.hostname.endsWith(base) ? `; domain=.${base}` : "";
      document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax${dom}`;
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        border: "1px solid #374151",
        borderRadius: 6,
        background: "transparent",
        color: "#9ca3af",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {dark ? <IconeSol /> : <IconeLua />}
    </button>
  );
}

function IconeLua() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconeSol() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
