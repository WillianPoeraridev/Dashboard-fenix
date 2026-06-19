import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { validarPasse } from "@/lib/sso";

// Consome um passe vindo de outro app Fênix e cria a sessão local (sem senha).
// Dashboard é só gerência (role GERENTE/ADMIN); a tabela User aqui não tem isActive.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const payload = validarPasse(searchParams.get("passe"));
  if (!payload) {
    return NextResponse.redirect(new URL("/login?sso=invalido", req.url));
  }

  const user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user || (user.role !== "GERENTE" && user.role !== "ADMIN")) {
    return NextResponse.redirect(new URL("/login?sso=negado", req.url));
  }

  const maxAge = 30 * 24 * 60 * 60;
  const sessionToken = await encode({
    token: { id: user.id, role: user.role, name: user.name, email: user.email, sub: user.id },
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge,
  });

  const isProd = process.env.NODE_ENV === "production";
  const cookieName = isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
