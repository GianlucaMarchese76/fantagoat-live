import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const { data: generale } = await supabase
    .from("v_classifica_generale")
    .select("*")
    .order("posizione")
    .limit(4);

  const { data: competizioni } = await supabase
    .from("v_competizioni_concluse")
    .select("*")
    .order("giornata")
    .order("blocco");

  const live = competizioni?.find((c) => !c.conclusa);

  const { data: partite } = await supabase
    .from("calendario_partite")
    .select("giornata, blocco, kickoff")
    .order("kickoff");

  const prossima = partite
    ?.map((p) => {
      const kickoff = new Date(p.kickoff);
      return {
        giornata: p.giornata,
        blocco: p.blocco,
        kickoff,
        deadline: new Date(kickoff.getTime() - 5 * 60 * 1000),
      };
    })
    .filter((p) => new Date() < p.deadline)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())[0];

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <header className="mb-6">
        <h1 className="text-4xl font-bold">🏆 FantaGOAT Live</h1>
        <p className="text-slate-600 mt-2">
          Classifiche, rose e formazioni aggiornate.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-sm font-bold text-slate-500 mb-3">
          CLASSIFICHE
        </h2>

        <div className="grid gap-4">
          <section className="bg-white rounded-2xl shadow p-4">
            <h3 className="text-xl font-bold mb-3">Classifica Generale</h3>

            <div className="grid gap-2">
              {generale?.map((r) => (
                <div
                  key={r.partecipante}
                  className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"
                >
                  <div className="font-semibold">
                    {r.posizione}. {r.partecipante}
                  </div>

                  <div className="text-xl font-bold tabular-nums">
                    {r.punti}
                  </div>
                </div>
              ))}
            </div>

            <a
              href="/classifiche/generale"
              className="block mt-4 text-blue-600 text-sm font-semibold"
            >
              → Apri classifica generale
            </a>
          </section>

          <section className="bg-white rounded-2xl shadow p-4">
            <h3 className="text-xl font-bold mb-2">Classifica Live</h3>

            {live ? (
              <>
                <div className="text-slate-600 mb-3">
                  Competizione in corso:{" "}
                  <span className="font-semibold">
                    {live.giornata}
                    {live.blocco}
                  </span>
                </div>

                <a
                  href={`/classifiche/${live.giornata}${live.blocco}`}
                  className="block bg-slate-100 rounded-xl px-4 py-3 text-center font-bold"
                >
                  Apri classifica live →
                </a>
              </>
            ) : (
              <div className="text-slate-600">
                Nessuna competizione in corso.
              </div>
            )}

            <a
              href="/classifiche"
              className="block mt-4 text-blue-600 text-sm font-semibold"
            >
              → Tutte le classifiche
            </a>
          </section>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-500 mb-3">
          ROSA E FORMAZIONI
        </h2>

        <div className="grid gap-4">
          <a
            href="/inserisci-formazione"
            className="bg-blue-600 text-white rounded-2xl shadow p-5 block"
          >
            <div className="text-2xl font-bold mb-2">
              ⚡ Schiera Formazione
            </div>

            {prossima ? (
              <div className="text-blue-100">
                Prossima consegna: {prossima.giornata}
                {prossima.blocco} ·{" "}
                {prossima.deadline.toLocaleString("it-IT", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Europe/Rome",
                })}
              </div>
            ) : (
              <div className="text-blue-100">
                Nessuna consegna aperta al momento.
              </div>
            )}
          </a>

          <a
            href="/formazioni"
            className="bg-white rounded-2xl shadow p-4 block"
          >
            <div className="text-xl font-bold">Formazioni</div>
            <div className="text-slate-600">
              Consulta le formazioni schierate.
            </div>
          </a>

          <a
            href="/rose"
            className="bg-white rounded-2xl shadow p-4 block"
          >
            <div className="text-xl font-bold">Rose</div>
            <div className="text-slate-600">
              Consulta le rose dei partecipanti.
            </div>
          </a>
        </div>
      </section>
    </main>
  );
}