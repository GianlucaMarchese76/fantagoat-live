"use client";

import type { Giocatore } from "../lib/types";
import { ordinaRosa, prezzoGiocatore } from "../lib/regoleRosa";

export default function RosaPanel({
  rosa,
  competizioneChiusa,
  salvataggio,
  messaggio,
  svuotaRosa,
  rimuoviGiocatore,
  handleConfermaRosa,
}: {
  rosa: Giocatore[];
  competizioneChiusa: boolean;
  salvataggio: boolean;
  messaggio: string;
  svuotaRosa: () => void;
  rimuoviGiocatore: (id: number) => void;
  handleConfermaRosa: () => void;
}) {
  return (
    <aside className="rounded-2xl border border-slate-700/70 bg-[#101a2d] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-white">
          La tua rosa ({rosa.length}/16)
        </h2>

        <button
          onClick={svuotaRosa}
          disabled={rosa.length === 0}
          className="rounded-lg bg-red-700 px-2 py-1 text-xs font-bold text-white disabled:bg-slate-700 disabled:text-slate-400"
        >
          Svuota
        </button>
      </div>

      {rosa.length === 0 ? (
        <p className="text-sm text-slate-400">Nessun giocatore selezionato.</p>
      ) : (
        <div className="grid gap-1 md:grid-cols-2 lg:grid-cols-4">
          {[...rosa].sort(ordinaRosa).map((g) => (
            <div
              key={g.id}
              className="grid grid-cols-[24px_1fr_38px_24px] items-center gap-1 rounded-md bg-[#07101f] px-2 py-1 text-xs ring-1 ring-slate-700/70"
            >
              <span className="font-black text-amber-300">{g.ruolo}</span>
              <span className="truncate font-bold text-white">{g.nome}</span>
              <span className="text-right text-slate-300">
                Q{prezzoGiocatore(g)}
              </span>

              <button
                onClick={() => rimuoviGiocatore(g.id)}
                className="text-right font-black text-red-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {competizioneChiusa ? (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-2 text-sm font-bold text-red-200">
            🔒 Competizione chiusa
          </div>
        ) : (
          <>
            <button
              onClick={handleConfermaRosa}
              disabled={salvataggio}
              className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {salvataggio ? "Salvataggio..." : "Conferma Rosa"}
            </button>

            {messaggio && (
              <div className="rounded-lg bg-[#07101f] p-2 text-xs font-bold text-slate-200">
                {messaggio}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}