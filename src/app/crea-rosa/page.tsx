import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const competizioniChiuse = new Set(["SEMIFINALI"]);

export default async function CreaRosaPage() {
  const { data: competizioni } = await supabase
    .from("competizioni")
    .select("*")
    .order("ordine");

  const { data: partecipanti } = await supabase
    .from("partecipanti")
    .select("*")
    .order("nome");

  const { data: giocatori } = await supabase
    .from("giocatori")
    .select(
      "id,nome,ruolo,nazionale,quotazione_sedicesimi,quotazione_ottavi,quotazione_quarti,quotazione_semifinali,quotazione_finale"
    )
    .order("quotazione_sedicesimi", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white">
      <a href="/" className="text-sm text-slate-300">
        ← Home
      </a>

      <h1 className="mt-4 text-3xl font-bold">Crea Rosa</h1>

      <p className="mt-1 text-slate-400">
        Seleziona competizione, partecipante e costruisci la rosa.
      </p>

      <section className="mt-6 grid gap-4">
        <div className="rounded-2xl bg-slate-900 p-4">
          <h2 className="mb-3 font-bold">Competizioni</h2>

          <div className="grid gap-2">
            {competizioni?.map((c) => {
              const chiusa = competizioniChiuse.has(
                String(c.codice).toUpperCase()
              );

              if (chiusa) {
                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-red-900/60 bg-slate-800 px-4 py-3 opacity-70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{c.nome}</div>

                        <div className="mt-1 text-xs font-bold text-red-400">
                          Rosa chiusa · scadenza superata
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Budget {c.budget} · Max {c.max_per_nazionale} per
                          nazionale
                        </div>
                      </div>

                      <div className="shrink-0 rounded-full bg-red-950 px-3 py-1 text-xs font-bold text-red-300">
                        CHIUSA
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <a
                  key={c.id}
                  href={`/crea-rosa/${c.codice}`}
                  className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3 transition hover:bg-slate-700"
                >
                  <div>
                    <div className="font-semibold">{c.nome}</div>

                    <div className="text-xs text-slate-400">
                      Budget {c.budget} · Max {c.max_per_nazionale} per
                      nazionale
                    </div>
                  </div>

                  <div className="font-bold text-pink-400">
                    ×{c.moltiplicatore}
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 p-4">
          <h2 className="mb-3 font-bold">Partecipanti</h2>

          <div className="grid gap-2">
            {partecipanti?.map((p) => (
              <div
                key={p.id}
                className="rounded-xl bg-slate-800 px-4 py-3"
              >
                {p.nome}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 p-4">
          <h2 className="mb-3 font-bold">Giocatori disponibili</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-2 text-left">Giocatore</th>
                  <th className="py-2 text-left">Ruolo</th>
                  <th className="py-2 text-left">Naz</th>
                  <th className="py-2 text-right">Sedicesimi</th>
                </tr>
              </thead>

              <tbody>
                {giocatori?.slice(0, 30).map((g) => (
                  <tr key={g.id} className="border-t border-slate-800">
                    <td className="py-2">{g.nome}</td>
                    <td className="py-2">{g.ruolo}</td>
                    <td className="py-2">{g.nazionale}</td>
                    <td className="py-2 text-right font-bold text-green-400">
                      {g.quotazione_sedicesimi ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}