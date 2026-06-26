import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function labelCompetizione(giornata: string, blocco: string) {
  if (giornata === "sedicesimi" && blocco === "1-8") return "Sedicesimi • Gare 1-8";
  if (giornata === "sedicesimi" && blocco === "9-16") return "Sedicesimi • Gare 9-16";
  if (giornata === "ottavi" && blocco === "1-4") return "Ottavi • Gare 1-4";
  if (giornata === "ottavi" && blocco === "5-8") return "Ottavi • Gare 5-8";
  if (giornata === "quarti") return "Quarti di finale";
  if (giornata === "semifinale") return "Semifinali";
  if (giornata === "terzo_posto") return "Finale 3° posto";
  if (giornata === "finale") return "Finale";
  if (giornata.startsWith("G")) return `${giornata}${blocco}`;

  return `${giornata} ${blocco}`.trim();
}

function codiceCompetizione(giornata: string, blocco: string) {
  if (giornata === "sedicesimi" && blocco === "1-8") return "16ALTA";
  if (giornata === "sedicesimi" && blocco === "9-16") return "16BASSA";
  if (giornata === "ottavi" && blocco === "1-4") return "8ALTA";
  if (giornata === "ottavi" && blocco === "5-8") return "8BASSA";
  if (giornata === "quarti") return "QUARTI";
  if (giornata === "semifinale") return "SEMIFINALI";
  if (giornata === "terzo_posto") return "TERZOPOSTO";
  if (giornata === "finale") return "FINALE";

  return null;
}

function hrefFormazione({
  partecipante,
  giornata,
  blocco,
}: {
  partecipante: string;
  giornata: string;
  blocco: string;
}) {
  const codice = codiceCompetizione(giornata, blocco);

  if (codice) {
    return `/formazioni-competizione/${codice}?partecipante=${encodeURIComponent(
      partecipante
    )}`;
  }

  return `/inserisci-formazione/${encodeURIComponent(
    partecipante
  )}/${giornata}/${blocco}`;
}

export default async function InserisciFormazioneIndex() {
  const { data: partecipanti } = await supabase
    .from("partecipanti")
    .select("nome")
    .order("nome");

  const { data: partite } = await supabase
    .from("calendario_partite")
    .select("giornata, blocco, kickoff")
    .order("kickoff");

  const aperteMap = new Map<
    string,
    {
      giornata: string;
      blocco: string;
      primaPartita: Date;
      chiusura: Date;
    }
  >();

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
    <main className="min-h-screen bg-slate-100 p-4">
      <a href="/" className="text-sm text-blue-600">
        ← Home
      </a>

      <h1 className="mt-5 mb-2 text-3xl font-black leading-tight">
        📝 Inserisci formazione
      </h1>

      <p className="mb-6 text-slate-600">
        Seleziona partecipante e competizione.
      </p>

      {competizioniAperte.length === 0 && (
        <section className="rounded-2xl bg-white p-4 shadow">
          <div className="text-slate-600">
            Nessuna formazione inseribile al momento.
          </div>
        </section>
      )}

      <div className="grid gap-4">
        {competizioniAperte.map((c) => (
          <section
            key={`${c.giornata}-${c.blocco}`}
            className="rounded-2xl bg-white p-4 shadow"
          >
            <h2 className="text-2xl font-bold">
              {labelCompetizione(c.giornata, c.blocco)}
            </h2>

            <p className="mb-3 text-sm text-slate-500">
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
                  href={hrefFormazione({
                    partecipante: p.nome,
                    giornata: c.giornata,
                    blocco: c.blocco,
                  })}
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