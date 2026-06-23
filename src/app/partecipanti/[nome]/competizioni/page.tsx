import Link from "next/link";
import { supabase } from "../../../../lib/supabase";
import { calcolaTotaleFormazione } from "../../../../lib/calcoloFormazione";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompetizioniPage({
  params,
}: {
  params: Promise<{ nome: string }>;
}) {
  const { nome } = await params;

  const partecipante = decodeURIComponent(nome);

  const { data: competizioni } = await supabase
    .from("v_competizioni_concluse")
    .select("*")
    .eq("conclusa", true)
    .order("giornata")
    .order("blocco");

  const risultati: any[] = [];

  for (const c of competizioni ?? []) {
    const { data: rows } = await supabase
      .from("v_formazioni_dettaglio_live")
      .select("*")
      .eq("partecipante", partecipante)
      .eq("giornata", c.giornata)
      .eq("blocco", c.blocco);

    if (!rows?.length) continue;

    const punti = calcolaTotaleFormazione(rows);

    risultati.push({
      competizione: `${c.giornata}${c.blocco}`,
      giornata: c.giornata,
      blocco: c.blocco,
      punti,
    });
  }

  const totale = risultati.reduce(
    (sum, r) => sum + Number(r.punti),
    0
  );

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <Link
        href={`/partecipanti/${encodeURIComponent(partecipante)}`}
        className="text-blue-600 text-sm"
      >
        ← Partecipante
      </Link>

      <h1 className="text-3xl font-bold my-6">
        {partecipante}
      </h1>

      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-xl font-bold mb-4">
          Dettaglio Classifica Generale
        </h2>

        <div className="grid gap-2">
          {risultati.map((r) => (
            <Link
              key={r.competizione}
              href={`/formazioni/${encodeURIComponent(
                partecipante
              )}/${r.giornata}/${r.blocco}`}
              className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
            >
              <div>
                <div className="font-bold">
                  {r.competizione}
                </div>

                <div className="text-xs text-blue-600">
                  Apri formazione →
                </div>
              </div>

              <div className="text-2xl font-bold tabular-nums">
                {r.punti}
              </div>
            </Link>
          ))}
        </div>

        <div className="border-t mt-4 pt-4 flex justify-between items-center">
          <div className="text-xl font-bold">
            Totale
          </div>

          <div className="text-3xl font-bold">
            {totale}
          </div>
        </div>
      </section>
    </main>
  );
}