import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RisultatoFase1 = {
  partecipante: string;
  giornata: string;
  blocco: string;
  punti: number;
};

function slugPartecipante(nome: string) {
  return String(nome ?? "").toLowerCase().replaceAll(" ", "");
}

export default async function PartecipantePage({
  params,
}: {
  params: Promise<{ nome: string }>;
}) {
  const { nome } = await params;
  const slug = decodeURIComponent(nome).toLowerCase();

  const { data } = await supabase
    .from("v_risultati_fase1")
    .select("partecipante,giornata,blocco,punti");

  const risultati = ((data ?? []) as RisultatoFase1[])
    .filter((r) => slugPartecipante(r.partecipante) === slug)
    .sort((a, b) => {
      const ordine = ["G1AF", "G1GL", "G2AF", "G2GL", "G3AF", "G3GL"];

      return (
        ordine.indexOf(`${a.giornata}${a.blocco}`) -
        ordine.indexOf(`${b.giornata}${b.blocco}`)
      );
    });

  const partecipante = risultati[0]?.partecipante ?? slug;

  const totale = risultati.reduce(
    (sum, r) => sum + Number(r.punti ?? 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <Link href="/" className="text-sm text-blue-600">
        ← Home
      </Link>

      <header className="mb-6 mt-5">
        <h1 className="text-4xl font-bold">{partecipante}</h1>

        <div className="mt-3 flex gap-4 text-sm">
  <Link
    href={`/partecipanti/${encodeURIComponent(partecipante)}/AF`}
    className="font-semibold text-blue-600 hover:underline"
  >
    Rosa A-F
  </Link>

  <Link
    href={`/partecipanti/${encodeURIComponent(partecipante)}/GL`}
    className="font-semibold text-blue-600 hover:underline"
  >
    Rosa G-L
  </Link>
</div>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-4 text-xl font-bold">
          Dettaglio Classifica Generale
        </h2>

        <div className="grid gap-2">
          {risultati.map((r) => (
            <Link
              key={`${r.giornata}${r.blocco}`}
              href={`/formazioni/${encodeURIComponent(
                r.partecipante
              )}/${r.giornata}/${r.blocco}`}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
            >
              <div>
                <div className="font-bold">
                  {r.giornata}
                  {r.blocco}
                </div>

                <div className="text-xs text-blue-600">
                  Apri formazione →
                </div>
              </div>

              <div className="text-2xl font-bold tabular-nums">
                {Number(r.punti)}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="text-xl font-bold">Totale</div>

          <div className="text-3xl font-bold tabular-nums">
            {totale}
          </div>
        </div>
      </section>
    </main>
  );
}