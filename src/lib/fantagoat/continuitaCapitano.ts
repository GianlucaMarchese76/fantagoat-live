export const COMPETIZIONI_DESIGNANTI: Record<string, string[]> = {
  "8ALTA": ["16ALTA"],
  "8BASSA": ["16BASSA"],
  "QUARTI": ["8ALTA", "8BASSA"],
  "SEMIFINALI": ["QUARTI"],
  "FINALE": ["SEMIFINALI"],
};

export function competizioniDesignanti(codice: string): string[] {
  return COMPETIZIONI_DESIGNANTI[codice.toUpperCase()] ?? [];
}