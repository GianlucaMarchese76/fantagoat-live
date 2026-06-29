import { calcolaTotaleFormazione } from "./calcoloFormazione";

export type RigaClassifica = {
  partecipante: string;
  punti: number;
  posizione: number;
};

type CalcolaClassificaInput = {
  rows: any[];
  definitiva?: boolean;
};

export function calcolaClassifica({
  rows,
  definitiva = false,
}: CalcolaClassificaInput): RigaClassifica[] {
  const gruppi = new Map<string, any[]>();

  for (const row of rows ?? []) {
    if (!row.partecipante) continue;

    if (!gruppi.has(row.partecipante)) {
      gruppi.set(row.partecipante, []);
    }

    gruppi.get(row.partecipante)!.push(row);
  }

  return Array.from(gruppi.entries())
    .map(([partecipante, formazione]) => {
      const rowsCalcolo = formazione.map((r) => ({
        ...r,

        voto: definitiva
          ? r.voto
          : r.voto_live ?? r.voto,

        fantapunti: definitiva
          ? r.fantapunti
          : r.fantapunti_live ?? r.fantapunti,
      }));

      return {
        partecipante,
        punti: calcolaTotaleFormazione(rowsCalcolo),
        posizione: 0,
      };
    })
    .filter((r) => Number.isFinite(r.punti))
    .sort((a, b) => b.punti - a.punti)
    .map((r, index) => ({
      ...r,
      posizione: index + 1,
    }));
}