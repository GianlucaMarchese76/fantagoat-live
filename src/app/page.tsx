import { supabase } from "../lib/supabase";

export default async function Home() {
  const { data: classifica, error } = await supabase
    .from("v_classifica_generale")
    .select("*")
    .order("posizione");

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <header className="mb-6">
        <h1 className="text-4xl font-bold">
          🏆 FantaGOAT Live
        </h1>

        <p className="text-slate-600 mt-2">
          Classifiche, rose e formazioni aggiornate.
        </p>
      </header>

      <section className="bg-white rounded-2xl shadow p-4 mb-6">
        <h2 className="text-xl font-bold mb-3">
          Classifica Generale
        </h2>

        {error && (
          <pre className="text-red-600">
            {JSON.stringify(error, null, 2)}
          </pre>
        )}

        <div className="grid gap-2">
          {classifica?.map((r) => (
            <a
              key={r.partecipante}
              href={`/partecipanti/${r.partecipante}`}
              className="flex items-center justify-between rounded-lg px-2 py-1"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 font-bold">
                  {r.posizione}.
                </div>

                <div className="font-medium truncate">
                  {r.partecipante}
                </div>
              </div>

              <div className="font-bold tabular-nums">
                {r.punti}
              </div>
            </a>
          ))}
        </div>

        <a
          href="/classifiche"
          className="block mt-4 text-blue-600 text-sm font-semibold"
        >
          Vedi classifiche di giornata →
        </a>
      </section>

      <section className="grid gap-3">
        <a
          href="/rose"
          className="bg-white rounded-2xl shadow p-4 block"
        >
          <div className="text-xl font-bold">Rose</div>
          <div className="text-slate-600">
            Consulta le rose A-F e G-L dei partecipanti.
          </div>
        </a>

        <a
          href="/formazioni"
          className="bg-white rounded-2xl shadow p-4 block"
        >
          <div className="text-xl font-bold">Formazioni</div>
          <div className="text-slate-600">
            Titolari, panchina, capitani e vice.
          </div>
        </a>
      </section>
    </main>
  );
}