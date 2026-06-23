import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    .select("id,nome,ruolo,nazionale,quotazione_sedicesimi,quotazione_ottavi,quotazione_quarti,quotazione_semifinali,quotazione_finale")
    .order("quotazione_sedicesimi", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4">
      <a href="/" className="text-slate-300 text-sm">
        ← Home
      </a>

      <h1 className="text-3xl font-bold mt-4">Crea Rosa</h1>

      <p className="text-slate-400 mt-1">
        Seleziona competizione, partecipante e costruisci la rosa.
      </p>

      <section className="mt-6 grid gap-4">
        <div className="rounded-2xl bg-slate-900 p-4">
          <h2 className="font-bold mb-3">Competizioni</h2>

          <div className="grid gap-2">
            {competizioni?.map((c) => (
              <a
                key={c.id}
                href={`/crea-rosa/${c.codice}`}
                className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3"
              >
                <div>
                  <div className="font-semibold">{c.nome}</div>
                  <div className="text-xs text-slate-400">
                    Budget {c.budget} · Max {c.max_per_nazionale} per nazionale
                  </div>
                </div>

                <div className="text-pink-400 font-bold">
                  ×{c.moltiplicatore}
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900 p-4">
          <h2 className="font-bold mb-3">Partecipanti</h2>

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
          <h2 className="font-bold mb-3">Giocatori disponibili</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400">
                <tr>
                  <th className="text-left py-2">Giocatore</th>
                  <th className="text-left py-2">Ruolo</th>
                  <th className="text-left py-2">Naz</th>
                  <th className="text-right py-2">Sedicesimi</th>
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