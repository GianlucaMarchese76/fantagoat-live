export type StatoCompetizione =
  | "DA_DISPUTARE"
  | "LIVE"
  | "CONCLUSA";

export function statoCompetizione(
  conclusa: boolean,
  primaPartita: Date,
  now: Date
): StatoCompetizione {
  if (conclusa) return "CONCLUSA";
  if (now >= primaPartita) return "LIVE";
  return "DA_DISPUTARE";
}