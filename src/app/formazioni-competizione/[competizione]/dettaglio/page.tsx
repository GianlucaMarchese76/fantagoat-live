import { supabase } from "../../../../lib/supabase";
import { competizioniDesignanti } from "../../../../lib/fantagoat/continuitaCapitano";
import {
  calcolaDettaglioFormazione as calcolaDettaglioFormazioneFase2, votoDaUsare
} from "../../../../lib/fantagoat/calcoloFormazioneFase2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FormazioneCompetizioneDettaglioPage({
  params,
  searchParams,
}: {
  params: Promise<{ competizione: string }>;
  searchParams: Promise<{ partecipante?: string }>;
}) {
  const { competizione } = await params;
  const { partecipante } = await searchParams;

  const competizioneNorm = competizione.toUpperCase();
  const partecipanteNorm = partecipante
  ?.trim()
  .toLowerCase()
  .replaceAll(" ", "");

  if (!partecipanteNorm) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <a href="/" className="text-sm text-blue-600">← Home</a>
        <div className="mt-6 rounded-xl bg-white p-4 text-red-600 shadow-sm">
          Partecipante mancante nella URL.
        </div>
      </main>
    );
  }

  const { data: competizioneData } = await supabase
    .from("competizioni")
    .select("*")
    .eq("codice", competizioneNorm)
    .maybeSingle();

  const competizioneConclusa = competizioneData?.conclusa ?? false;

  const { data, error } = await supabase
    .from("v_formazioni_competizione_live")
    .select("*")
    .eq("competizione_codice", competizioneNorm)
    .eq("partecipante_slug", partecipanteNorm)
    .order("tipo")
    .order("ordine");

  console.log("DEBUG DETTAGLIO", {
    competizioneNorm,
    partecipanteNorm,
    righe: data?.length ?? 0,
    tipi: [...new Set((data ?? []).map((r) => r.tipo))],
    error,
  });

  const nomePartecipante = data?.[0]?.partecipante ?? partecipanteNorm;
  const nomeCompetizione = data?.[0]?.competizione_nome ?? competizioneNorm;

  const codiciDesignanti = competizioniDesignanti(competizioneNorm);

  let continuitaCapitano:
    | {
        capitaniPrecedenti: string[];
        vicePrecedenti: string[];
      }
    | undefined;

  if (codiciDesignanti.length > 0 && data?.length) {
    const { data: designati } = await supabase
      .from("v_formazioni_competizione_live")
      .select("giocatore_id,is_capitano,is_vice,competizione_codice")
      .eq("partecipante_id", data[0].partecipante_id)
      .in("competizione_codice", codiciDesignanti)
      .or("is_capitano.eq.true,is_vice.eq.true");

    continuitaCapitano = {
      capitaniPrecedenti:
        designati
          ?.filter((g) => g.is_capitano)
          .map((g) => g.giocatore_id) ?? [],

      vicePrecedenti:
        designati
          ?.filter((g) => g.is_vice)
          .map((g) => g.giocatore_id) ?? [],
    };
  }

  const panchina =
    data?.filter((g) => String(g.tipo).toLowerCase() === "panchina") ?? [];

  const dettaglio = calcolaDettaglioFormazioneFase2(
    data ?? [],
    continuitaCapitano
  );

  const risultato = dettaglio.risultato;
  const totaleFinale = dettaglio.totaleFinale;

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="flex gap-4">
        <a href="/" className="text-sm text-blue-600">
          ← Home
        </a>

        <a
          href={`/formazioni-competizione/${competizioneNorm}?partecipante=${encodeURIComponent(
            partecipanteNorm
          )}`}
          className="text-sm text-blue-600"
        >
          ← Torna alla formazione
        </a>
      </div>

      <header className="mt-5 mb-6">
        <h1 className="text-4xl font-bold">{nomePartecipante}</h1>

        <div
          className={`mt-3 mb-4 inline-block rounded-full px-3 py-1 text-sm font-semibold ${
            competizioneConclusa
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {competizioneConclusa
            ? "Competizione conclusa"
            : "Competizione in corso"}
        </div>

        <div className="mt-1 text-slate-600">
          Formazione {nomeCompetizione}
        </div>

        <div className="mt-1 text-sm text-slate-500">
          Modulo dichiarato: {data?.[0]?.modulo_dichiarato ?? "—"}
        </div>

        <div className="text-sm text-slate-500">
          Modulo finale:{" "}
          <span className="font-bold">{risultato.moduloFinale}</span>
        </div>

        {continuitaCapitano && (
          <div className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
            Continuità capitano attiva. Penalità applicata:{" "}
            <span className="font-bold">{dettaglio.continuitaCapitano}</span>
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Riepilogo punteggio</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Fantapunti giocatori</span>
              <span className="font-semibold tabular-nums">
                {dettaglio.totaleGiocatori}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Bonus/Malus capitano</span>
              <span className="font-semibold tabular-nums">
                {dettaglio.bonusCapitano >= 0 ? "+" : ""}
                {dettaglio.bonusCapitano}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Modificatore difesa</span>
              <span className="font-semibold tabular-nums">
                {dettaglio.modificatoreDifesa >= 0 ? "+" : ""}
                {dettaglio.modificatoreDifesa}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Modificatore centrocampo</span>
              <span className="font-semibold tabular-nums">
                {dettaglio.modificatoreCentrocampo >= 0 ? "+" : ""}
                {dettaglio.modificatoreCentrocampo}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Bonus/Malus modulo</span>
              <span className="font-semibold tabular-nums">
                {dettaglio.bonusModulo >= 0 ? "+" : ""}
                {dettaglio.bonusModulo}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Bonus Panchina</span>
              <span className="font-semibold tabular-nums">
                {dettaglio.bonusPanchina >= 0 ? "+" : ""}
                {dettaglio.bonusPanchina}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Penalità continuità capitano</span>
              <span className="font-semibold tabular-nums">
                {dettaglio.continuitaCapitano}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Totale prima del moltiplicatore</span>
              <span className="font-semibold tabular-nums">
                {dettaglio.totalePrimaMoltiplicatore}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Moltiplicatore competizione</span>
              <span className="font-semibold tabular-nums">
                ×{dettaglio.moltiplicatore}
              </span>
            </div>

            <hr className="my-3" />

            <div className="flex justify-between text-2xl font-black">
              <span>Totale</span>
              <span className="tabular-nums">{totaleFinale}</span>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <pre className="text-red-600">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-xl font-bold">Formazione titolare</h2>

        <div className="grid gap-2">
          {risultato.effettivi.map((g, index) => (
            <div
              key={`${g.giocatore_id}-${g.stato}-${index}`}
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
                  <div className="mt-1 text-xs font-bold text-green-700">
                    ENTRATO PER {g.sostituisce}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-xl font-bold tabular-nums">
                  {g.stato_giocatore === "da_giocare"
                    ? "—"
                    : g.fantapunti_calcolo}
                </div>

                <div className="text-xs text-slate-500">
                  voto {g.stato_giocatore === "da_giocare" ? "—" : votoDaUsare(g)}
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

          {risultato.sostituzioni.map((s, index) => (
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

        <p className="mt-1 mb-3 text-sm text-slate-500">
          L&apos;ordine della panchina determina la priorità delle sostituzioni,
          purché sia possibile schierare un modulo consentito.
        </p>

        <div className="grid gap-2">
          {panchina.map((g, index) => (
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

                  {g.avversario && (
                    <span className="ml-2 text-slate-400">
                      vs. {g.avversario}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl font-bold tabular-nums">
                  {g.stato_giocatore === "da_giocare" ? "—" : g.fantapunti}
                </div>

                <div className="text-xs text-slate-500">
                  voto {g.stato_giocatore === "da_giocare" ? "—" : votoDaUsare(g)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}