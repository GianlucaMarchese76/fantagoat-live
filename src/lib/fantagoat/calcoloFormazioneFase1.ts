import {
  BonusModuloFase1,
  calcolaBonusModulo,
} from "./regoleModulo";

const moduliValidi = [
  "3-4-3",
  "3-5-2",
  "4-3-3",
  "4-4-2",
  "4-5-1",
  "5-3-2",
  "5-4-1",
];

export function numero(v: any) {
  return Number(v ?? 0);
}

export function votoDaUsare(g: any) {
  if (
    g.stato_giocatore === "partita_da_giocare" ||
    g.stato_giocatore === "in_campo" ||
    g.stato_giocatore === "in_attesa_voto"
  ) {
    return 6;
  }

  return numero(g.voto_live ?? g.voto);
}

export function haVoto(g: any) {
  return g.stato_giocatore === "ha_voto";
}

function puoEntrareLive(g: any) {
  return (
    g.stato_giocatore === "ha_voto" ||
    g.stato_giocatore === "partita_da_giocare" ||
    g.stato_giocatore === "in_campo" ||
    g.stato_giocatore === "in_attesa_voto"
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

function fantapuntiDaUsare(g: any) {
  if (
    g.stato_giocatore === "partita_da_giocare" ||
    g.stato_giocatore === "in_campo" ||
    g.stato_giocatore === "in_attesa_voto"
  ) {
    return 6;
  }

  return numero(g.fantapunti_live ?? g.fantapunti);
}

export function calcolaFormazioneEffettiva(titolari: any[], panchina: any[]) {
  const effettivi = titolari.map((g) => ({
    ...g,
    fantapunti_calcolo: fantapuntiDaUsare(g),
    stato: "titolare",
    sostituisce: null,
  }));

  const panchinaOrdinata = [...panchina].sort(
    (a, b) => numero(a.ordine) - numero(b.ordine)
  );

  const usati = new Set<string>();
  const sostituzioni: any[] = [];

  const titolariDaSostituire = effettivi
    .filter((g) => g.stato_giocatore === "non_ha_giocato")
    .sort((a, b) => numero(a.ordine) - numero(b.ordine));

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
            puoEntrareLive(p) &&
            !usati.has(p.giocatore_id)
        );
      } else {
        for (const p of panchinaOrdinata) {
          if (p.ruolo === "P") continue;
          if (!puoEntrareLive(p)) continue;
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
        fantapunti_calcolo: fantapuntiDaUsare(sostituto),
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

export function calcolaVotoCapitano(effettivi: any[]) {
  const capitano = effettivi.find((g) => g.is_capitano);

  if (capitano && haVoto(capitano)) {
    return votoDaUsare(capitano) - 6;
  }

  const vice = effettivi.find((g) => g.is_vice);

  if (vice && haVoto(vice)) {
    return votoDaUsare(vice) - 6;
  }

  return -2;
}

export function calcolaBonusPanchina(panchina: any[], sostituzioni: any[]) {
  const idsEntrati = new Set(
    sostituzioni
      .filter((s) => s.tipo === "sostituzione" && s.in)
      .map((s) => s.in.giocatore_id)
  );

  return panchina
    .filter((g) => !idsEntrati.has(g.giocatore_id))
    .reduce((sum, g) => {
      if (!haVoto(g)) return sum;
      return sum + (votoDaUsare(g) - 6);
    }, 0);
}

export function calcolaModDifesa(effettivi: any[]) {
  const portiere = effettivi.find((g) => g.ruolo === "P");

  const difensori = effettivi
    .filter((g) => g.ruolo === "D")
    .sort((a, b) => votoDaUsare(b) - votoDaUsare(a));

  if (!portiere || difensori.length < 3) return 0;

  const media =
    (votoDaUsare(portiere) +
      difensori.slice(0, 3).reduce((s, g) => s + votoDaUsare(g), 0)) /
    4;

  if (media >= 7) return 5;
  if (media >= 6.75) return 4;
  if (media >= 6.5) return 3;
  if (media >= 6.25) return 2;
  if (media >= 6) return 1;

  return 0;
}

export function calcolaModCentrocampo(effettivi: any[]) {
  const centrocampisti = effettivi
    .filter((g) => g.ruolo === "C")
    .sort((a, b) => votoDaUsare(b) - votoDaUsare(a));

  if (centrocampisti.length < 3) return 0;

  const media =
    centrocampisti.slice(0, 3).reduce((s, g) => s + votoDaUsare(g), 0) / 3;

  if (media >= 6.75) return 3;
  if (media >= 6.5) return 2;
  if (media >= 6.25) return 1;

  return 0;
}

type ContinuitaCapitano = {
  capitaniPrecedenti: string[];
  vicePrecedenti: string[];
};

function calcolaPenalitaContinuitaCapitano(
  effettivi: any[],
  continuita?: ContinuitaCapitano
) {
  if (!continuita) return 0;

  const capitano = effettivi.find((g) => g.is_capitano);
  const vice = effettivi.find((g) => g.is_vice);

  let capitanoEffettivoId: string | null = null;

  if (capitano && haVoto(capitano)) {
    capitanoEffettivoId = capitano.giocatore_id;
  } else if (vice && haVoto(vice)) {
    capitanoEffettivoId = vice.giocatore_id;
  }

  let penalitaContinuita = 0;

  if (!capitanoEffettivoId) {
    penalitaContinuita = -2;
  } else if (continuita.capitaniPrecedenti.includes(capitanoEffettivoId)) {
    penalitaContinuita = 0;
  } else if (continuita.vicePrecedenti.includes(capitanoEffettivoId)) {
    penalitaContinuita = -1;
  } else {
    penalitaContinuita = -2;
  }

  const penalitaAssenza = capitanoEffettivoId ? 0 : -2;

  return penalitaContinuita + penalitaAssenza;
}

export function calcolaDettaglioFormazione(
  rows: any[],
  continuita?: ContinuitaCapitano
) {
  const titolari = rows.filter((g) => g.tipo === "Titolare");
  const panchina = rows.filter((g) => g.tipo === "Panchina");

  const risultato = calcolaFormazioneEffettiva(titolari, panchina);

  const bonusCapitano = calcolaVotoCapitano(risultato.effettivi);

  const bonusPanchina = calcolaBonusPanchina(
    panchina,
    risultato.sostituzioni
  );

  const modificatoreDifesa = calcolaModDifesa(risultato.effettivi);
  const modificatoreCentrocampo = calcolaModCentrocampo(risultato.effettivi);

  const bonusModulo = calcolaBonusModulo(
    risultato.moduloFinale,
    BonusModuloFase1
  );

  const modificatoreAttacco = 0;
  const golDecisivo = 0;

  const penalitaCapitano = calcolaPenalitaContinuitaCapitano(
    risultato.effettivi,
    continuita
  );

  const moltiplicatore = numero(rows?.[0]?.moltiplicatore ?? 1);

  const totalePrimaMoltiplicatore =
    risultato.totaleGiocatori +
    bonusCapitano +
    modificatoreDifesa +
    modificatoreCentrocampo +
    modificatoreAttacco +
    bonusModulo +
    bonusPanchina +
    golDecisivo +
    penalitaCapitano;

  const totaleFinale = totalePrimaMoltiplicatore * moltiplicatore;

  return {
    risultato,
    totaleGiocatori: risultato.totaleGiocatori,
    bonusCapitano,
    modificatoreDifesa,
    modificatoreCentrocampo,
    modificatoreAttacco,
    bonusModulo,
    bonusPanchina,
    golDecisivo,
    penalitaCapitano,
    moltiplicatore,
    totalePrimaMoltiplicatore,
    totaleFinale,
  };
}

export function calcolaTotaleFormazione(rows: any[]) {
  return calcolaDettaglioFormazione(rows).totaleFinale;
}