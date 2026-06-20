import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InserisciFormazioneIndex() {
  const { data: partecipanti } = await supabase
    .from("partecipanti")
    .select("nome")
    .order("nome");

  const { data: partite } = await supabase
    .from("calendario_partite")
    .select("giornata, blocco, kickoff")
    .order("kickoff");

  const aperteMap = new Map<string, {
    giornata: string;
    blocco: string;
    primaPartita: Date;
    chiusura: Date;
  }>();

  for (const p of partite ?? []) {
    const key = `${p.giornata}-${p.blocco}`;
    const kickoff = new Date(p.kickoff);

    if (!aperteMap.has(key) || kickoff < aperteMap.get(key)!.primaPartita) {
      aperteMap.set(key, {
        giornata: p.giornata,
        blocco: p.blocco,
        primaPartita: kickoff,
        chiusura: new Date(kickoff.getTime() - 5 * 60 * 1000),
      });
    }
  }

  const competizioniAperte = Array.from(aperteMap.values())
    .filter((c) => new Date() < c.chiusura)
    .sort((a, b) => a.primaPartita.getTime() - b.primaPartita.getTime());

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a href="/" className="text-blue-600 text-sm">
        ← Home
      </a>

      <h1 className="text-4xl font-bold mt-5 mb-2">
        📝 Inserisci Formazione
      </h1>

      <p className="text-slate-600 mb-6">
        Seleziona partecipante e competizione ancora aperta.
      </p>

      {competizioniAperte.length === 0 && (
        <section className="bg-white rounded-2xl shadow p-4">
          <div className="text-slate-600">
            Nessuna formazione inseribile al momento.
          </div>
        </section>
      )}

      <div className="grid gap-4">
        {competizioniAperte.map((c) => (
          <section
            key={`${c.giornata}-${c.blocco}`}
            className="bg-white rounded-2xl shadow p-4"
          >
            <h2 className="text-2xl font-bold">
              {c.giornata}
              {c.blocco}
            </h2>

            <p className="text-sm text-slate-500 mb-3">
              Chiusura inserimento:{" "}
              {c.chiusura.toLocaleString("it-IT", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Rome",
})}
            </p>

            <div className="grid gap-2">
              {(partecipanti ?? []).map((p) => (
                <a
                  key={`${p.nome}-${c.giornata}-${c.blocco}`}
                  href={`/inserisci-formazione/${encodeURIComponent(
                    p.nome
                  )}/${c.giornata}/${c.blocco}`}
                  className="rounded-xl bg-slate-50 px-4 py-3 font-semibold"
                >
                  {p.nome}
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}