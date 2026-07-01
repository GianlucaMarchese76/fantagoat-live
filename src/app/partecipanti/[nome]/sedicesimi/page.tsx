import Link from "next/link";
import { supabase } from "../../../../lib/supabase";
import { calcolaTotaleFormazione } from "../../../../lib/fantagoat/calcoloFormazioneFase2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COMPETIZIONI = [
  { codice: "16ALTA", titolo: "Sedicesimi 1-8" },
  { codice: "16BASSA", titolo: "Sedicesimi 9-16" },
];

function slugPartecipante(nome: string) {
  return String(nome ?? "").toLowerCase().replaceAll(" ", "");
}

async function getTotale(codice: string, slug: string) {
  const { data } = await supabase
    .from("v_formazioni_competizione_live")
    .select("*")
    .eq("competizione_codice", codice)
    .eq("partecipante_slug", slug)
    .order("tipo")
    .order("ordine");

  const rows = data ?? [];

  return {
    codice,
    partecipante: rows[0]?.partecipante ?? slug,
    punti: Number(calcolaTotaleFormazione(rows).toFixed(1)),
  };
}

export default async function SedicesimiPartecipantePage({
  params,
}: {
  params: Promise<{ nome: string }>;
}) {
  const { nome } = await params;
  const slug = decodeURIComponent(nome).toLowerCase();

  const risultati = await Promise.all(
    COMPETIZIONI.map(async (c) => ({
      ...c,
      ...(await getTotale(c.codice, slug)),
    }))
  );

  const partecipante =
    risultati.find((r) => r.partecipante !== slug)?.partecipante ?? slug;

  const totale = Number(
    risultati.reduce((sum, r) => sum + Number(r.punti ?? 0), 0).toFixed(1)
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <Link href="/" className="text-sm text-blue-600">
        ← Home
      </Link>

      <header className="mb-6 mt-5">
        <h1 className="text-4xl font-bold">{partecipante}</h1>
        <p className="mt-2 text-slate-600">Riepilogo Sedicesimi</p>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow">
        <div className="grid gap-2">
          {risultati.map((r) => (
            <Link
              key={r.codice}
              href={`/formazioni-competizione/${r.codice}/dettaglio?partecipante=${encodeURIComponent(
                slug
              )}`}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
            >
              <div>
                <div className="font-bold">{r.titolo}</div>
                <div className="text-xs text-blue-600">
                  Apri dettaglio formazione →
                </div>
              </div>

              <div className="text-2xl font-bold tabular-nums">{r.punti}</div>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="text-xl font-bold">Totale Sedicesimi</div>
          <div className="text-3xl font-black tabular-nums">{totale}</div>
        </div>
      </section>
    </main>
  );
}