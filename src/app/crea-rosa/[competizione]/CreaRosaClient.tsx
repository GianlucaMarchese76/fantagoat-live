"use client";

import { useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Ruolo = "P" | "D" | "C" | "A";

type Giocatore = {
  id: number;
  nome: string;
  ruolo: Ruolo;
  nazionale: string;
  quotazione_sedicesimi: number | null;
};

type Competizione = {
  id: number;
  codice: string;
  nome: string;
  ordine: number;
  budget: number;
  moltiplicatore: number;
  max_per_nazionale: number;
  attiva: boolean;
  conclusa: boolean;
  created_at: string;
};

type Partecipante = {
  id: string;
  nome: string;
  slug: string;
  attivo: boolean;
  created_at: string;
  codice_accesso_hash: string | null;
};

type Props = {
  competizione: Competizione;
  partecipante: Partecipante;
  giocatori: Giocatore[];
  rosaIniziale: Giocatore[];
  campoQuotazione: string;
};

const RUOLI: Ruolo[] = ["P", "D", "C", "A"];

export default function CreaRosaClient({
  competizione,
  partecipante,
  giocatori,
  rosaIniziale,
  campoQuotazione,
}: Props) {
  const BUDGET_MAX = competizione.budget;
  const MAX_PER_NAZIONALE = competizione.max_per_nazionale;
  const LIMITE_GIOCATORI = 16;
  const competizioneChiusa = !competizione.attiva || competizione.conclusa;

  const [ricerca, setRicerca] = useState("");
  const [ruoloFiltro, setRuoloFiltro] = useState<"Tutti" | Ruolo>("Tutti");
  const [ordinamento, setOrdinamento] = useState<"nome" | "prezzoAsc" | "prezzoDesc">("nome");
  const [rosa, setRosa] = useState<Giocatore[]>(rosaIniziale ?? []);
  const [salvataggio, setSalvataggio] = useState(false);
const [messaggio, setMessaggio] = useState("");

  const prezzoGiocatore = (g: Giocatore) => g.quotazione_sedicesimi ?? 0;

  const budgetUsato = useMemo(
    () => rosa.reduce((totale, g) => totale + prezzoGiocatore(g), 0),
    [rosa]
  );

  const budgetResiduo = BUDGET_MAX - budgetUsato;

  const contatoriRuoli = useMemo(() => {
    return RUOLI.reduce((acc, ruolo) => {
      acc[ruolo] = rosa.filter((g) => g.ruolo === ruolo).length;
      return acc;
    }, {} as Record<Ruolo, number>);
  }, [rosa]);

  const contatoriNazionali = useMemo(() => {
    return rosa.reduce((acc, g) => {
      acc[g.nazionale] = (acc[g.nazionale] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [rosa]);

  const giocatoriFiltrati = useMemo(() => {
    return [...giocatori]
      .filter((g) => {
        const matchRicerca =
          g.nome.toLowerCase().includes(ricerca.toLowerCase()) ||
          g.nazionale.toLowerCase().includes(ricerca.toLowerCase());

        const matchRuolo = ruoloFiltro === "Tutti" || g.ruolo === ruoloFiltro;

        return matchRicerca && matchRuolo;
      })
      .sort((a, b) => {
        if (ordinamento === "nome") return a.nome.localeCompare(b.nome);

        const qa = prezzoGiocatore(a);
        const qb = prezzoGiocatore(b);

        if (ordinamento === "prezzoAsc") return qa - qb;
        return qb - qa;
      });
  }, [giocatori, ricerca, ruoloFiltro, ordinamento]);

  function isInRosa(id: number) {
    return rosa.some((g) => g.id === id);
  }

  function motivoBlocco(g: Giocatore) {
    if (competizioneChiusa) {
  return "Competizione chiusa";
}   
    if (isInRosa(g.id)) return null;

    const prezzo = prezzoGiocatore(g);

    if (rosa.length >= LIMITE_GIOCATORI) {
      return "Limite 16 giocatori raggiunto";
    }

    if (budgetUsato + prezzo > BUDGET_MAX) {
      return "Budget insufficiente";
    }

    if ((contatoriNazionali[g.nazionale] ?? 0) >= MAX_PER_NAZIONALE) {
      return `Massimo ${MAX_PER_NAZIONALE} giocatori per nazionale`;
    }

    return null;
  }

  function aggiungiGiocatore(g: Giocatore) {
    if (motivoBlocco(g)) return;
    setRosa((prev) => [...prev, g]);
  }

  function rimuoviGiocatore(id: number) {
    setRosa((prev) => prev.filter((g) => g.id !== id));
  }

async function handleConfermaRosa() {
  if (rosa.length !== 16) {
    setMessaggio("La rosa deve contenere esattamente 16 giocatori.");
    return;
  }

  try {
    setSalvataggio(true);
    setMessaggio("");

    const righe = rosa.map((g) => ({
      competizione_id: competizione.id,
      partecipante_id: partecipante.id,
      giocatore_id: g.id,
      costo: g.quotazione_sedicesimi ?? 0,
    }));

    const { error: deleteError } = await supabase
  .from("rose_competizione")
  .delete()
  .eq("competizione_id", competizione.id)
  .eq("partecipante_id", partecipante.id);

if (deleteError) throw deleteError;

const { error: insertError } = await supabase
  .from("rose_competizione")
  .insert(righe);

if (insertError) throw insertError;

    setMessaggio("Rosa salvata con successo.");
  } catch (error) {
    console.error(error);
    setMessaggio("Errore durante il salvataggio.");
  } finally {
    setSalvataggio(false);
  }
}
  return (
    <div className="min-h-screen bg-[#090611] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-8 rounded-3xl border border-purple-800/40 bg-gradient-to-br from-[#1b102b] to-[#080510] p-6 shadow-2xl shadow-purple-950/40">
          <p className="text-sm uppercase tracking-[0.35em] text-purple-300">
            FantaGOAT
          </p>

          <h1 className="mt-2 text-4xl font-black">Crea Rosa</h1>

          <p className="mt-2 text-purple-200">
  Competizione:{" "}
  <span className="font-semibold text-white">
    {competizione.nome}
  </span>
</p>

<p className="mt-1 text-purple-300">
  Partecipante:{" "}
  <span className="font-semibold text-white">
    {partecipante.nome}
  </span>
</p>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Giocatori" value={`${rosa.length}/${LIMITE_GIOCATORI}`} />
          <StatCard label="Budget usato" value={`${budgetUsato}/${BUDGET_MAX}`} />
          <StatCard label="Budget residuo" value={budgetResiduo} danger={budgetResiduo < 0} />
          <StatCard label="Max nazionale" value={MAX_PER_NAZIONALE} />
        </section>

        <section className="mb-6 grid gap-3 rounded-2xl border border-purple-900/50 bg-[#120b1f] p-4 md:grid-cols-3">
          <input
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca giocatore o nazionale..."
            className="rounded-xl border border-purple-800/60 bg-[#080510] px-4 py-3 text-white outline-none placeholder:text-purple-300 focus:border-fuchsia-400"
          />

          <select
            value={ruoloFiltro}
            onChange={(e) => setRuoloFiltro(e.target.value as "Tutti" | Ruolo)}
            className="rounded-xl border border-purple-800/60 bg-[#080510] px-4 py-3 text-white outline-none focus:border-fuchsia-400"
          >
            <option value="Tutti">Tutti i ruoli</option>
            {RUOLI.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            value={ordinamento}
            onChange={(e) =>
              setOrdinamento(e.target.value as "nome" | "prezzoAsc" | "prezzoDesc")
            }
            className="rounded-xl border border-purple-800/60 bg-[#080510] px-4 py-3 text-white outline-none focus:border-fuchsia-400"
          >
            <option value="nome">Ordina per nome</option>
            <option value="prezzoAsc">Prezzo crescente</option>
            <option value="prezzoDesc">Prezzo decrescente</option>
          </select>
        </section>

        <section className="mb-6 rounded-2xl border border-purple-900/50 bg-[#120b1f] p-4">
          <h2 className="mb-3 font-bold text-purple-200">Contatori ruoli</h2>

          <div className="grid grid-cols-4 gap-3">
            {RUOLI.map((ruolo) => (
              <div
                key={ruolo}
                className="rounded-xl bg-[#080510] p-4 text-center ring-1 ring-purple-900/60"
              >
                <div className="text-sm text-purple-300">{ruolo}</div>
                <div className="text-2xl font-black">{contatoriRuoli[ruolo]}</div>
              </div>
            ))}
          </div>
        </section>

        <main className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="rounded-3xl border border-purple-900/50 bg-[#120b1f] p-4">
            <h2 className="mb-4 text-xl font-black">Lista giocatori</h2>

            <div className="space-y-3">
              {giocatoriFiltrati.map((g) => {
                const inRosa = isInRosa(g.id);
                const blocco = motivoBlocco(g);

                return (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-2xl border border-purple-900/50 bg-[#080510] p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-purple-700 px-2 py-1 text-xs font-bold">
                          {g.ruolo}
                        </span>
                        <h3 className="font-bold">{g.nome}</h3>
                      </div>

                      <p className="mt-1 text-sm text-purple-300">
                        {g.nazionale} · Q {prezzoGiocatore(g)}
                      </p>

                      {blocco && !inRosa && (
                        <p className="mt-1 text-xs text-red-300">{blocco}</p>
                      )}
                    </div>

                    {inRosa ? (
                      <button
                        onClick={() => rimuoviGiocatore(g.id)}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-500"
                      >
                        Rimuovi
                      </button>
                    ) : (
                      <button
                        onClick={() => aggiungiGiocatore(g)}
                        disabled={!!blocco}
                        className="rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-bold hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                      >
                        Aggiungi
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="rounded-3xl border border-fuchsia-900/50 bg-gradient-to-b from-[#1a0f2e] to-[#080510] p-4">
            <h2 className="mb-4 text-xl font-black">La tua rosa</h2>

            {rosa.length === 0 ? (
              <p className="text-purple-300">Nessun giocatore selezionato.</p>
            ) : (
              <div className="space-y-3">
                {rosa.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-2xl bg-[#120b1f] p-3 ring-1 ring-purple-900/60"
                  >
                    <div>
                      <p className="font-bold">{g.nome}</p>
                      <p className="text-sm text-purple-300">
                        {g.ruolo} · {g.nazionale} · Q {prezzoGiocatore(g)}
                      </p>
                    </div>

                    <button
                      onClick={() => rimuoviGiocatore(g.id)}
                      className="rounded-lg px-3 py-1 text-sm text-red-300 hover:bg-red-950"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

<div className="mt-6 space-y-3">

{competizioneChiusa ? (
  <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm font-bold text-red-200">
    🔒 Competizione chiusa
  </div>
) : (
  <div className="space-y-3">
    <button
      onClick={handleConfermaRosa}
      disabled={salvataggio}
      className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold hover:bg-emerald-500 disabled:opacity-50"
    >
      {salvataggio ? "Salvataggio..." : "Conferma Rosa"}
    </button>

    {messaggio && (
      <div className="rounded-xl bg-slate-900 p-3 text-sm">
        {messaggio}
      </div>
    )}
  </div>
)}
    
  <button
    onClick={handleConfermaRosa}
    disabled={salvataggio}
    className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold hover:bg-emerald-500 disabled:opacity-50"
  >
    {salvataggio ? "Salvataggio..." : "Conferma Rosa"}
  </button>

  {messaggio && (
    <div className="rounded-xl bg-slate-900 p-3 text-sm">
      {messaggio}
    </div>
  )}
</div>

          </aside>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-purple-900/50 bg-[#120b1f] p-4">
      <p className="text-sm text-purple-300">{label}</p>
      <p className={`mt-1 text-3xl font-black ${danger ? "text-red-400" : ""}`}>
        {value}
      </p>
    </div>
  );
}