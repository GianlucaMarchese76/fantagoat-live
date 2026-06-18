import { supabase } from "../../../lib/supabase";
import { calcolaTotaleFormazione } from "../../../lib/calcoloFormazione";

function titoloCompetizione(competizione: string) {
  if (competizione.toLowerCase() === "generale") {
    return "Classifica Generale";
  }

  return `Classifica ${competizione.toUpperCase()}`;
}

export default async function ClassificaPage({
  params,
}: {
  params: Promise<{ competizione: string }>;
}) {
  const { competizione } = await params;
  const competizioneNorm = decodeURIComponent(competizione).toUpperCase();

  const isGenerale = competizioneNorm.toLowerCase() === "generale";

  if (isGenerale) {
    const { data, error } = await supabase
      .from("v_classifica_generale")
      .select("*")
      .order("posizione");

    return (
      <main className="min-h-screen p-4 bg-slate-100">
        <a href="/classifiche" className="text-blue-600 text-sm">
          ← Classifiche
        </a>

        <h1 className="text-4xl font-bold mt-5 mb-6">
          Classifica Generale
        </h1>

        {error && (
          <pre className="text-red-600">
            {JSON.stringify(error, null, 2)}
          </pre>
        )}

        <section className="bg-white rounded-2xl shadow p-4">
          <div className="grid gap-2">
            {data?.map((r) => (
              <a
                key={r.partecipante}
                href={`/partecipanti/${encodeURIComponent(
                  r.partecipante
                )}`}
                className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 text-xl font-bold">
                    {r.posizione}.
                  </div>

                  <div className="font-semibold truncate">
                    {r.partecipante}
                  </div>
                </div>

                <div className="text-2xl font-bold tabular-nums">
                  {r.punti}
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>
    );
  }

  const giornata = competizioneNorm.slice(0, 2);
  const blocco = competizioneNorm.slice(2);

  const { data, error } = await supabase
    .from("v_formazioni_live")
    .select("*")
    .eq("giornata", giornata)
    .eq("blocco", blocco);

  const gruppi = new Map<string, any[]>();

  for (const row of data ?? []) {
    if (!gruppi.has(row.partecipante)) {
      gruppi.set(row.partecipante, []);
    }

    gruppi.get(row.partecipante)?.push(row);
  }

  const classifica = Array.from(gruppi.entries())
    .map(([partecipante, rows]) => ({
      partecipante,
      punti: calcolaTotaleFormazione(rows),
    }))
    .sort((a, b) => b.punti - a.punti)
    .map((r, index) => ({
      ...r,
      posizione: index + 1,
    }));

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a href="/classifiche" className="text-blue-600 text-sm">
        ← Classifiche
      </a>

      <h1 className="text-4xl font-bold mt-5 mb-6">
        {titoloCompetizione(competizioneNorm)}
      </h1>

      {error && (
        <pre className="text-red-600">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <section className="bg-white rounded-2xl shadow p-4">
        <div className="grid gap-2">
          {classifica.length === 0 && (
            <div className="text-slate-500">
              Nessun dato disponibile.
            </div>
          )}

          {classifica.map((r) => (
            <a
              key={r.partecipante}
              href={`/formazioni/${encodeURIComponent(
                r.partecipante
              )}/${giornata}/${blocco}`}
              className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 text-xl font-bold">
                  {r.posizione}.
                </div>

                <div className="font-semibold truncate">
                  {r.partecipante}
                </div>
              </div>

              <div className="text-2xl font-bold tabular-nums">
                {r.punti}
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}