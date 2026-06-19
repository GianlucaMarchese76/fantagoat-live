import { supabase } from "../../../../../lib/supabase";

const moduliValidi = [
  "3-4-3",
  "3-5-2",
  "4-3-3",
  "4-4-2",
  "4-5-1",
  "5-3-2",
  "5-4-1",
];

function numero(v: any) {
  return Number(v ?? 0);
}

const ABILITA_SOSTITUZIONI = false;

function votoDaUsare(g: any) {
  if (
    g.stato_giocatore === "partita_da_giocare" ||
    g.stato_giocatore === "in_campo" ||
    g.stato_giocatore === "in_attesa_voto"
  ) {
    return 6;
  }

    return numero(g.voto_live ?? g.voto);
}
function haVoto(g: any) {
  return g.stato_giocatore === "ha_voto";
}

function giornataConclusa(giocatori: any[]) {
  return giocatori.every(
    (g) =>
      g.stato_giocatore === "ha_voto" ||
      g.stato_giocatore === "non_ha_giocato"
  );
}

function moduloDaGiocatori(giocatori: any[]) {
  const d = giocatori.filter((g) => g.ruolo === "D").length;
  const c = giocatori.filter((g) => g.ruolo === "C").length;
  const a = giocatori.filter((g) => g.ruolo === "A").length;

  return `${d}-${c}-${a}`;
}

function moduloValido(giocatori: any[]) {
  return moduliValidi.includes(moduloDaGiocatori(giocatori));
}

function calcolaFormazioneEffettiva(titolari: any[], panchina: any[]) {
  const effettivi = titolari.map((g) => ({
    ...g,
   fantapunti_calcolo: numero(g.fantapunti_live ?? g.fantapunti),
    stato: "titolare",
    sostituisce: null,
  }));

  const panchinaOrdinata = [...panchina].sort(
    (a, b) => numero(a.ordine) - numero(b.ordine)
  );

  const usati = new Set<string>();
  const sostituzioni: any[] = [];

  if (!ABILITA_SOSTITUZIONI) {
  return {
    effettivi,
    sostituzioni,
    moduloFinale: moduloDaGiocatori(effettivi),
    totaleGiocatori: effettivi.reduce(
      (sum, g) => sum + numero(g.fantapunti_calcolo),
      0
    ),
  };
}

const titolariDaSostituire = ABILITA_SOSTITUZIONI
  ? effettivi
      .filter((g) => g.stato_giocatore === "non_ha_giocato")
      .sort((a, b) => numero(a.ordine) - numero(b.ordine))
  : [];

  for (const titolare of titolariDaSostituire) {
    const indexTitolare = effettivi.findIndex(
      (g) => g.giocatore_id === titolare.giocatore_id
    );

    if (indexTitolare === -1) continue;

    let sostituto = null;

    if (sostituzioni.length < 5) {
      if (titolare.ruolo === "P") {
        sostituto = panchinaOrdinata.find(
          (p) =>
            p.ruolo === "P" &&
            haVoto(p) &&
            !usati.has(p.giocatore_id)
        );
      } else {
        for (const p of panchinaOrdinata) {
          if (p.ruolo === "P") continue;
          if (!haVoto(p)) continue;
          if (usati.has(p.giocatore_id)) continue;

          const prova = [...effettivi];
          prova[indexTitolare] = p;

          if (moduloValido(prova)) {
            sostituto = p;
            break;
          }
        }
      }
    }

    if (sostituto) {
      usati.add(sostituto.giocatore_id);

      effettivi[indexTitolare] = {
        ...sostituto,
       fantapunti_calcolo: numero(
  sostituto.fantapunti_live ?? sostituto.fantapunti
),
        stato: "entrato",
        sostituisce: titolare.giocatore,
      };

      sostituzioni.push({
        out: titolare,
        in: sostituto,
        tipo: "sostituzione",
      });
    } else {
      const puntiUfficio = titolare.ruolo === "P" ? 3 : 4;

      effettivi[indexTitolare] = {
        ...titolare,
        fantapunti_calcolo: puntiUfficio,
        stato: "ufficio",
      };

      sostituzioni.push({
        out: titolare,
        in: null,
        tipo: "ufficio",
        punti: puntiUfficio,
      });
    }
  }

  return {
    effettivi,
    sostituzioni,
    moduloFinale: moduloDaGiocatori(effettivi),
    totaleGiocatori: effettivi.reduce(
      (sum, g) => sum + numero(g.fantapunti_calcolo),
      0
    ),
  };
}

function calcolaVotoCapitano(effettivi: any[]) {
  const capitano = effettivi.find((g) => g.is_capitano === true);

  if (capitano && haVoto(capitano)) {
    return votoDaUsare(capitano) - 6;
  }

  const vice = effettivi.find((g) => g.is_vice === true);

  if (vice && haVoto(vice)) {
    return votoDaUsare(vice) - 6;
  }

  return 0;
}

function calcolaModDifesa(effettivi: any[]) {
  const portiere = effettivi.find((g) => g.ruolo === "P");

  const difensori = effettivi
    .filter((g) => g.ruolo === "D")
    .sort((a, b) => numero(b.voto) - numero(a.voto));

  if (!portiere || difensori.length < 3) return 0;

  const migliori3 = difensori.slice(0, 3);

  const media =
    (numero(portiere.voto) +
      migliori3.reduce((sum, g) => sum + votoDaUsare(g), 0)) /
    4;

  if (media >= 7) return 5;
  if (media >= 6.75) return 4;
  if (media >= 6.5) return 3;
  if (media >= 6.25) return 2;
  if (media >= 6) return 1;

  return 0;
}

function calcolaModCentrocampo(effettivi: any[]) {
  const centrocampisti = effettivi
    .filter((g) => g.ruolo === "C")
    .sort((a, b) => numero(b.voto) - numero(a.voto));

  if (centrocampisti.length < 3) return 0;

  const migliori3 = centrocampisti.slice(0, 3);

  const media =
    migliori3.reduce((sum, g) => sum + votoDaUsare(g), 0) / 3;

  if (media >= 6.75) return 3;
  if (media >= 6.5) return 2;
  if (media >= 6.25) return 1;

  return 0;
}

function calcolaBonusModulo(moduloFinale: string) {
  const bonus: Record<string, number> = {
    "3-4-3": -1,
    "3-5-2": 2,
    "4-3-3": -1,
    "4-4-2": 0,
    "4-5-1": 2,
    "5-3-2": 2,
    "5-4-1": 2,
  };

  return bonus[moduloFinale] ?? 0;
}

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
risultato.sostituzioni = [];

  const totaleGiocatori = risultato.totaleGiocatori;
  const votoCapitano = calcolaVotoCapitano(risultato.effettivi);
  const modificatoreDifesa = calcolaModDifesa(risultato.effettivi);
  const modificatoreCentrocampo = calcolaModCentrocampo(
    risultato.effettivi
  );
  const bonusModulo = calcolaBonusModulo(risultato.moduloFinale);

  const totaleFinale =
    totaleGiocatori +
    votoCapitano +
    modificatoreDifesa +
    modificatoreCentrocampo +
    bonusModulo;

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a href="/" className="text-blue-600 text-sm">
        ← Home
      </a>

      <header className="mt-5 mb-6">
        <h1 className="text-4xl font-bold">{nomePartecipante}</h1>

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
        <pre className="text-red-600">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <section className="mb-6">
        <h2 className="text-xl font-bold mb-3">Undici effettivo</h2>

        <div className="grid gap-2">
          {risultato.effettivi.map((g) => (
            <div
              key={`${g.giocatore_id}-${g.stato}`}
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

{g.stato_giocatore === "partita_da_giocare" && (
  <div className="text-xs font-semibold text-slate-400 mt-1">
    ⚪ Partita da giocare
  </div>
)}

{g.stato_giocatore === "in_campo" && (
  <div className="text-xs font-semibold text-green-600 mt-1">
    🟢 In campo
  </div>
)}
{g.stato_giocatore === "in_attesa_voto" && (
  <div className="text-xs font-semibold text-yellow-600 mt-1">
    🟡 In attesa del voto
  </div>
)}
{g.stato_giocatore === "non_ha_giocato" && (
  <div className="text-xs font-semibold text-red-600 mt-1">
    🔴 Non ha giocato
  </div>
)}

{g.stato_giocatore === "ha_voto" && (
  <div className="text-xs font-semibold text-blue-600 mt-1">
    ✅ Voto disponibile
  </div>
)}

                {g.stato === "entrato" && (
                  <div className="text-xs font-bold text-green-700 mt-1">
                    ENTRATO PER {g.sostituisce}
                  </div>
                )}

             {g.stato === "ufficio" && g.stato_giocatore === "non_ha_giocato" && (
  <div className="text-xs font-bold text-red-600 mt-1">
    NON HA GIOCATO
  </div>
)}
</div>
              <div className="text-right">
                <div
  className={`text-xl font-bold tabular-nums ${
    g.stato_giocatore === "partita_da_giocare" ||
    g.stato_giocatore === "in_campo" ||
    g.stato_giocatore === "in_attesa_voto"
      ? "text-slate-400"
      : ""
  }`}
>
  {g.fantapunti_calcolo}
</div>

             <div className="text-xs text-slate-500">
  {g.stato_giocatore === "partita_da_giocare" ||
   g.stato_giocatore === "in_campo" ||
   g.stato_giocatore === "in_attesa_voto"
    ? `voto ipotizzato ${votoDaUsare(g)}`
    : `voto ${votoDaUsare(g)}`}
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
                    Nessun sostituto valido · {s.punti} d&apos;ufficio
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Panchina</h2>

        <div className="grid gap-2">
          {panchina.map((g) => (
            <div
              key={g.giocatore_id}
              className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between"
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
                <div
  className={`text-xl font-bold tabular-nums ${
    g.stato_giocatore === "partita_da_giocare" ||
    g.stato_giocatore === "in_campo" ||
    g.stato_giocatore === "in_attesa_voto"
      ? "text-slate-400"
      : ""
  }`}
>
                  {g.fantapunti}
                </div>

                <div className="text-xs text-slate-500">
  {g.stato_giocatore === "partita_da_giocare" ||
   g.stato_giocatore === "in_campo" ||
   g.stato_giocatore === "in_attesa_voto"
    ? `voto ipotizzato ${votoDaUsare(g)}`
    : `voto ${votoDaUsare(g)}`}
</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
