"use client";

import type { Giocatore } from "../lib/types";
import { prezzoGiocatore } from "../lib/regoleRosa";

export default function GiocatoreRow({
  giocatore,
  inRosa,
  blocco,
  onAggiungi,
  onRimuovi,
}: {
  giocatore: Giocatore;
  inRosa: boolean;
  blocco: string | null;
  onAggiungi: () => void;
  onRimuovi: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-[#07101f] px-2 py-2 ring-1 ring-slate-700/70">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-xs font-black text-amber-300">
            {giocatore.ruolo}
          </span>

          <span className="truncate text-sm font-bold text-white">
            {giocatore.nome}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs">
  <span className="text-slate-400">
    {giocatore.nazionale}
{giocatore.avversaria ? ` vs ${giocatore.avversaria}` : ""}
  </span>

  <span className="font-bold text-white tabular-nums">
    {prezzoGiocatore(giocatore)}
  </span>
</div>

        {blocco && !inRosa && (
          <p className="mt-0.5 text-xs font-bold text-red-300">{blocco}</p>
        )}
      </div>

      {inRosa ? (
        <button
          onClick={onRimuovi}
          className="shrink-0 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white"
        >
          –
        </button>
      ) : (
        <button
          onClick={onAggiungi}
          disabled={!!blocco}
          className="shrink-0 rounded-lg bg-amber-400 px-3 py-1 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          +
        </button>
      )}
    </div>
  );
}