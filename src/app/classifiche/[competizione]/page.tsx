import { supabase } from "../../../lib/supabase";

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

  const competizioneNorm = decodeURIComponent(
    competizione
  );

  const isGenerale =
    competizioneNorm.toLowerCase() === "generale";

  const query = isGenerale
    ? supabase
        .from("v_classifica_generale")
        .select("*")
        .order("posizione")
    : supabase
        .from("v_classifiche")
        .select("*")
        .eq(
          "competizione",
          competizioneNorm.toUpperCase()
        )
        .order("posizione");

  const { data, error } = await query;

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a
        href="/classifiche"
        className="text-blue-600 text-sm"
      >
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
          {data?.map((r) => (
            <a
              key={r.partecipante}
              href={`/partecipanti/${r.partecipante}`}
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