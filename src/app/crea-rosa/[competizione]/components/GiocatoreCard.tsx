"use client";

import Bandiera from "@/components/Bandiera";
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
  const disabilitato = Boolean(blocco) && !inRosa;

  function handleClick() {
    if (inRosa || disabilitato) return;
    onAggiungi();
  }

  return (
    <div
      onClick={handleClick}
      className={`flex w-full max-w-full items-center justify-between gap-2 rounded-xl px-3 py-3 ring-1 transition active:scale-[0.99] ${
        inRosa
          ? "bg-emerald-950/40 ring-emerald-700/60"
          : disabilitato
            ? "cursor-not-allowed bg-[#07101f] opacity-60 ring-slate-700/70"
            : "cursor-pointer bg-[#07101f] ring-slate-700/70 hover:bg-[#0b1628]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-md bg-slate-800 px-2 py-0.5 text-xs font-black text-amber-300">
            {giocatore.ruolo}
          </span>

          <span className="min-w-0 truncate text-lg font-black leading-tight text-white sm:text-2xl">
            {giocatore.nome}
          </span>
        </div>

        <div className="mt-2 flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-400 sm:text-sm">
          <Bandiera codice={giocatore.nazionale} size={18} />
          <span>{giocatore.nazionale}</span>

          {giocatore.avversaria && (
            <>
              <span className="text-slate-500">vs</span>
              <span>{giocatore.avversaria}</span>
            </>
          )}
        </div>

        {blocco && !inRosa && (
          <p className="mt-2 text-xs font-bold text-red-300">{blocco}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="min-w-[42px] text-right text-2xl font-black leading-none tabular-nums text-white">
          {prezzoGiocatore(giocatore)}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (inRosa) onRimuovi();
            else if (!disabilitato) onAggiungi();
          }}
          disabled={!inRosa && disabilitato}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl font-black leading-none shadow active:scale-95 ${
            inRosa
              ? "bg-red-600 text-white"
              : "bg-amber-400 text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          }`}
        >
          {inRosa ? "−" : "+"}
        </button>
      </div>
    </div>
  );
}