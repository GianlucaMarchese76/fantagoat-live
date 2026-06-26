type GiocatoreRosa = {
  id: number;
  nome?: string;
  ruolo: string;
  costo: number;
};

export type FormazioneAutomatica = {
  modulo: "4-4-2";
  titolari: GiocatoreRosa[];
  panchina: GiocatoreRosa[];
  capitano: GiocatoreRosa;
  vice: GiocatoreRosa;
};

function ordinaPerCostoDecrescente(a: GiocatoreRosa, b: GiocatoreRosa) {
  const differenzaCosto = Number(b.costo ?? 0) - Number(a.costo ?? 0);

  if (differenzaCosto !== 0) {
    return differenzaCosto;
  }

  return String((a as any).nome ?? "").localeCompare(
    String((b as any).nome ?? "")
  );
}

export function generaFormazioneAutomatica(
  rosa: GiocatoreRosa[]
): FormazioneAutomatica {
  const portieri = rosa.filter((g) => g.ruolo === "P").sort(ordinaPerCostoDecrescente);
  const difensori = rosa.filter((g) => g.ruolo === "D").sort(ordinaPerCostoDecrescente);
  const centrocampisti = rosa.filter((g) => g.ruolo === "C").sort(ordinaPerCostoDecrescente);
  const attaccanti = rosa.filter((g) => g.ruolo === "A").sort(ordinaPerCostoDecrescente);

  const titolari = [
    ...portieri.slice(0, 1),
    ...difensori.slice(0, 4),
    ...centrocampisti.slice(0, 4),
    ...attaccanti.slice(0, 2),
  ];

  const titolariIds = new Set(titolari.map((g) => g.id));

  const panchina = rosa
    .filter((g) => !titolariIds.has(g.id))
    .sort((a, b) => {
      const ordineRuoli = { P: 1, D: 2, C: 3, A: 4 } as Record<string, number>;
      const ruoloA = ordineRuoli[a.ruolo] ?? 99;
      const ruoloB = ordineRuoli[b.ruolo] ?? 99;

      if (ruoloA !== ruoloB) return ruoloA - ruoloB;
      return ordinaPerCostoDecrescente(a, b);
    });

  const ordinatiPerCosto = [...rosa].sort(ordinaPerCostoDecrescente);

  const capitano = ordinatiPerCosto[0];
  const vice = ordinatiPerCosto[1];

  if (titolari.length !== 11) {
    throw new Error("Formazione automatica non valida: servono 11 titolari.");
  }

  if (panchina.length !== 5) {
    throw new Error("Formazione automatica non valida: servono 5 panchinari.");
  }

  if (!capitano || !vice) {
    throw new Error("Formazione automatica non valida: capitano o vice mancanti.");
  }

  return {
    modulo: "4-4-2",
    titolari,
    panchina,
    capitano,
    vice,
  };
}