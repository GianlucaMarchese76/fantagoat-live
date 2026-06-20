import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FormazioneRow = {
  giornata: string;
  blocco: string;
  partecipante_id: string;
};

type PartecipanteRow = {
  id: string;
  nome: string;
};

export default async function FormazioniPage() {
  const { data: righe, error } = await supabase
    .from("formazioni")
    .select("giornata, blocco, partecipante_id");

  const { data: partecipanti } = await supabase
    .from("partecipanti")
    .select("id, nome");

  const partecipantiMap = new Map(
    ((partecipanti ?? []) as PartecipanteRow[]).map((p) => [p.id, p.nome])
  );

  const gruppi = new Map<
    string,
    {
      partecipante: string;
      giornata: string;
      blocco: string;
    }
  >();

  for (const r of (righe ?? []) as FormazioneRow[]) {
    const partecipante = partecipantiMap.get(r.partecipante_id);

    if (!partecipante) continue;

    const key = `${partecipante}-${r.giornata}-${r.blocco}`;

    gruppi.set(key, {
      partecipante,
      giornata: r.giornata,
      blocco: r.blocco,
    });
  }

  const formazioni = Array.from(gruppi.values()).sort((a, b) => {
    const p = a.partecipante.localeCompare(b.partecipante);
    if (p !== 0) return p;

    const g = a.giornata.localeCompare(b.giornata);
    if (g !== 0) return g;

    return a.blocco.localeCompare(b.blocco);
  });

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a href="/" className="text-blue-600 text-sm">
        ← Home
      </a>

      <h1 className="text-4xl font-bold mt-5 mb-6">
        Formazioni
      </h1>

      {error && (
        <pre className="text-red-600">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      {formazioni.length === 0 && (
        <section className="bg-white rounded-2xl shadow p-4">
          <div className="text-slate-600">
            Nessuna formazione salvata.
          </div>
        </section>
      )}

      <div className="grid gap-3">
        {formazioni.map((f) => (
          <a
            key={`${f.partecipante}-${f.giornata}-${f.blocco}`}
            href={`/formazioni/${encodeURIComponent(f.partecipante)}/${f.giornata}/${f.blocco}`}
            className="bg-white rounded-2xl shadow p-4 block"
          >
            <div className="text-xl font-bold">
              {f.partecipante}
            </div>

            <div className="text-slate-600">
              {f.giornata} · Blocco {f.blocco}
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}