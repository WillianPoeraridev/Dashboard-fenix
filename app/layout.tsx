import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "./navbar";

export const metadata: Metadata = {
  title: "Fênix Dashboard",
  description: "Dashboard Gerencial — Fênix Internet",
};

// Define a classe .dark antes da primeira pintura, evitando flash de tema.
const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);var t=m?m[1]:localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, sans-serif", backgroundColor: "var(--bg)", color: "var(--fg)" }}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}