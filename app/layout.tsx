import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fênix Dashboard",
  description: "Dashboard Gerencial — Fênix Internet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, sans-serif", backgroundColor: "#f3f4f6", color: "#111827" }}>
        {children}
      </body>
    </html>
  );
}