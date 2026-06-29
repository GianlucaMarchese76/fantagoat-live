import { supabase } from "../../../lib/supabase";
import {
  calcolaGenerale,
  getClassificaCompetizione,
} from "../../../lib/fantagoat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAPPA_COMPETIZIONI: Record<string, { giornata: string; blocco: string; titolo: string }> = {
  "16ALTA": { giornata: "Sedicesimi", blocco: "1-8", titolo: "Classifica Sedicesimi 1-8" },
  "16BASSA": { giornata: "Sedicesimi", blocco: "9-16", titolo: "Classifica Sedicesimi 9-16" },
  "8ALTA": { giornata: "Ottavi", blocco: "1-4", titolo: "Classifica Ottavi 1-4" },
  "8BASSA": { giornata: "Ottavi", blocco: "5-8", titolo: "Classifica Ottavi 5-8" },
};

export default async function ClassificaPage({
  params,
}: {
  params: Promise<{ competizione: string }>;
}) {
  const { competizione } = await params;
  const competizioneNorm = decodeURIComponent(competizione).toUpperCase();

  if (competizioneNorm === "GENERALE") {
    const { data: competizioni, error } = await supabase
      .from("v_competizioni_concluse")
      .select("*")
      .eq("conclusa", true)
      .order("giornata")
      .order("blocco");

    const data = await calcolaGenerale({
      competizioni: competizioni ?? [],
      getClassifica: (giornata, blocco, definitiva) =>
        getClassificaCompetizione(supabase, giornata, blocco, definitiva),
    });

    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <a href="/classifiche" className="text-sm text-blue-600">
          ← Classifiche
        </a>

        <h1 className="mt-5 mb-6 text-4xl font-bold">
          Classifica Generale
        </h1>

        {error && (
          <pre className="text-red-600">
            {JSON.stringify(error, null, 2)}
          </pre>
        )}

        <section className="rounded-2xl bg-white p-4 shadow">
          <div className="grid gap-2">
            {data?.map((r) => (
              <a
                key={r.partecipante}
                href={`/partecipanti/${encodeURIComponent(r.partecipante)}`}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-8 text-xl font-bold">{r.posizione}.</div>
                  <div className="truncate font-semibold">{r.partecipante}</div>
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

  const configurazione = MAPPA_COMPETIZIONI[competizioneNorm];

  const giornata = configurazione?.giornata ?? competizioneNorm.slice(0, 2);
  const blocco = configurazione?.blocco ?? competizioneNorm.slice(2);
  const titoloPagina = configurazione?.titolo ?? `Classifica ${giornata} ${blocco}`;

  const { data: statoCompetizione } = await supabase
    .from("v_competizioni_concluse")
    .select("conclusa")
    .eq("giornata", giornata)
    .eq("blocco", blocco)
    .maybeSingle();

  const competizioneConclusa = statoCompetizione?.conclusa ?? false;

  const { data, error } = await supabase
  .from("v_formazioni_competizione_live")
  .select("*")
  .eq("competizione_codice", competizioneNorm);

  const classifica = await getClassificaCompetizione(
    supabase,
    giornata,
    blocco,
    competizioneConclusa
  );

  console.log("DEBUG CLASSIFICA", {
    competizioneNorm,
    giornata,
    blocco,
    competizioneConclusa,
    righeView: data?.length ?? 0,
    righeClassifica: classifica.length,
  });

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <a href="/classifiche" className="text-sm text-blue-600">
        ← Classifiche
      </a>

      <h1 className="mt-5 mb-6 text-4xl font-bold">
        {titoloPagina}
      </h1>

      {error && (
        <pre className="text-red-600">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <section className="rounded-2xl bg-white p-4 shadow">
        <div className="grid gap-2">
          {classifica.length === 0 && (
            <div className="text-slate-500">
              Nessun dato disponibile.
            </div>
          )}

          {classifica.map((r) => (
            <a
              key={r.partecipante}
              href={`/formazioni-competizione/${competizioneNorm}/dettaglio?partecipante=${encodeURIComponent(
  r.partecipante.toLowerCase().replaceAll(" ", "")
)}`}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-8 text-xl font-bold">{r.posizione}.</div>
                <div className="truncate font-semibold">{r.partecipante}</div>
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