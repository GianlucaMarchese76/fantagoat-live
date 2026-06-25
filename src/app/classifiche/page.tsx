import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StatoCompetizione = "conclusa" | "in_corso" | "da_disputare";

type CompetizioneCard = {
  codice: string;
  label: string;
  giornata: string;
  blocco: string;
};

const competizioniFase1: CompetizioneCard[] = [
  { codice: "G1AF", label: "G1 AF", giornata: "G1", blocco: "AF" },
  { codice: "G1GL", label: "G1 GL", giornata: "G1", blocco: "GL" },
  { codice: "G2AF", label: "G2 AF", giornata: "G2", blocco: "AF" },
  { codice: "G2GL", label: "G2 GL", giornata: "G2", blocco: "GL" },
  { codice: "G3AF", label: "G3 AF", giornata: "G3", blocco: "AF" },
  { codice: "G3GL", label: "G3 GL", giornata: "G3", blocco: "GL" },
];

const competizioniFase2: CompetizioneCard[] = [
  { codice: "16ALTA", label: "Sedicesimi • Gare 1-8", giornata: "sedicesimi", blocco: "1-8" },
  { codice: "16BASSA", label: "Sedicesimi • Gare 9-16", giornata: "sedicesimi", blocco: "9-16" },
  { codice: "8ALTA", label: "Ottavi • Gare 1-4", giornata: "ottavi", blocco: "1-4" },
  { codice: "8BASSA", label: "Ottavi • Gare 5-8", giornata: "ottavi", blocco: "5-8" },
  { codice: "QUARTI", label: "Quarti di finale", giornata: "quarti", blocco: "unico" },
  { codice: "SEMIFINALI", label: "Semifinali", giornata: "semifinale", blocco: "unico" },
  { codice: "TERZOPOSTO", label: "Finale 3° posto", giornata: "terzo_posto", blocco: "unico" },
  { codice: "FINALE", label: "Finale", giornata: "finale", blocco: "unico" },
];

function stileStato(stato: StatoCompetizione) {
  if (stato === "conclusa") {
    return {
      card: "bg-emerald-50 border-emerald-200",
      badge: "bg-emerald-100 text-emerald-700",
      label: "Conclusa",
    };
  }

  if (stato === "in_corso") {
    return {
      card: "bg-amber-50 border-amber-200",
      badge: "bg-amber-100 text-amber-700",
      label: "In corso",
    };
  }

  return {
    card: "bg-white border-slate-200",
    badge: "bg-slate-100 text-slate-500",
    label: "Da disputare",
  };
}

function statoCompetizione({
  conclusa,
  primaPartita,
}: {
  conclusa: boolean;
  primaPartita: Date | null;
}): StatoCompetizione {
  if (conclusa) return "conclusa";
  if (primaPartita && new Date() >= primaPartita) return "in_corso";
  return "da_disputare";
}

import type { ReactNode } from "react";

function CardClassifica({
  href,
  label,
  stato,
}: {
  href: string;
  label: ReactNode;
  stato?: StatoCompetizione;
}) {
  const stile = stato ? stileStato(stato) : null;

  return (
    <a
      href={href}
      className={`rounded-2xl border shadow-sm p-4 flex items-center justify-between ${
        stile?.card ?? "bg-white border-slate-200"
      }`}
    >
      <div>
        <div className="text-xl font-semibold">{label}</div>

        {stile && (
          <div
            className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-bold ${stile.badge}`}
          >
            {stile.label}
          </div>
        )}
      </div>

      <div className="text-slate-400">→</div>
    </a>
  );
}

export default async function ClassifichePage() {
  const { data: stati } = await supabase
    .from("v_competizioni_concluse")
    .select("giornata, blocco, conclusa");

  const { data: partite } = await supabase
    .from("calendario_partite")
    .select("giornata, blocco, kickoff")
    .order("kickoff");

  const statiByKey = new Map(
    (stati ?? []).map((s) => [`${s.giornata}-${s.blocco}`, Boolean(s.conclusa)])
  );

  const primePartiteByKey = new Map<string, Date>();

  for (const p of partite ?? []) {
    const key = `${p.giornata}-${p.blocco}`;
    const kickoff = new Date(p.kickoff);

    const precedente = primePartiteByKey.get(key);

    if (!precedente || kickoff < precedente) {
      primePartiteByKey.set(key, kickoff);
    }
  }

  function getStato(c: CompetizioneCard) {
    const key = `${c.giornata}-${c.blocco}`;

    return statoCompetizione({
      conclusa: statiByKey.get(key) ?? false,
      primaPartita: primePartiteByKey.get(key) ?? null,
    });
  }

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a href="/" className="text-blue-600 text-sm">
        ← Home
      </a>

      <h1 className="text-4xl font-bold mt-5 mb-6">Classifiche</h1>

      <div className="grid gap-3">
        <CardClassifica href="/classifiche/generale" label="Generale" />
        <CardClassifica
  href="/classifiche/fase1"
  label={
    <>
      Fase a gironi{" "}
      <span className="text-sm font-normal text-slate-500">
        (6 giornate)
      </span>
    </>
  }
/>

<CardClassifica
  href="/classifiche/fase2"
  label={
    <>
      Tabellone finale{" "}
      <span className="text-sm font-normal text-slate-500">
        (8 giornate)
      </span>
    </>
  }
/>

        <h2 className="text-lg font-bold mt-4">Fase a gironi</h2>

        {competizioniFase1.map((c) => (
          <CardClassifica
            key={c.codice}
            href={`/classifiche/${c.codice}`}
            label={c.label}
            stato={getStato(c)}
          />
        ))}

        <h2 className="text-lg font-bold mt-4">Tabellone finale</h2>

        {competizioniFase2.map((c) => (
          <CardClassifica
            key={c.codice}
            href={`/classifiche/${c.codice}`}
            label={c.label}
            stato={getStato(c)}
          />
        ))}
      </div>
    </main>
  );
}