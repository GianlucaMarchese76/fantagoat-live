import { supabase } from "../../../lib/supabase";

import {
  calcolaFormazioneEffettiva,
  calcolaVotoCapitano,
  calcolaModDifesa,
  calcolaModCentrocampo,
  calcolaBonusModulo,
} from "../../../lib/fantagoat";

function numero(v: any) {
  return Number(v ?? 0);
}

function mappingCompetizione(codice: string) {
  const map: Record<string, { giornata: string; blocco: string }> = {
    "16ALTA": { giornata: "sedicesimi", blocco: "1-8" },
    "16BASSA": { giornata: "sedicesimi", blocco: "9-16" },
    "8ALTA": { giornata: "ottavi", blocco: "1-4" },
    "8BASSA": { giornata: "ottavi", blocco: "5-8" },
    "QUARTI": { giornata: "quarti", blocco: "unico" },
    "SEMIFINALI": { giornata: "semifinale", blocco: "unico" },
    "TERZOPOSTO": { giornata: "TERZOPOSTO", blocco: "unico" },
    "FINALE": { giornata: "finale", blocco: "unico" },
  };

  return map[codice];
}

function votoDaUsare(g: any) {
  return numero(g.voto_live ?? g.voto);
}

export default async function RisultatiCompetizionePage({
  params,
  searchParams,
}: {
  params: Promise<{ competizione: string }>;
  searchParams: Promise<{ partecipante?: string }>;
}) {
  const { competizione } = await params;
  const { partecipante } = await searchParams;

  const codiceCompetizione = competizione.toUpperCase();

  if (!partecipante) {
    return <main className="p-6">Partecipante mancante.</main>;
  }

  const mapping = mappingCompetizione(codiceCompetizione);

  if (!mapping) {
    return <main className="p-6">Competizione non riconosciuta.</main>;
  }

  const { data: competizioneRow } = await supabase
    .from("competizioni")
    .select("*")
    .eq("codice", codiceCompetizione)
    .single();

  const { data: partecipanteRow } = await supabase
    .from("partecipanti")
    .select("*")
    .eq("slug", partecipante)
    .single();

  if (!competizioneRow || !partecipanteRow) {
    return <main className="p-6">Competizione o partecipante non trovato.</main>;
  }

  const { data: formazioneRows, error } = await supabase
    .from("formazioni_competizione")
    .select("*")
    .eq("competizione_id", competizioneRow.id)
    .eq("partecipante_id", partecipanteRow.id)
    .order("tipo")
    .order("ordine");

  const giocatoreIds = (formazioneRows ?? []).map((r) => r.giocatore_id);

  const { data: giocatori } = await supabase
    .from("giocatori")
    .select("id,nome,ruolo,nazionale")
    .in("id", giocatoreIds);

  const { data: punteggi } = await supabase
    .from("punteggi_giocatori")
    .select("*")
    .eq("giornata", mapping.giornata)
    .eq("blocco", mapping.blocco)
    .in("giocatore_id", giocatoreIds);

  const { data: golDecisivi } = await supabase
    .from("gol_decisivi")
    .select("*")
    .eq("giornata", mapping.giornata)
    .eq("blocco", mapping.blocco)
    .in("giocatore_id", giocatoreIds);

  const giocatoriById = new Map((giocatori ?? []).map((g) => [g.id, g]));
  const punteggiById = new Map((punteggi ?? []).map((p) => [p.giocatore_id, p]));
  const golDecisiviById = new Map(
    (golDecisivi ?? []).map((g) => [g.giocatore_id, g])
  );

  const righe = (formazioneRows ?? []).map((r) => {
    const giocatore = giocatoriById.get(r.giocatore_id);
    const punteggio = punteggiById.get(r.giocatore_id);
    const golDecisivo = golDecisiviById.get(r.giocatore_id);

    const voto = punteggio?.voto_g2 ?? punteggio?.voto;
    const fantapuntiBase = punteggio?.fantapunti_g2 ?? punteggio?.fantapunti;
    const puntiGolDecisivo = numero(golDecisivo?.punti);

    const haVoto = voto !== null && voto !== undefined;

    return {
      giocatore_id: r.giocatore_id,
      giocatore: giocatore?.nome ?? "Giocatore non trovato",
      ruolo: giocatore?.ruolo ?? "",
      nazionale: giocatore?.nazionale ?? "",
      tipo: r.tipo === "titolare" ? "Titolare" : "Panchina",
      ordine: r.ordine,
      is_capitano: r.is_capitano,
      is_vice: r.is_vice,
      modulo_dichiarato: r.modulo,
      bonus_malus_modulo: r.bonus_malus_modulo,
      voto,
      voto_live: voto,
      fantapunti: numero(fantapuntiBase) + puntiGolDecisivo,
      fantapunti_calcolo: numero(fantapuntiBase) + puntiGolDecisivo,
      stato_giocatore: haVoto ? "ha_voto" : "non_ha_giocato",
      avversario: null,
    };
  });

  const titolari = righe.filter((g) => g.tipo === "Titolare");
  const panchina = righe.filter((g) => g.tipo === "Panchina");

  const risultato = calcolaFormazioneEffettiva(titolari, panchina);

  const totaleGiocatori = risultato.totaleGiocatori;
  const votoCapitano = calcolaVotoCapitano(risultato.effettivi);
  const modificatoreDifesa = calcolaModDifesa(risultato.effettivi);
  const modificatoreCentrocampo = calcolaModCentrocampo(risultato.effettivi);
  const bonusModulo = calcolaBonusModulo(risultato.moduloFinale);

  const totaleFinale =
    totaleGiocatori +
    votoCapitano +
    modificatoreDifesa +
    modificatoreCentrocampo +
    bonusModulo;

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <a href="/" className="text-sm text-blue-600">← Home</a>

      <header className="mt-5 mb-6">
        <h1 className="text-4xl font-bold">{partecipanteRow.nome}</h1>

        <div className="mt-1 text-slate-600">
          {competizioneRow.nome} · {mapping.giornata} {mapping.blocco}
        </div>

        <div className="mt-1 text-sm text-slate-500">
          Modulo dichiarato: {righe[0]?.modulo_dichiarato ?? "-"}
        </div>

        <div className="text-sm text-slate-500">
          Modulo finale: <span className="font-bold">{risultato.moduloFinale}</span>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-bold">Riepilogo punteggio</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Giocatori</span>
              <span>{totaleGiocatori}</span>
            </div>

            <div className="flex justify-between">
              <span>Voto capitano</span>
              <span>{votoCapitano}</span>
            </div>

            <div className="flex justify-between">
              <span>Modificatore difesa</span>
              <span>{modificatoreDifesa}</span>
            </div>

            <div className="flex justify-between">
              <span>Modificatore centrocampo</span>
              <span>{modificatoreCentrocampo}</span>
            </div>

            <div className="flex justify-between">
              <span>Bonus/malus modulo</span>
              <span>{bonusModulo}</span>
            </div>

            <hr className="my-2" />

            <div className="flex justify-between text-xl font-bold">
              <span>Totale</span>
              <span>{totaleFinale}</span>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <pre className="mb-4 text-red-600">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-xl font-bold">Formazione titolare</h2>

        <div className="grid gap-2">
          {risultato.effettivi.map((g: any, index: number) => (
            <div
              key={`${g.giocatore_id}-${index}`}
              className={`flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ${
                g.stato === "entrato"
                  ? "border-2 border-green-300"
                  : g.stato === "ufficio"
                  ? "border-2 border-red-300"
                  : ""
              }`}
            >
              <div>
                <div className="font-semibold">{g.giocatore}</div>

                <div className="text-sm text-slate-500">
                  {g.ruolo} - {g.nazionale}

                  {g.is_capitano && (
                    <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800">
                      Capitano
                    </span>
                  )}

                  {g.is_vice && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                      Vice
                    </span>
                  )}
                </div>

                {g.stato === "entrato" && (
                  <div className="mt-1 text-xs font-bold text-green-700">
                    ENTRATO PER {g.sostituisce}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-xl font-bold tabular-nums">
                  {g.fantapunti_calcolo}
                </div>

                <div className="text-xs text-slate-500">
                  voto {votoDaUsare(g)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-xl font-bold">Sostituzioni</h2>

        <div className="grid gap-2">
          {risultato.sostituzioni.length === 0 && (
            <div className="rounded-xl bg-white px-4 py-3 text-slate-500 shadow-sm">
              Nessuna sostituzione
            </div>
          )}

          {risultato.sostituzioni.map((s: any, index: number) => (
            <div key={index} className="rounded-xl bg-white px-4 py-3 shadow-sm">
              {s.tipo === "sostituzione" ? (
                <>
                  <div className="font-semibold">
                    {s.out.giocatore} → {s.in.giocatore}
                  </div>

                  <div className="text-sm text-slate-500">
                    {s.out.ruolo} esce, entra {s.in.ruolo}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold">{s.out.giocatore}</div>
                  <div className="text-sm font-bold text-red-600">
                    Nessun sostituto valido
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Panchina</h2>

        <div className="grid gap-2">
          {panchina.map((g: any, index: number) => (
            <div
              key={`${g.giocatore_id}-${index}`}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm"
            >
              <div>
                <div className="font-semibold">
                  {g.ordine}. {g.giocatore}
                </div>

                <div className="text-sm text-slate-500">
                  {g.ruolo} - {g.nazionale}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold tabular-nums">
                  {g.fantapunti}
                </div>

                <div className="text-xs text-slate-500">
                  voto {votoDaUsare(g)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}