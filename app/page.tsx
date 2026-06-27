// app/page.tsx

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/lib/auth-context";

const GLASS  = "bg-white/60 backdrop-blur-md border border-blue-100 shadow-lg shadow-blue-900/10 rounded-2xl";

export default function Home() {
  const user   = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && user !== "loading") router.replace("/dashboard");
  }, [user, router]);

  if (user === "loading" || (user && user !== "loading")) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className={`${GLASS} p-10 max-w-md w-full text-center`}>
        <div className="w-14 h-14 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-2xl mx-auto mb-5">🎁</div>
        <h1 className="text-3xl font-semibold text-slate-800 mb-2">Lista de Presentes</h1>
        <p className="text-sm text-blue-700/70 mb-8">Cria eventos, gere presentes e partilha com os teus convidados.</p>
        <div className="flex flex-col gap-3">
          <Link href="/register" className="py-3 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 transition-colors">
            Criar conta
          </Link>
          <Link href="/login" className="py-3 rounded-xl border border-white/20 text-sm text-slate-700 hover:bg-blue-50 transition-colors">
            Iniciar sessão
          </Link>
        </div>
      </div>
    </main>
  );
}