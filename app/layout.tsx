// app/layout.tsx

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lista de Presentes",
  description: "Cria e partilha listas de presentes para os teus eventos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={geist.className}>
        <AuthProvider>
          <div className="relative min-h-screen antialiased bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 overflow-hidden">
            <div className="pointer-events-none fixed inset-0 z-0">
              <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-200/40 blur-3xl" />
              <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-sky-200/30 blur-3xl" />
              <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-indigo-100/40 blur-3xl" />
            </div>
            <div className="relative z-10">{children}</div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}