import { supabase } from "../../lib/supabase";

const giornate = ["G1AF", "G1GL", "G2AF", "G2GL", "G3AF", "G3GL"];

function splitCompetizione(c: string) {
  return {
    giornata: c.slice(0, 2),
    blocco: c.slice(2),
  };
}

export default async function FormazioniPage() {
  const { data: partecipanti, error } = await supabase
    .from("partecipanti")
    .select("*")
    .order("nome");

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

      <div className="grid gap-5">
        {partecipanti?.map((p) => (
          <section
            key={p.id}
            className="bg-white rounded-2xl shadow p-4"
          >
            <h2 className="text-2xl font-bold mb-3">
              {p.nome}
            </h2>

            <div className="grid grid-cols-2 gap-2">
              {giornate.map((c) => {
                const { giornata, blocco } = splitCompetizione(c);

                return (
                  <a
                    key={c}
                    href={`/formazioni/${p.nome}/${giornata}/${blocco}`}
                    className="bg-slate-100 rounded-xl px-4 py-3 text-center font-bold"
                  >
                    {c}
                  </a>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}