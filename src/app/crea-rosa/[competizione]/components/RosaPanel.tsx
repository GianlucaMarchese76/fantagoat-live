"use client";

import type { Giocatore } from "../lib/types";
import { ordinaRosa, prezzoGiocatore } from "../lib/regoleRosa";

export default function RosaPanel({
  rosa,
  rosaBloccata,
  salvataggio,
  messaggio,
  svuotaRosa,
  rimuoviGiocatore,
  handleConfermaRosa,
}: {
  rosa: Giocatore[];
  rosaBloccata: boolean;
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
          disabled={rosaBloccata || rosa.length === 0}
          className="rounded-lg bg-red-700 px-2 py-1 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
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

              <span className="font-bold text-white tabular-nums">
                {prezzoGiocatore(g)}
              </span>

              <button
                onClick={() => rimuoviGiocatore(g.id)}
                disabled={rosaBloccata}
                className="text-right font-black text-red-300 disabled:cursor-not-allowed disabled:text-slate-600"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {rosaBloccata ? (
          <div className="rounded-lg border border-amber-700/70 bg-amber-950/40 p-2 text-sm font-bold text-amber-200">
            🔒 Rosa bloccata.
          </div>
        ) : (
          <>
            <button
              onClick={handleConfermaRosa}
              disabled={salvataggio || rosa.length !== 16}
              className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:opacity-60"
            >
              {salvataggio
                ? "Salvataggio..."
                : rosa.length !== 16
                  ? `Completa la rosa (${rosa.length}/16)`
                  : "Conferma Rosa"}
            </button>

            {messaggio && (
              <div className="rounded-lg bg-[#07101f] p-2 text-xs font-bold text-slate-200">
                {messaggio}
              </div>
            )}
          </>
        )}

        {rosaBloccata && messaggio && (
          <div className="rounded-lg bg-[#07101f] p-2 text-xs font-bold text-slate-200">
            {messaggio}
          </div>
        )}
      </div>
    </aside>
  );
}