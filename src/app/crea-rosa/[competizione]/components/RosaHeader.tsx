"use client";

import type { Competizione, Partecipante } from "../lib/types";

export default function RosaHeader({
  competizione,
  partecipante,
}: {
  competizione: Competizione;
  partecipante: Partecipante;
}) {
  return (
    <header className="mb-3 rounded-2xl border border-slate-700/70 bg-gradient-to-br from-[#101a2d] to-[#07101f] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-300">
        FantaGOAT
      </p>

      <h1 className="mt-1 text-3xl font-black">Crea Rosa</h1>

      <div className="mt-2 text-sm text-slate-300">
        <span className="font-semibold text-white">{competizione.nome}</span>
        <span className="mx-2 text-slate-500">·</span>
        <span className="font-semibold text-white">{partecipante.nome}</span>
      </div>
    </header>
  );
}