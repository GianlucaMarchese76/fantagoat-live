"use client";

import type { FiltroRuolo, Giocatore } from "../lib/types";
import GiocatoreRow from "./GiocatoreCard";

export default function ListaGiocatori({
  ricerca,
  setRicerca,
  ruoloFiltro,
  setRuoloFiltro,
  ordinamento,
  setOrdinamento,
  giocatori,
  isInRosa,
  motivoBlocco,
  aggiungiGiocatore,
  rimuoviGiocatore,
}: {
  ricerca: string;
  setRicerca: (v: string) => void;
  ruoloFiltro: FiltroRuolo;
  setRuoloFiltro: (v: FiltroRuolo) => void;
  ordinamento: "nome" | "prezzoAsc" | "prezzoDesc";
  setOrdinamento: (v: "nome" | "prezzoAsc" | "prezzoDesc") => void;
  giocatori: Giocatore[];
  isInRosa: (id: number) => boolean;
  motivoBlocco: (g: Giocatore) => string | null;
  aggiungiGiocatore: (g: Giocatore) => void;
  rimuoviGiocatore: (id: number) => void;
}) {
  return (
    <section className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-[#101a2d] p-3">

      <div className="mb-2 grid gap-2 md:grid-cols-[1fr_180px]">
        <input
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Cerca giocatore o nazionale..."
          className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
        />

        <select
          value={ordinamento}
          onChange={(e) =>
            setOrdinamento(
              e.target.value as "nome" | "prezzoAsc" | "prezzoDesc"
            )
          }
          className="rounded-lg border border-slate-700 bg-[#07101f] px-3 py-2 text-sm text-white outline-none"
        >
          <option value="prezzoDesc">Prezzo decrescente</option>
          <option value="prezzoAsc">Prezzo crescente</option>
          <option value="nome">Cognome</option>
        </select>
      </div>

      <div className="max-h-[320px] overflow-y-auto pr-1">
        <div className="space-y-1">
          {giocatori.length === 0 ? (
            <div className="rounded-xl bg-[#07101f] px-3 py-4 text-sm text-slate-400 ring-1 ring-slate-700/70">
              Nessun giocatore trovato.
            </div>
          ) : (
            giocatori.map((g) => (
              <GiocatoreRow
                key={g.id}
                giocatore={g}
                inRosa={isInRosa(g.id)}
                blocco={motivoBlocco(g)}
                onAggiungi={() => aggiungiGiocatore(g)}
                onRimuovi={() => rimuoviGiocatore(g.id)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}