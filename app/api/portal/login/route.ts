import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { gerarPasse, APPS } from "@/lib/sso";

// Portal de login central (raiz crm-operacional.com.br).
// Valida a credencial contra as 3 tabelas de usuário, com prioridade
// gerência (public.User) > Comercial > Retenção, e roteia pro setor:
//  - gerência  -> cria a sessão local do Dashboard e fica aqui.
//  - vendedor  -> gera um "passe" SSO e manda pro Comercial (/api/sso/enter).
//  - atendente -> idem pro Retenção.
// Só LÊ do banco (findUnique) e seta cookie. Nenhuma escrita.
export async function POST(req: Request) {
  let email = "";
  let senha = "";
  try {
    const body = await req.json();
    email = (body.email ?? "").trim().toLowerCase();
    senha = body.senha ?? "";
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!email || !senha) {
    return NextResponse.json({ error: "Informe email e senha." }, { status: 400 });
  }

  // 1. Gerência (public.User) — prioridade máxima.
  const gerente = await prisma.user.findUnique({ where: { email } });
  if (gerente && (await bcrypt.compare(senha, gerente.passwordHash))) {
    const maxAge = 30 * 24 * 60 * 60;
    const sessionToken = await encode({
      token: {
        id: gerente.id,
        role: gerente.role,
        name: gerente.name,
        email: gerente.email,
        sub: gerente.id,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge,
    });
    const isProd = process.env.NODE_ENV === "production";
    const cookieName = isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token";
    const res = NextResponse.json({ redirect: "/" });
    res.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return res;
  }

  // 2. Comercial — vendedor/admin ativo.
  const vendedor = await prisma.comercialUser.findUnique({ where: { email } });
  if (vendedor && vendedor.isActive && (await bcrypt.compare(senha, vendedor.passwordHash))) {
    const passe = gerarPasse(vendedor.email, vendedor.name);
    return NextResponse.json({
      redirect: `${APPS.comercial}/api/sso/enter?passe=${encodeURIComponent(passe)}`,
    });
  }

  // 3. Retenção — atendente/admin ativo.
  const atendente = await prisma.retencaoUser.findUnique({ where: { email } });
  if (atendente && atendente.isActive && (await bcrypt.compare(senha, atendente.passwordHash))) {
    const passe = gerarPasse(atendente.email, atendente.name);
    return NextResponse.json({
      redirect: `${APPS.retencao}/api/sso/enter?passe=${encodeURIComponent(passe)}`,
    });
  }

  return NextResponse.json({ error: "Email ou senha inválidos." }, { status: 401 });
}
