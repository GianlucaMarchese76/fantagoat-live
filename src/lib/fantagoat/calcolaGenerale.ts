import { RigaClassifica } from "./calcolaClassifica";

type Competizione = {
  giornata: string;
  blocco: string;
};

type CalcolaGeneraleInput = {
  competizioni: Competizione[];
  getClassifica: (
    giornata: string,
    blocco: string,
    definitiva: boolean
  ) => Promise<RigaClassifica[]>;
};

export async function calcolaGenerale({
  competizioni,
  getClassifica,
}: CalcolaGeneraleInput) {
  const generaleMap = new Map<string, number>();

  for (const c of competizioni) {
    const classifica = await getClassifica(
      c.giornata,
      c.blocco,
      true
    );

    for (const r of classifica) {
      generaleMap.set(
        r.partecipante,
        (generaleMap.get(r.partecipante) ?? 0) + r.punti
      );
    }
  }

  return Array.from(generaleMap.entries())
    .map(([partecipante, punti]) => ({
      partecipante,
      punti,
    }))
    .sort((a, b) => b.punti - a.punti)
    .map((r, index) => ({
      ...r,
      posizione: index + 1,
    }));
}