import { supabase } from "../../../../../lib/supabase";

import {
  calcolaFormazioneEffettiva,
  calcolaTotaleFormazione,
  votoDaUsare,
} from "../../../../../lib/fantagoat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FormazionePage({
  params,
}: {
  params: Promise<{
    partecipante: string;
    giornata: string;
    blocco: string;
  }>;
}) {
  const { partecipante, giornata, blocco } = await params;

  const nomePartecipante = decodeURIComponent(partecipante);
  const giornataNorm = giornata.toUpperCase();
  const bloccoNorm = blocco.toUpperCase();

  const { data: partecipanteRow } = await supabase
    .from("partecipanti")
    .select("id")
    .eq("nome", nomePartecipante)
    .single();

  const { data: metaFormazione } = partecipanteRow
    ? await supabase
        .from("formazioni_meta")
        .select("created_at")
        .eq("partecipante_id", partecipanteRow.id)
        .eq("giornata", giornataNorm)
        .eq("blocco", bloccoNorm)
        .maybeSingle()
    : { data: null };

  const { data: statoCompetizione } = await supabase
    .from("v_competizioni_concluse")
    .select("conclusa")
    .eq("giornata", giornataNorm)
    .eq("blocco", bloccoNorm)
    .single();

  const competizioneConclusa = statoCompetizione?.conclusa ?? false;

  const { data, error } = await supabase
    .from("v_formazioni_dettaglio_live")
    .select("*")
    .eq("partecipante", nomePartecipante)
    .eq("giornata", giornataNorm)
    .eq("blocco", bloccoNorm)
    .order("ordine");

  const titolari = data?.filter((g) => g.tipo === "Titolare") ?? [];
  const panchina = data?.filter((g) => g.tipo === "Panchina") ?? [];

  const risultato = calcolaFormazioneEffettiva(titolari, panchina);
  const totaleFinale = calcolaTotaleFormazione(data ?? []);

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a href="/" className="text-blue-600 text-sm">
        ← Home
      </a>

      <header className="mt-5 mb-6">
        <h1 className="text-4xl font-bold">{nomePartecipante}</h1>

        {metaFormazione?.created_at && (
          <div className="text-sm text-slate-500 mt-1 mb-3">
            Ultimo salvataggio:{" "}
            {new Date(metaFormazione.created_at).toLocaleString("it-IT", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Europe/Rome",
            })}
          </div>
        )}

        <div
          className={`inline-block rounded-full px-3 py-1 text-sm font-semibold mb-4 ${
            competizioneConclusa
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {competizioneConclusa ? "Giornata conclusa" : "Giornata in corso"}
        </div>

        <div className="text-slate-600 mt-1">
          Formazione {giornataNorm} {bloccoNorm}
        </div>

        <div className="text-slate-500 text-sm mt-1">
          Modulo dichiarato: {data?.[0]?.modulo_dichiarato}
        </div>

        <div className="text-slate-500 text-sm">
          Modulo finale:{" "}
          <span className="font-bold">{risultato.moduloFinale}</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mt-4">
          <h2 className="font-bold text-lg mb-3">
            Riepilogo punteggio
          </h2>

          <div className="flex justify-between text-xl font-bold">
            <span>Totale</span>
            <span>{totaleFinale}</span>
          </div>
        </div>
      </header>

      {error && (
        <pre className="text-red-600">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-3">Formazione titolare</h2>

        <div className="grid gap-2">
          {risultato.effettivi.map((g, index) => (
            <div
              key={`${g.giocatore_id}-${g.stato}-${index}`}
              className={`bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between ${
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

                  {g.avversario && (
                    <span className="ml-2 text-slate-400">
                      vs. {g.avversario}
                    </span>
                  )}

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
                  <div className="text-xs font-bold text-green-700 mt-1">
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
        <h2 className="text-xl font-bold mb-3">Sostituzioni</h2>

        <div className="grid gap-2">
          {risultato.sostituzioni.length === 0 && (
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm text-slate-500">
              Nessuna sostituzione
            </div>
          )}

          {risultato.sostituzioni.map((s, index) => (
            <div
              key={index}
              className="bg-white rounded-xl px-4 py-3 shadow-sm"
            >
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

                  <div className="text-sm text-red-600 font-bold">
                    Nessun sostituto valido
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Panchina</h2>

        <p className="text-sm text-slate-500 mt-1 mb-3">
          L&apos;ordine della panchina determina la priorità delle sostituzioni,
          purché sia possibile schierare un modulo consentito.
        </p>

        <div className="grid gap-2">
          {panchina.map((g, index) => (
            <div
              key={`${g.giocatore_id}-${index}`}
              className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between"
            >
              <div>
                <div className="font-semibold">
                  {g.ordine}. {g.giocatore}
                </div>

                <div className="text-sm text-slate-500">
                  {g.ruolo} - {g.nazionale}

                  {g.avversario && (
                    <span className="ml-2 text-slate-400">
                      vs. {g.avversario}
                    </span>
                  )}
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