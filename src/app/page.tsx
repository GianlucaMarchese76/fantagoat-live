import { supabase } from "../lib/supabase";
import { calcolaTotaleFormazione } from "../lib/calcoloFormazione";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function labelCompetizione(giornata: string, blocco: string) {
  if (giornata.startsWith("G")) {
    return `Giornata ${giornata.slice(1)} ${blocco}`;
  }

  return `${giornata} ${blocco}`.trim();
}

function calcolaLive(rows: any[]) {
  const bonusModulo = Number(rows[0]?.bonus_malus_modulo ?? 0);

  return (
    rows
      .filter((g) => g.tipo === "Titolare")
      .reduce(
        (totale, g) => totale + Number(g.fantapunti_live ?? 0),
        0
      ) + bonusModulo
  );
}

async function calcolaClassificaCompetizione(
  giornata: string,
  blocco: string,
  definitiva: boolean
) {
  const { data } = await supabase
    .from("v_formazioni_dettaglio_live")
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

  return Array.from(gruppi.entries())
    .map(([partecipante, rows]) => {
      const rowsCalcolo = rows.map((r) => ({
        ...r,
        voto: definitiva ? r.voto : r.voto_live,
        fantapunti: definitiva ? r.fantapunti : r.fantapunti_live,
      }));

      return {
        partecipante,
        punti: definitiva
          ? calcolaTotaleFormazione(rowsCalcolo)
          : calcolaLive(rowsCalcolo),
      };
    })
    .sort((a, b) => b.punti - a.punti)
    .map((r, index) => ({
      ...r,
      posizione: index + 1,
    }));
}

export default async function Home() {
  const { data: competizioni } = await supabase
    .from("v_competizioni_concluse")
    .select("*")
    .order("giornata")
    .order("blocco");

  const { data: partite } = await supabase
    .from("calendario_partite")
    .select("giornata, blocco, kickoff")
    .order("kickoff");

  const now = new Date();

  const blocchi = new Map<
    string,
    {
      giornata: string;
      blocco: string;
      primaPartita: Date;
      deadline: Date;
    }
  >();

  for (const p of partite ?? []) {
    const key = `${p.giornata}-${p.blocco}`;
    const kickoff = new Date(p.kickoff);

    if (!blocchi.has(key) || kickoff < blocchi.get(key)!.primaPartita) {
      blocchi.set(key, {
        giornata: p.giornata,
        blocco: p.blocco,
        primaPartita: kickoff,
        deadline: new Date(kickoff.getTime() - 5 * 60 * 1000),
      });
    }
  }

  const prossimaDeadline = Array.from(blocchi.values())
    .filter((b) => now < b.deadline)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())[0];

  const competizioniChiuse =
    competizioni?.filter((c) => c.conclusa) ?? [];

  const generaleMap = new Map<string, number>();

  for (const c of competizioniChiuse) {
    const classifica = await calcolaClassificaCompetizione(
      c.giornata,
      c.blocco,
      true
    );

    for (const r of classifica) {
      generaleMap.set(
        r.partecipante,
        (generaleMap.get(r.partecipante) ?? 0) + Number(r.punti)
      );
    }
  }

  const generale = Array.from(generaleMap.entries())
    .map(([partecipante, punti]) => ({
      partecipante,
      punti,
    }))
    .sort((a, b) => b.punti - a.punti)
    .map((r, index) => ({
      ...r,
      posizione: index + 1,
    }));

  const competizioneLive = Array.from(blocchi.values())
    .filter((b) => now >= b.primaPartita)
    .find((b) => {
      const stato = competizioni?.find(
        (c) => c.giornata === b.giornata && c.blocco === b.blocco
      );

      return stato && !stato.conclusa;
    });

  const classificaLive = competizioneLive
    ? await calcolaClassificaCompetizione(
        competizioneLive.giornata,
        competizioneLive.blocco,
        false
      )
    : [];

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
            <h3 className="text-xl font-bold mb-1">
              Classifica Generale
            </h3>

            <div className="text-sm text-slate-500 mb-3">
              Totale complessivo giornate concluse.
            </div>

            <div className="grid gap-2">
              {generale.slice(0, 4).map((r) => (
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
            <h3 className="text-xl font-bold mb-2">
              Classifica Live
            </h3>

            {competizioneLive ? (
              <>
                <div className="text-slate-600 mb-3">
                  {labelCompetizione(
                    competizioneLive.giornata,
                    competizioneLive.blocco
                  )}
                </div>

                <div className="grid gap-2">
                  {classificaLive.slice(0, 4).map((r) => (
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
                  href={`/classifiche/${competizioneLive.giornata}${competizioneLive.blocco}`}
                  className="block mt-4 text-blue-600 text-sm font-semibold"
                >
                  → Apri classifica live
                </a>
              </>
            ) : (
              <div className="text-slate-600">
                Nessuna giornata live in corso.
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

            {prossimaDeadline ? (
              <div className="text-blue-100">
                Scadenza:{" "}
                {labelCompetizione(
                  prossimaDeadline.giornata,
                  prossimaDeadline.blocco
                )}{" "}
                ·{" "}
                {prossimaDeadline.deadline.toLocaleString("it-IT", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Europe/Rome",
                })}
              </div>
            ) : (
              <div className="text-blue-100">
                Il torneo si è concluso.
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
              Scopri le rose dei partecipanti.
            </div>

<section className="mt-8">
  <h2 className="text-sm font-bold text-slate-500 mb-3">
    REGOLAMENTO
  </h2>

  <a
    href="/regolamento"
    className="bg-white rounded-2xl shadow p-4 block"
  >
    <div className="text-xl font-bold">
      Regolamento FantaGOAT2026
    </div>

    <div className="text-slate-600">
      Regolamento ufficiale, riferimento Gazzetta ed eccezioni FantaGOAT.
    </div>
  </a>
</section>

          </a>
        </div>
      </section>
    </main>
  );
}