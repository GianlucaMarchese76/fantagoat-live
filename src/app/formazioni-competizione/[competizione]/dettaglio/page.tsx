import { supabase } from "../../../../lib/supabase";
import { competizioniDesignanti } from "../../../../lib/fantagoat/continuitaCapitano";
import {
  calcolaDettaglioFormazione as calcolaDettaglioFormazioneFase2,
  votoDaUsare,
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
  const partecipanteNorm = partecipante?.trim().toLowerCase().replaceAll(" ", "");

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
        designati?.filter((g) => g.is_capitano).map((g) => g.giocatore_id) ?? [],
      vicePrecedenti:
        designati?.filter((g) => g.is_vice).map((g) => g.giocatore_id) ?? [],
    };
  }

  const dettaglio = calcolaDettaglioFormazioneFase2(data ?? [], continuitaCapitano);
  const risultato = dettaglio.risultato;
  const totaleFinale = dettaglio.totaleFinale;
  const panchina = risultato.panchina ?? [];

  function bandiera(nazionale: string) {
    return `/bandiere/${String(nazionale ?? "").trim()}.svg`;
  }

  function badgeRuolo(ruolo: string) {
    switch (ruolo) {
      case "P":
        return "bg-sky-100 text-sky-700 border-sky-200";
      case "D":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "C":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "A":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  function statoNonDefinitivo(stato: string) {
    return [
      "da_giocare",
      "partita_da_giocare",
      "in_corso",
      "in_campo",
      "in_attesa_dati",
      "in_attesa_voto",
    ].includes(String(stato));
  }

  function labelStatoPartita(g: any) {
  switch (g.stato_calcolato) {
    case "PARTITA_DA_GIOCARE":
      return "Partita da giocare";

    case "PARTITA_IN_CORSO":
      return "Partita in corso";

    case "IN_ATTESA_DATI":
      return "In attesa dei dati";

    case "HA_VOTO":
      return "Dati aggiornati";

    case "SENZA_VOTO":
      return "Senza voto";

    default:
      return "—";
  }
}

  function dataPartita(g: any) {
    if (!g.kickoff) return null;

    return new Date(g.kickoff).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  function fantapuntiDaMostrare(g: any) {
    if (statoNonDefinitivo(g.stato_giocatore)) return 6;
    if (g.non_utilizzabile_bonus_panchina) return 0;
    return g.fantapunti_calcolo ?? g.fantapunti_live ?? g.fantapunti ?? 0;
  }

  function votoLabelDaMostrare(g: any) {
    if (statoNonDefinitivo(g.stato_giocatore)) {
      return "voto ipotizzato 6";
    }

    return `voto ${votoDaUsare(g)}`;
  }

  function fantapuntiLabelDaMostrare(g: any) {
    if (statoNonDefinitivo(g.stato_giocatore)) {
      return "FP ipotizzato 6";
    }

    return `FP ${fantapuntiDaMostrare(g)}`;
  }

  function RigaGiocatore({
    g,
    index,
    panchinaCard = false,
  }: {
    g: any;
    index: number;
    panchinaCard?: boolean;
  }) {
    const nonUtilizzabile = g.non_utilizzabile_bonus_panchina;

    return (
      <div
        key={`${g.giocatore_id}-${g.stato}-${index}`}
        className={`flex items-center justify-between rounded-xl px-4 py-3 shadow-sm ${
          nonUtilizzabile
            ? "bg-slate-200 text-slate-400 opacity-70"
            : "bg-white"
        } ${
          g.stato === "entrato"
            ? "border-2 border-green-300"
            : g.stato === "ufficio"
              ? "border-2 border-red-300"
              : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base font-black ${badgeRuolo(
              g.ruolo
            )}`}
          >
            {g.ruolo}
          </div>

          <img
            src={bandiera(g.nazionale)}
            alt={g.nazionale}
            className="mt-1 h-5 w-7 rounded border border-slate-200 object-cover"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate text-base font-semibold text-slate-900">
              {panchinaCard && (
                <span className="shrink-0">{g.ordine}.</span>
              )}

              <span className="truncate">{g.giocatore}</span>

              {g.is_capitano && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-800">
                  👑 C
                </span>
              )}

              {g.is_vice && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                  V
                </span>
              )}
            </div>

            <div className="mt-0.5 text-sm text-slate-500">
              {g.nazionale}

              {g.avversario && (
                <span className="ml-2 text-slate-400">
                  vs {g.avversario}
                </span>
              )}

              {dataPartita(g) && (
                <span className="ml-2 text-slate-400">
                  {dataPartita(g)}
                </span>
              )}
            </div>

            <div className="mt-1 text-xs font-semibold text-slate-400">
              {labelStatoPartita(g)}
            </div>

            {g.stato === "entrato" && (
              <div className="mt-2 text-xs font-semibold text-green-700">
                ↪ Entrato per {g.sostituisce}
              </div>
            )}

            {g.stato === "ufficio" && (
              <div className="mt-2 text-xs font-semibold text-red-700">
                Voto d&apos;ufficio
              </div>
            )}

            {nonUtilizzabile && (
              <div className="mt-1 text-xs font-bold text-slate-500">
                Non utilizzabile per bonus panchina
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold tabular-nums">
            {fantapuntiDaMostrare(g)}
          </div>

          <div className="text-xs text-slate-500">
            {votoLabelDaMostrare(g)}
          </div>

          <div className="text-xs text-slate-400">
            {fantapuntiLabelDaMostrare(g)}
          </div>
        </div>
      </div>
    );
  }

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
          {competizioneConclusa ? "Competizione conclusa" : "Competizione in corso"}
        </div>

        <div className="mt-1 text-slate-600">Formazione {nomeCompetizione}</div>

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
            <RigaGiocatore key={`${g.giocatore_id}-${index}`} g={g} index={index} />
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
            <RigaGiocatore
              key={`${g.giocatore_id}-${index}`}
              g={g}
              index={index}
              panchinaCard
            />
          ))}
        </div>
      </section>
    </main>
  );
}