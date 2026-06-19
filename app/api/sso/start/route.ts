import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { gerarPasse, urlPermitida } from "@/lib/sso";

// Gera um passe da sessão atual e redireciona pro app de destino.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to");

  const session = await getServerSession(authOptions);
  const email = (session?.user as { email?: string } | undefined)?.email;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const name = (session?.user as { name?: string } | undefined)?.name;

  if (!email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (role !== "ADMIN" && role !== "GERENTE") {
    return NextResponse.redirect(new URL("/?sso=forbidden", req.url));
  }
  if (!to || !urlPermitida(to)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const passe = gerarPasse(email, name ?? "");
  const destino = new URL("/api/sso/enter", to);
  destino.searchParams.set("passe", passe);
  return NextResponse.redirect(destino.toString());
}
