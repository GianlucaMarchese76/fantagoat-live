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

export function haVoto(g: any) {
  return !(numero(g.voto) === 0 && numero(g.fantapunti) === 0);
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

export function calcolaFormazioneEffettiva(
  titolari: any[],
  panchina: any[]
) {
  const effettivi = titolari.map((g) => ({
    ...g,
    fantapunti_calcolo: numero(g.fantapunti),
  }));

  const panchinaOrdinata = [...panchina].sort(
    (a, b) => numero(a.ordine) - numero(b.ordine)
  );

  const usati = new Set<string>();
  const sostituzioni: any[] = [];

  const titolariDaSostituire = effettivi
    .filter((g) => g.da_sostituire)
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
        fantapunti_calcolo: numero(sostituto.fantapunti),
      };

      sostituzioni.push({ out: titolare, in: sostituto });
    } else {
      effettivi[indexTitolare] = {
        ...titolare,
        fantapunti_calcolo: titolare.ruolo === "P" ? 3 : 4,
      };

      sostituzioni.push({ out: titolare, in: null });
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
    return numero(capitano.voto) - 6;
  }

  const vice = effettivi.find((g) => g.is_vice === true);

  if (vice && haVoto(vice)) {
    return numero(vice.voto) - 6;
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
      migliori3.reduce((sum, g) => sum + numero(g.voto), 0)) /
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
    migliori3.reduce((sum, g) => sum + numero(g.voto), 0) / 3;

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

export function calcolaTotaleFormazione(rows: any[]) {
  const titolari = rows.filter((g) => g.tipo === "Titolare");
  const panchina = rows.filter((g) => g.tipo === "Panchina");

  const risultato = calcolaFormazioneEffettiva(titolari, panchina);

  return (
    risultato.totaleGiocatori +
    calcolaVotoCapitano(risultato.effettivi) +
    calcolaModDifesa(risultato.effettivi) +
    calcolaModCentrocampo(risultato.effettivi) +
    calcolaBonusModulo(risultato.moduloFinale)
  );
}