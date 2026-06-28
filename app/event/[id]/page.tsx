// app/event/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc, getDoc, collection, query, where,
  onSnapshot, addDoc, updateDoc, increment,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import Linkify from "linkify-react";

type Event        = { title: string; date: Timestamp; place: string; ownerId: string; description?: string };
type Gift         = { id: string; name: string; imageUrl?: string; price: number; notes?: string; amountPledged: number; fullyFunded: boolean };
type Contribution = { id: string; giftId: string; guestName: string | null; amount: number; type: "full" | "partial"; createdAt: Timestamp };
type LocalPledge  = { contributionId: string; giftId: string; giftName: string; amount: number };

const GLASS  = "bg-white/60 backdrop-blur-md border border-blue-100 shadow-lg shadow-blue-900/10 rounded-2xl";
const GLASS2 = "bg-white/40 backdrop-blur-sm border border-blue-100/80 rounded-xl";
const INP    = "w-full px-4 py-3 rounded-xl bg-white/70 border border-blue-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60";
const LS_KEY = (id: string) => `pledges_${id}`;

// money formatting
const fmt = (n: number) => n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

function PledgeModal({ gift, onClose, onConfirm }: {
  gift: Gift;
  onClose: () => void;
  onConfirm: (amount: number, name: string, type: "full" | "partial") => Promise<void>;
}) {
  const [step, setStep]       = useState<"choose" | "partial" | "thanks">("choose");
  const [amount, setAmount]   = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const remaining = gift.price - gift.amountPledged;

  const submit = async (val: number, type: "full" | "partial") => {
    setLoading(true);
    await onConfirm(val, name, type);
    setLoading(false);
    setStep("thanks");
  };

  return (
    <div className="fixed inset-0 bg-slate-800/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${GLASS} p-8 w-full max-w-sm`}>
        {step === "choose" && (
          <>
            <h2 className="text-xl font-semibold text-slate-800 mb-1">{gift.name}</h2>
            <p className="text-sm text-slate-500 mb-4">
              Restam <span className="font-medium text-blue-700">{fmt(remaining)}</span> por cobrir
            </p>
            <input
              placeholder="O teu nome (opcional)"
              value={name} onChange={e => setName(e.target.value)}
              className={`${INP} mb-4`}
            />
            <div className="flex flex-col gap-3">
              <button onClick={() => submit(remaining, "full")} disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 transition-colors">
                Comprar por inteiro — {fmt(remaining)}
              </button>
              <button onClick={() => setStep("partial")}
                className="w-full py-3 rounded-xl border border-blue-200 text-sm text-slate-700 bg-white hover:bg-blue-50 transition-colors">
                Contribuir parcialmente
              </button>
            </div>
            <button onClick={onClose} className="mt-4 text-xs text-slate-400 hover:text-slate-600 w-full text-center transition-colors">Cancelar</button>
          </>
        )}

        {step === "partial" && (
          <>
            <h2 className="text-xl font-semibold text-slate-800 mb-5">Quanto queres contribuir?</h2>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
              <input type="number" min="1" max={remaining} placeholder="0,00"
                value={amount} onChange={e => setAmount(e.target.value)}
                className={`${INP} pl-7`} />
            </div>
            <input placeholder="O teu nome (opcional)" value={name} onChange={e => setName(e.target.value)}
              className={`${INP} mb-4`} />
            <button
              onClick={() => { const v = parseFloat(amount); if (v > 0 && v <= remaining) submit(v, "partial"); }}
              disabled={loading || !amount}
              className="w-full py-3 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40">
              {loading ? "A guardar…" : "Confirmar contribuição"}
            </button>
            <button onClick={() => setStep("choose")} className="mt-3 text-xs text-slate-400 hover:text-blue-700 w-full text-center transition-colors">Voltar</button>
          </>
        )}

        {step === "thanks" && (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">🎁</div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Obrigado{name ? `, ${name}` : ""}!</h2>
            <p className="text-sm text-blue-700/70 mb-6">A tua contribuição foi registada com sucesso.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 transition-colors">
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GiftCard({ gift, isOwner, onPledge }: {
  gift: Gift;
  isOwner: boolean;
  onPledge: (gift: Gift) => void;
}) {
  const pct = Math.min((gift.amountPledged / gift.price) * 100, 100);

  return (
    <article className={`${GLASS} overflow-hidden flex flex-col`}>
      {gift.imageUrl && (
        <img src={gift.imageUrl} alt={gift.name} className="w-full h-44 object-cover"
          onError={e => (e.currentTarget.style.display = "none")} />
      )}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-slate-800">{gift.name}</h3>
            {gift.notes && (
              <p className="text-xs text-slate-400 mt-0.5">
                <Linkify 
                  options={{ 
                    target: '_blank', 
                    rel: 'noopener noreferrer',
                    className: 'text-blue-500 hover:underline cursor-pointer' // Tailwind styles for your links
                  }}
                >
                  {gift.notes}
                </Linkify>
              </p>
            )}
          </div>
          <span className="text-sm font-semibold text-blue-700 shrink-0">{fmt(gift.price)}</span>
        </div>
        <div>
          <div className="h-1.5 bg-blue-50/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-400">{fmt(gift.amountPledged)} prometido</span>
            <span className="text-xs text-slate-400">{Math.round(pct)}%</span>
          </div>
        </div>
        {!isOwner && (
          gift.fullyFunded
            ? <span className="text-xs text-center text-slate-400 py-2 border border-blue-100 rounded-xl">Já está coberto ✓</span>
            : <button onClick={() => onPledge(gift)}
                className="w-full py-2.5 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 transition-colors mt-auto">
                Oferecer / Contribuir
              </button>
        )}
      </div>
    </article>
  );
}

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser]                 = useState<User | null | "loading">("loading");
  const [event, setEvent]               = useState<Event | null>(null);
  const [gifts, setGifts]               = useState<Gift[]>([]);
  const [contribs, setContribs]         = useState<Contribution[]>([]);
  const [tab, setTab]                   = useState<"lista" | "contribuicoes">("lista");
  const [pledging, setPledging]         = useState<Gift | null>(null);
  const [localPledges, setLocalPledges] = useState<LocalPledge[]>([]);

  useEffect(() => onAuthStateChanged(auth, u => setUser(u)), []);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "events", id)).then(s => s.exists() && setEvent(s.data() as Event));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "gifts"), where("eventId", "==", id));
    return onSnapshot(q, s => setGifts(s.docs.map(d => ({ id: d.id, ...d.data() } as Gift))));
  }, [id]);

  const isOwner = user !== "loading" && user !== null && event?.ownerId === (user as User).uid;

  useEffect(() => {
    if (!isOwner || !id) return;
    const q = query(collection(db, "contributions"), where("eventId", "==", id));
    return onSnapshot(q, s => setContribs(s.docs.map(d => ({ id: d.id, ...d.data() } as Contribution))));
  }, [isOwner, id]);

  useEffect(() => {
    if (user !== "loading" && user === null && id)
      setLocalPledges(JSON.parse(localStorage.getItem(LS_KEY(id)) || "[]"));
  }, [user, id]);

  const handlePledge = async (amount: number, guestName: string, type: "full" | "partial") => {
    if (!pledging) return;
    const ref = await addDoc(collection(db, "contributions"), {
      eventId: id, giftId: pledging.id,
      guestName: guestName || null, amount, type,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "gifts", pledging.id), {
      amountPledged: increment(amount),
      fullyFunded: pledging.amountPledged + amount >= pledging.price,
    });
    if (!isOwner && id) {
      const updated = [...localPledges, { contributionId: ref.id, giftId: pledging.id, giftName: pledging.name, amount }];
      localStorage.setItem(LS_KEY(id), JSON.stringify(updated));
      setLocalPledges(updated);
    }
  };

  if (!event) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400 text-sm">A carregar…</p>
    </main>
  );

  const eventDate = event.date instanceof Timestamp
    ? event.date.toDate().toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })
    : "";

  const TabBtn = ({ value, label }: { value: typeof tab; label: string }) => (
    <button onClick={() => setTab(value)}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
        tab === value ? "bg-blue-700 text-white" : "text-blue-700/60 hover:text-slate-700 hover:bg-blue-50/50"
      }`}>
      {label}
    </button>
  );

  return (
    <main className="min-h-screen p-6 md:p-12">
      <header className={`${GLASS} p-6 mb-8 max-w-3xl mx-auto`}>
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">{event.place} · {eventDate}</p>
        <h1 className="text-3xl font-semibold text-slate-800">{event.title}</h1>
        {event.description && (
          <p className="text-sm text-slate-500 mt-1">{event.description}</p>
        )}
        {isOwner && (
          <span className="mt-2 inline-block text-xs bg-blue-700 border border-blue-700 text-white px-2.5 py-1 rounded-full">
            Vista do anfitrião
          </span>
        )}
      </header>

      <div className="max-w-3xl mx-auto mb-6 flex gap-2">
        <TabBtn value="lista" label="Lista de presentes" />
        <TabBtn value="contribuicoes" label={isOwner ? "Todas as contribuições" : "As minhas contribuições"} />
      </div>

      <section className="max-w-3xl mx-auto">
        {tab === "lista" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gifts.length === 0
              ? <p className="text-slate-400 text-sm col-span-2 text-center py-12">Ainda não há presentes nesta lista.</p>
              : gifts.map(g => <GiftCard key={g.id} gift={g} isOwner={isOwner} onPledge={setPledging} />)
            }
          </div>
        )}

        {tab === "contribuicoes" && isOwner && (
          <div className={`${GLASS} overflow-hidden`}>
            {contribs.length === 0
              ? <p className="text-slate-400 text-sm text-center py-12">Ainda sem contribuições.</p>
              : <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blue-100">
                      {["Presente", "Convidado", "Valor", "Tipo"].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs text-slate-400 font-medium uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contribs.map(c => {
                      const g = gifts.find(g => g.id === c.giftId);
                      return (
                        <tr key={c.id} className="border-b border-blue-50 hover:bg-blue-50/50 transition-colors">
                          <td className="px-5 py-3 text-slate-700">{g?.name ?? "—"}</td>
                          <td className="px-5 py-3 text-blue-700/70">{c.guestName ?? <em className="text-slate-300">Anónimo</em>}</td>
                          <td className="px-5 py-3 font-medium text-slate-800">{fmt(c.amount)}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              c.type === "full"
                                ? "bg-blue-700 border border-blue-700 text-white"
                                : "border border-blue-100 text-blue-700"
                            }`}>
                              {c.type === "full" ? "Inteiro" : "Parcial"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            }
          </div>
        )}

        {tab === "contribuicoes" && !isOwner && (
          <div className="flex flex-col gap-3">
            {localPledges.length === 0
              ? <p className="text-slate-400 text-sm text-center py-12">Ainda não fizeste nenhuma contribuição nesta sessão.</p>
              : localPledges.map(p => (
                  <div key={p.contributionId} className={`${GLASS2} px-5 py-4 flex justify-between items-center`}>
                    <span className="text-sm text-slate-700">{p.giftName}</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(p.amount)}</span>
                  </div>
                ))
            }
          </div>
        )}
      </section>

      {pledging && (
        <PledgeModal
          gift={pledging}
          onClose={() => setPledging(null)}
          onConfirm={async (amount, name, type) => { await handlePledge(amount, name, type); }}
        />
      )}
    </main>
  );
}