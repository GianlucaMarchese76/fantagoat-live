export type Competizione = {
  giornata: string;
  blocco: string;
};

export function chiaveCompetizione(
  giornata: string,
  blocco: string
): string {
  return `${giornata}|${blocco}`;
}

export function titoloCompetizione(
  giornata: string,
  blocco: string
): string {
  return blocco === "unico"
    ? giornata
    : `${giornata} ${blocco}`;
}

export function stessaCompetizione(
  a: Competizione,
  b: Competizione
): boolean {
  return (
    a.giornata === b.giornata &&
    a.blocco === b.blocco
  );
}