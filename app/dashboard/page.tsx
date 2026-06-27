// app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "firebase/auth";
import {
  collection, query, where, onSnapshot,
  addDoc, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useUser } from "@/lib/auth-context";

const GLASS  = "bg-white/60 backdrop-blur-md border border-blue-100 shadow-lg shadow-blue-900/10 rounded-2xl";
const GLASS2 = "bg-white/40 backdrop-blur-sm border border-blue-100/80 rounded-xl";
const INP    = "w-full px-4 py-3 rounded-xl bg-white/70 border border-blue-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60";
const fmt    = (n: number) => n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

type Event = { id: string; title: string; date: Timestamp; place: string; description?: string };
type Gift  = { id: string; name: string; price: number; imageUrl?: string; notes?: string };

function AddGiftForm({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [name, setName]         = useState("");
  const [price, setPrice]       = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async () => {
    if (!name || !price) return;
    setLoading(true);
    await addDoc(collection(db, "gifts"), {
      eventId, name, price: parseFloat(price),
      imageUrl: imageUrl || null, notes: notes || null,
      amountPledged: 0, fullyFunded: false,
      createdAt: serverTimestamp(),
    });
    setName(""); setPrice(""); setImageUrl(""); setNotes("");
    setLoading(false);
    onDone();
  };

  return (
    <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-blue-100">
      <input placeholder="Nome do presente *" value={name} onChange={e => setName(e.target.value)} className={INP} />
      <input type="number" placeholder="Preço (€) *" value={price} onChange={e => setPrice(e.target.value)} className={INP} />
      <input placeholder="Link direto da imagem (.jpg, .png…)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className={INP} />
      <input placeholder="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)} className={INP} />
      {imageUrl && (
        <div className="rounded-xl overflow-hidden h-32 bg-white/5 border border-blue-100">
          <img src={imageUrl} alt="preview" className="w-full h-full object-cover"
            onError={e => (e.currentTarget.style.display = "none")} />
        </div>
      )}
      <button onClick={submit} disabled={loading || !name || !price}
        className="py-2.5 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40">
        {loading ? "A guardar…" : "Adicionar presente"}
      </button>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const [gifts, setGifts]       = useState<Gift[]>([]);
  const [showForm, setShowForm] = useState(false);
  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/event/${event.id}`;

  useEffect(() => {
    const q = query(collection(db, "gifts"), where("eventId", "==", event.id));
    return onSnapshot(q, s => setGifts(s.docs.map(d => ({ id: d.id, ...d.data() } as Gift))));
  }, [event.id]);

  return (
    <article className={`${GLASS} p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">{event.title}</h3>
          {event.description && <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>}
          <p className="text-xs text-blue-700 mt-0.5">
            {event.place} · {event.date.toDate().toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href={`/event/${event.id}`}
          className="text-xs border border-blue-700 px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-600/10 transition-colors shrink-0 ml-3">
          Ver página ↗
        </Link>
      </div>

      <div className={`${GLASS2} flex items-center gap-2 px-3 py-2`}>
        <span className="text-xs text-slate-400 truncate flex-1">{shareUrl}</span>
        <button onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="text-xs text-blue-700 hover:text-slate-800 shrink-0 transition-colors">Copiar</button>
      </div>

      {gifts.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {gifts.map(g => (
            <li key={g.id} className="flex justify-between text-sm py-1.5 border-b border-blue-100 last:border-0">
              <span className="text-slate-700">{g.name}</span>
              <span className="text-blue-700">{fmt(g.price)}</span>
            </li>
          ))}
        </ul>
      )}

      {showForm
        ? <AddGiftForm eventId={event.id} onDone={() => setShowForm(false)} />
        : <button onClick={() => setShowForm(true)}
            className="mt-3 w-full py-2 rounded-xl border border-dashed border-blue-700 text-xs text-blue-700 hover:bg-blue-50/50 transition-colors">
            + Adicionar presente
          </button>
      }
    </article>
  );
}

export default function Dashboard() {
  const user   = useUser();
  const router = useRouter();
  const [events, setEvents]           = useState<Event[]>([]);
  const [title, setTitle]             = useState("");
  const [date, setDate]               = useState("");
  const [place, setPlace]             = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (user === "loading") return;
    if (!user) { router.replace("/login"); return; }
    const q = query(collection(db, "events"), where("ownerId", "==", (user as any).uid));
    return onSnapshot(q, s => setEvents(s.docs.map(d => ({ id: d.id, ...d.data() } as Event))));
  }, [user, router]);

  const createEvent = async () => {
    if (!title || !date || !place || !user || user === "loading") return;
    setLoading(true);
    await addDoc(collection(db, "events"), {
      ownerId: (user as any).uid, title,
      date: Timestamp.fromDate(new Date(date)),
      place, description: description || null,
      createdAt: serverTimestamp(),
    });
    setTitle(""); setDate(""); setPlace(""); setDescription("");
    setLoading(false);
  };

  if (user === "loading") return null;

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Os meus eventos</h1>
            <p className="text-sm text-slate-400">{(user as any)?.displayName ?? (user as any)?.email}</p>
          </div>
          <button onClick={() => signOut(auth).then(() => router.replace("/"))}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-50/50">
            Sair
          </button>
        </header>

        <section className={`${GLASS} p-6 mb-6`}>
          <h2 className="text-sm font-medium text-blue-700 mb-4 uppercase tracking-widest">Criar evento</h2>
          <div className="flex flex-col gap-3">
            <input placeholder="Título do evento *" value={title} onChange={e => setTitle(e.target.value)} className={INP} />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${INP} [color-scheme:light]`} />
            <input placeholder="Local *" value={place} onChange={e => setPlace(e.target.value)} className={INP} />
            <textarea
              placeholder="Descrição (opcional)"
              value={description} onChange={e => setDescription(e.target.value)}
              rows={2}
              className={`${INP} resize-none`}
            />
            <button onClick={createEvent} disabled={loading || !title || !date || !place}
              className="py-3 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40">
              {loading ? "A criar…" : "Criar evento"}
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          {events.length === 0
            ? <p className="text-sm text-slate-400 text-center py-10">Ainda não criaste nenhum evento.</p>
            : events.map(e => <EventCard key={e.id} event={e} />)
          }
        </div>
      </div>
    </main>
  );
}