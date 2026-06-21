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
// Só LÊ do banco (findUnique) e seta cookie. Nenhuma escrita (exceto o
// registro de tentativas falhas pro rate limiting, abaixo).

// Rate limiting (anti força-bruta): conta só tentativas que FALHARAM, por
// IP+email, numa janela curta. Quem acerta a senha nunca é contado, então
// usuário legítimo nunca é bloqueado. Tudo fail-open: se o controle der erro,
// o login segue normal (um bug aqui jamais tranca ninguém).
const RL_LIMIT = 15;
const RL_WINDOW_MS = 10 * 60 * 1000; // 10 minutos

function getIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

async function registrarFalha(key: string) {
  try {
    await prisma.loginAttempt.create({ data: { key } });
    // Limpeza oportunista (5% das vezes) pra tabela não crescer indefinidamente.
    if (Math.random() < 0.05) {
      await prisma.loginAttempt.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      });
    }
  } catch (e) {
    console.error("[portal] falha ao registrar tentativa (fail-open)", e);
  }
}

export async function POST(req: Request) {
  let email = "";
  let senha = "";
  try {
    const body = await req.json();
    // Não normalizamos o case: os emails no banco têm capitalização variada
    // (ex: "Marcelo@fenixfibra.com") e o findUnique é case-sensitive — igual ao
    // login direto dos CRMs. Só removemos espaços acidentais.
    email = (body.email ?? "").trim();
    senha = body.senha ?? "";
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!email || !senha) {
    return NextResponse.json({ error: "Informe email e senha." }, { status: 400 });
  }

  const key = `${getIp(req)}|${email.slice(0, 120)}`;

  // Rate limiting (fail-open).
  try {
    const desde = new Date(Date.now() - RL_WINDOW_MS);
    const falhas = await prisma.loginAttempt.count({ where: { key, createdAt: { gt: desde } } });
    if (falhas >= RL_LIMIT) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
        { status: 429 },
      );
    }
  } catch (e) {
    console.error("[portal] checagem de rate limit falhou (fail-open)", e);
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

  // Credencial inválida → registra a falha (pro rate limiting) e responde 401.
  await registrarFalha(key);
  return NextResponse.json({ error: "Email ou senha inválidos." }, { status: 401 });
}
