// app/register/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const GLASS  = "bg-white/60 backdrop-blur-md border border-blue-100 shadow-lg shadow-blue-900/10 rounded-2xl";
const INP    = "w-full px-4 py-3 rounded-xl bg-white/70 border border-blue-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60";

export default function Register() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      await setDoc(doc(db, "users", user.uid), { email, displayName: name, createdAt: serverTimestamp() });
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e.code === "auth/email-already-in-use" ? "Este email já está em uso." : "Erro ao criar conta.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className={`${GLASS} p-10 max-w-sm w-full`}>
        <h1 className="text-2xl font-semibold text-slate-800 mb-1">Criar conta</h1>
        <p className="text-sm text-blue-700/60 mb-6">Começa a criar a tua lista.</p>
        <div className="flex flex-col gap-3">
          <input placeholder="O teu nome" value={name} onChange={e => setName(e.target.value)} className={INP} />
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className={INP} />
          <input type="password" placeholder="Palavra-passe" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()} className={INP} />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={submit} disabled={loading}
            className="py-3 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40">
            {loading ? "A criar conta…" : "Criar conta"}
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-5">
          Já tens conta?{" "}
          <Link href="/login" className="text-blue-700 underline underline-offset-2">Iniciar sessão</Link>
        </p>
      </div>
    </main>
  );
}