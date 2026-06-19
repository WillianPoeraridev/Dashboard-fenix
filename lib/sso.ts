import crypto from "crypto";

// SSO por "passe": token HMAC de curta duração, compartilhado entre os apps Fênix.
// Espelhado em crm-comercial-fenix/lib/sso.ts e crm-retencao-fenix/lib/sso.ts — manter sincronizado.

const SECRET = process.env.SSO_SECRET ?? "";
const VALIDADE_MS = 60_000; // 1 minuto

export const APPS = {
  comercial: "https://crm-comercial-fenix.vercel.app",
  retencao: "https://crm-retencao-fenix.vercel.app",
  dashboard: "https://fenix-dashboard-murex.vercel.app",
} as const;

export function urlPermitida(to: string): boolean {
  return Object.values(APPS).some((u) => to === u || to.startsWith(u + "/"));
}

export interface PassePayload {
  email: string;
  name: string;
  exp: number;
}

export function gerarPasse(email: string, name: string): string {
  const payload: PassePayload = { email, name, exp: Date.now() + VALIDADE_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function validarPasse(token: string | null): PassePayload | null {
  if (!SECRET || !token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const esperado = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as PassePayload;
    if (!payload.email || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
