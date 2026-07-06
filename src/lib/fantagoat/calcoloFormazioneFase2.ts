import {
  BonusModuloFase2,
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

type StatoCalcolato =
  | "PARTITA_DA_GIOCARE"
  | "PARTITA_IN_CORSO"
  | "IN_ATTESA_DATI"
  | "HA_VOTO"
  | "SENZA_VOTO";

export function numero(v: any) {
  return Number(v ?? 0);
}

function votoBase(g: any) {
  return numero(g.voto_live ?? g.voto);
}

function fantapuntiBase(g: any) {
  return numero(g.fantapunti_live ?? g.fantapunti);
}

function haZeroZero(g: any) {
  return votoBase(g) === 0 && fantapuntiBase(g) === 0;
}

function chiavePartita(g: any) {
  const nazionale = String(g.nazionale ?? "").trim();
  const avversario = String(g.avversario ?? "").trim();

  return [nazionale, avversario].sort().join("-");
}

function partiteChiuse(rows: any[]) {
  const set = new Set<string>();

  for (const g of rows) {
    if (fantapuntiBase(g) > 0) {
      set.add(chiavePartita(g));
    }
  }

  return set;
}

function statoCalcolatoGiocatore(
  g: any,
  partiteConDati: Set<string>
): StatoCalcolato {
  const stato = String(g.stato_giocatore ?? "");

  if (stato === "da_giocare" || stato === "partita_da_giocare") {
    return "PARTITA_DA_GIOCARE";
  }

  if (stato === "in_corso" || stato === "in_campo") {
    return "PARTITA_IN_CORSO";
  }

  if (stato === "in_attesa_dati" || stato === "in_attesa_voto") {
    return "IN_ATTESA_DATI";
  }

  if (haZeroZero(g)) {
    return partiteConDati.has(chiavePartita(g))
      ? "SENZA_VOTO"
      : "IN_ATTESA_DATI";
  }

  return "HA_VOTO";
}

function arricchisciConStatoCalcolato(rows: any[]) {
  const chiuse = partiteChiuse(rows);

  return rows.map((g) => ({
    ...g,
    stato_calcolato: statoCalcolatoGiocatore(g, chiuse),
  }));
}

export function votoDaUsare(g: any) {
  if (
    g.stato_calcolato === "PARTITA_DA_GIOCARE" ||
    g.stato_calcolato === "PARTITA_IN_CORSO" ||
    g.stato_calcolato === "IN_ATTESA_DATI"
  ) {
    return 6;
  }

  if (g.stato === "ufficio") {
    return g.ruolo === "P" ? 3 : 4;
  }

  return votoBase(g);
}

export function haVoto(g: any) {
  return g.stato_calcolato === "HA_VOTO";
}

function puoEntrareLive(g: any) {
  return (
    g.stato_calcolato === "HA_VOTO" ||
    g.stato_calcolato === "PARTITA_DA_GIOCARE" ||
    g.stato_calcolato === "PARTITA_IN_CORSO" ||
    g.stato_calcolato === "IN_ATTESA_DATI"
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
    g.stato_calcolato === "PARTITA_DA_GIOCARE" ||
    g.stato_calcolato === "PARTITA_IN_CORSO" ||
    g.stato_calcolato === "IN_ATTESA_DATI"
  ) {
    return 6;
  }

  if (g.stato === "ufficio") {
    return g.ruolo === "P" ? 3 : 4;
  }

  if (g.stato_calcolato === "SENZA_VOTO") {
    return 0;
  }

  return fantapuntiBase(g);
}

export function calcolaFormazioneEffettiva(titolari: any[], panchina: any[]) {
  const titolariNormalizzati = titolari.map((g) => {
    if (g.stato_calcolato === "SENZA_VOTO") {
      return {
        ...g,
        stato_giocatore: "non_ha_giocato",
        da_sostituire: true,
      };
    }

    return g;
  });

  const panchinaNormalizzata = panchina.map((g) => {
    if (g.stato_calcolato === "SENZA_VOTO") {
      return {
        ...g,
        fantapunti_calcolo: 0,
        stato: "panchina_non_utilizzabile",
        non_utilizzabile_bonus_panchina: true,
      };
    }

    return {
      ...g,
      fantapunti_calcolo: fantapuntiDaUsare(g),
    };
  });

  const effettivi = titolariNormalizzati.map((g) => ({
    ...g,
    fantapunti_calcolo: fantapuntiDaUsare(g),
    stato: "titolare",
    sostituisce: null,
  }));

  const panchinaOrdinata = [...panchinaNormalizzata].sort(
    (a, b) => numero(a.ordine) - numero(b.ordine)
  );

  const usati = new Set<string>();
  const sostituzioni: any[] = [];

  const titolariDaSostituire = effettivi
    .filter((g) => g.stato_giocatore === "non_ha_giocato" || g.da_sostituire)
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
            !p.non_utilizzabile_bonus_panchina &&
            !usati.has(p.giocatore_id)
        );
      } else {
        for (const p of panchinaOrdinata) {
          if (p.ruolo === "P") continue;
          if (!puoEntrareLive(p)) continue;
          if (p.non_utilizzabile_bonus_panchina) continue;
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
    panchina: panchinaNormalizzata,
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
    .filter((g) => !g.non_utilizzabile_bonus_panchina)
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

function calcolaContinuitaCapitano(
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
  const rowsConStato = arricchisciConStatoCalcolato(rows);

  const titolari = rowsConStato.filter((g) => g.tipo === "Titolare");
  const panchina = rowsConStato.filter((g) => g.tipo === "Panchina");

  const risultato = calcolaFormazioneEffettiva(titolari, panchina);

  const bonusCapitano = calcolaVotoCapitano(risultato.effettivi);
  const bonusPanchina = calcolaBonusPanchina(
    risultato.panchina,
    risultato.sostituzioni
  );
  const modificatoreDifesa = calcolaModDifesa(risultato.effettivi);
  const modificatoreCentrocampo = calcolaModCentrocampo(risultato.effettivi);
  const bonusModulo = calcolaBonusModulo(
    risultato.moduloFinale,
    BonusModuloFase2
  );

  const continuitaCapitano = calcolaContinuitaCapitano(
    risultato.effettivi,
    continuita
  );

  const moltiplicatore = numero(rows?.[0]?.moltiplicatore ?? 1);

  const totalePrimaMoltiplicatore =
    risultato.totaleGiocatori +
    bonusCapitano +
    modificatoreDifesa +
    modificatoreCentrocampo +
    bonusModulo +
    bonusPanchina +
    continuitaCapitano;

  const totaleFinale = Number(
  (totalePrimaMoltiplicatore * moltiplicatore).toFixed(1)
);

  return {
    risultato,
    totaleGiocatori: risultato.totaleGiocatori,
    bonusCapitano,
    modificatoreDifesa,
    modificatoreCentrocampo,
    bonusModulo,
    bonusPanchina,
    continuitaCapitano,
    moltiplicatore,
    totalePrimaMoltiplicatore,
    totaleFinale,
  };
}

export function calcolaTotaleFormazione(rows: any[]) {
  return calcolaDettaglioFormazione(rows).totaleFinale;
}