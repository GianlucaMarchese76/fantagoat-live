import { FormazioneCompetizioneSalvata } from "./types";

import {
  ModuliFantagoat,
  normalizzaModulo,
} from "../../../../lib/fantagoat/moduli";

type GiocatoreRosa = {
  id: number;
  ruolo: string;
  costo: number;
};

function ordinaPerCostoDecrescente(a: GiocatoreRosa, b: GiocatoreRosa) {
  return Number(b.costo ?? 0) - Number(a.costo ?? 0);
}

function miglioreDisponibile(ruolo: string, disponibili: GiocatoreRosa[]) {
  const indice = disponibili.findIndex((g) => g.ruolo === ruolo);

  if (indice === -1) return null;

  return disponibili.splice(indice, 1)[0];
}

export function aggiornaFormazioneEsistente(
  rosa: GiocatoreRosa[],
  formazioneEsistente: FormazioneCompetizioneSalvata[]
) {
  const moduloCodice = normalizzaModulo(formazioneEsistente[0]?.modulo);
  const modulo = ModuliFantagoat[moduloCodice];

  const rosaOrdinata = [...rosa].sort(ordinaPerCostoDecrescente);
  const disponibili = [...rosaOrdinata];

  const titolari: GiocatoreRosa[] = [];

  for (let i = 0; i < modulo.ruoli.length; i++) {
    const ruoloRichiesto = modulo.ruoli[i];

    const slot = formazioneEsistente.find(
      (g) => g.tipo === "titolare" && g.ordine === i + 1
    );

    const giocatoreEsistente = slot
      ? disponibili.find((g) => g.id === slot.giocatore_id)
      : undefined;

    if (giocatoreEsistente) {
      titolari.push(giocatoreEsistente);

      disponibili.splice(
        disponibili.findIndex((g) => g.id === giocatoreEsistente.id),
        1
      );
    } else {
      const sostituto = miglioreDisponibile(ruoloRichiesto, disponibili);

      if (!sostituto) {
        throw new Error(`Nessun ${ruoloRichiesto} disponibile`);
      }

      titolari.push(sostituto);
    }
  }

  const panchina = [...disponibili];

  const vecchioCapitano = formazioneEsistente.find((g) => g.is_capitano);
  const vecchioVice = formazioneEsistente.find((g) => g.is_vice);

  let capitano =
    titolari.find((g) => g.id === vecchioCapitano?.giocatore_id) ?? null;

  let vice = titolari.find((g) => g.id === vecchioVice?.giocatore_id) ?? null;

  const titolariPerCosto = [...titolari].sort(ordinaPerCostoDecrescente);

  if (!capitano) {
    capitano = titolariPerCosto[0];
  }

  if (!vice || vice.id === capitano.id) {
    vice = titolariPerCosto.find((g) => g.id !== capitano!.id)!;
  }

  if (titolari.length !== 11) {
    throw new Error("Formazione aggiornata non valida: servono 11 titolari.");
  }

  if (panchina.length !== 5) {
    throw new Error("Formazione aggiornata non valida: servono 5 panchinari.");
  }

  if (!capitano || !vice) {
    throw new Error("Formazione aggiornata non valida: capitano o vice mancanti.");
  }

  return {
    modulo: modulo.label,
    titolari,
    panchina,
    capitano,
    vice,
  };
}