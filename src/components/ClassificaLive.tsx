import Link from "next/link";
import { supabase } from "../lib/supabase";
import { calcolaTotaleFormazione } from "../lib/fantagoat/calcoloFormazioneFase2";

const COMPETIZIONI = ["16ALTA", "16BASSA"];

function slugPartecipante(nome: string) {
  return String(nome ?? "").toLowerCase().replaceAll(" ", "");
}

async function getClassificaCompetizioneLive(codice: string) {
  const { data } = await supabase
    .from("v_formazioni_competizione_live")
    .select("*")
    .eq("competizione_codice", codice)
    .order("partecipante")
    .order("tipo")
    .order("ordine");

  const gruppi = new Map<string, any[]>();

  for (const row of data ?? []) {
    const slug = row.partecipante_slug ?? slugPartecipante(row.partecipante);

    if (!gruppi.has(slug)) {
      gruppi.set(slug, []);
    }

    gruppi.get(slug)!.push(row);
  }

  return Array.from(gruppi.entries()).map(([slug, rows]) => ({
    slug,
    partecipante: rows[0]?.partecipante ?? slug,
    punti: calcolaTotaleFormazione(rows),
  }));
}

export default async function ClassificaLive() {
  const map = new Map<
    string,
    {
      slug: string;
      partecipante: string;
      punti: number;
    }
  >();

  for (const codice of COMPETIZIONI) {
    const classifica = await getClassificaCompetizioneLive(codice);

    for (const r of classifica) {
      const old = map.get(r.slug);

      map.set(r.slug, {
        slug: r.slug,
        partecipante: r.partecipante,
        punti: (old?.punti ?? 0) + Number(r.punti ?? 0),
      });
    }
  }

  const classificaLive = Array.from(map.values())
    .map((r) => ({
      ...r,
      punti: Number(r.punti.toFixed(1)),
    }))
    .sort((a, b) => b.punti - a.punti)
    .map((r, index) => ({
      posizione: index + 1,
      ...r,
    }));

  return (
    <section className="rounded-2xl bg-white p-4 shadow">
      <h3 className="mb-1 text-xl font-bold">Classifica Live Sedicesimi</h3>

      <div className="mb-3 text-sm text-slate-500">
        Somma 16ALTA + 16BASSA
      </div>

      <div className="grid gap-2">
        {classificaLive.length === 0 && (
          <div className="text-slate-500">Nessun dato disponibile.</div>
        )}

        {classificaLive.slice(0, 8).map((r) => (
          <div
            key={r.slug}
            className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
          >
            <Link
              href={`/partecipanti/${encodeURIComponent(r.slug)}/sedicesimi`}
              className="font-semibold hover:text-blue-600"
            >
              {r.posizione}. {r.partecipante}
            </Link>

            <div className="text-xl font-bold tabular-nums">{r.punti}</div>
          </div>
        ))}
      </div>

      <a
        href="/"
        className="mt-4 block text-sm font-semibold text-blue-600"
      >
        → Tutte le classifiche
      </a>
    </section>
  );
}