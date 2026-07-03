"use client";

import type { FiltroRuolo, Ruolo } from "../lib/types";
import { MIN_RUOLO, jollyUsati } from "../lib/regoleRosa";

function CounterButton({
  label,
  value,
  done,
  active,
  onClick,
}: {
  label: FiltroRuolo;
  value: string;
  done: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-2 py-2 text-center ring-1 transition ${
        active
          ? "bg-amber-400 text-slate-950 ring-amber-300"
          : done
          ? "bg-emerald-950/40 text-white ring-emerald-600/60"
          : "bg-[#07101f] text-white ring-slate-700/70"
      }`}
    >
      <div className={`text-xs font-black ${active ? "text-slate-950" : "text-amber-300"}`}>
        {label}
      </div>
      <div className="text-sm font-black">{value}</div>
    </button>
  );
}

export default function RuoliBar({
  contatoriRuoli,
  maxPerNazionale,
  ruoloFiltro,
  setRuoloFiltro,
}: {
  contatoriRuoli: Record<Ruolo, number>;
  maxPerNazionale: number;
  ruoloFiltro: FiltroRuolo;
  setRuoloFiltro: (v: FiltroRuolo) => void;
}) {
  const jolly = jollyUsati(contatoriRuoli);

  function toggleFiltro(filtro: FiltroRuolo) {
    setRuoloFiltro(ruoloFiltro === filtro ? "Tutti" : filtro);
  }

  return (
    <section className="mb-3 rounded-2xl border border-slate-700/70 bg-[#101a2d] p-3">
      <div className="grid grid-cols-5 gap-2">
        <CounterButton
          label="P"
          value={`${contatoriRuoli.P}/${MIN_RUOLO.P}`}
          done={contatoriRuoli.P >= MIN_RUOLO.P}
          active={ruoloFiltro === "P"}
          onClick={() => toggleFiltro("P")}
        />

        <CounterButton
          label="D"
          value={`${Math.min(contatoriRuoli.D, MIN_RUOLO.D)}/${MIN_RUOLO.D}`}
          done={contatoriRuoli.D >= MIN_RUOLO.D}
          active={ruoloFiltro === "D"}
          onClick={() => toggleFiltro("D")}
        />

        <CounterButton
          label="C"
          value={`${Math.min(contatoriRuoli.C, MIN_RUOLO.C)}/${MIN_RUOLO.C}`}
          done={contatoriRuoli.C >= MIN_RUOLO.C}
          active={ruoloFiltro === "C"}
          onClick={() => toggleFiltro("C")}
        />

        <CounterButton
          label="A"
          value={`${Math.min(contatoriRuoli.A, MIN_RUOLO.A)}/${MIN_RUOLO.A}`}
          done={contatoriRuoli.A >= MIN_RUOLO.A}
          active={ruoloFiltro === "A"}
          onClick={() => toggleFiltro("A")}
        />

        <CounterButton
          label="J"
          value={`${jolly}/1`}
          done={jolly >= 1}
          active={ruoloFiltro === "J"}
          onClick={() => toggleFiltro("J")}
        />
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Max {maxPerNazionale} giocatori per nazionale · Il Jolly è D, C o A
      </p>
    </section>
  );
}