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
    if (!gruppi.has(row.partecipante)) {
      gruppi.set(row.partecipante, []);
    }

    gruppi.get(row.partecipante)!.push(row);
  }

  return Array.from(gruppi.entries())
    .map(([partecipante, formazione]) => {
      const rowsCalcolo = formazione.map((r) => ({
        ...r,
        voto: definitiva ? r.voto : r.voto_live,
        fantapunti: definitiva ? r.fantapunti : r.fantapunti_live,
      }));

      return {
        partecipante,
        punti: calcolaTotaleFormazione(rowsCalcolo),
        posizione: 0,
      };
    })
    .sort((a, b) => b.punti - a.punti)
    .map((r, index) => ({
      ...r,
      posizione: index + 1,
    }));
}