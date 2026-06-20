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

  const gruppi = new Map<string, { giornata: string; blocco: string }[]>();

  for (const r of (righe ?? []) as FormazioneRow[]) {
    const partecipante = partecipantiMap.get(r.partecipante_id);
    if (!partecipante) continue;

    const key = `${r.giornata}-${r.blocco}`;
    const lista = gruppi.get(partecipante) ?? [];

    if (!lista.some((x) => `${x.giornata}-${x.blocco}` === key)) {
      lista.push({
        giornata: r.giornata,
        blocco: r.blocco,
      });
    }

    gruppi.set(partecipante, lista);
  }

  const partecipantiConFormazioni = Array.from(gruppi.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

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

      {partecipantiConFormazioni.length === 0 && (
        <section className="bg-white rounded-2xl shadow p-4">
          <div className="text-slate-600">
            Nessuna formazione salvata.
          </div>
        </section>
      )}

      <div className="grid gap-4">
        {partecipantiConFormazioni.map(([partecipante, lista]) => {
          const ordinate = [...lista].sort((a, b) => {
            const g = a.giornata.localeCompare(b.giornata);
            if (g !== 0) return g;
            return a.blocco.localeCompare(b.blocco);
          });

          return (
            <section
              key={partecipante}
              className="bg-white rounded-2xl shadow p-4"
            >
              <h2 className="text-2xl font-bold mb-3">
                {partecipante}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ordinate.map((f) => (
                  <a
                    key={`${partecipante}-${f.giornata}-${f.blocco}`}
                    href={`/formazioni/${encodeURIComponent(
                      partecipante
                    )}/${f.giornata}/${f.blocco}`}
                    className="bg-slate-100 rounded-xl px-4 py-3 text-center font-bold"
                  >
                    {f.giornata}
                    {f.blocco}
                  </a>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}