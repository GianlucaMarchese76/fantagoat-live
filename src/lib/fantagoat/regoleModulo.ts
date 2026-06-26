export type Modulo =
  | "3-4-3"
  | "3-5-2"
  | "4-3-3"
  | "4-4-2"
  | "4-5-1"
  | "5-3-2"
  | "5-4-1";

export const BonusModuloGironi: Record<Modulo, number> = {
  "3-4-3": -1,
  "3-5-2": 2,
  "4-3-3": -1,
  "4-4-2": 0,
  "4-5-1": 2,
  "5-3-2": 2,
  "5-4-1": 2,
};

export const BonusModuloEliminazione: Record<Modulo, number> = {
  "3-4-3": -3,
  "3-5-2": -1,
  "4-3-3": -2,
  "4-4-2": 0,
  "4-5-1": 2,
  "5-3-2": 1,
  "5-4-1": 3,
};

export function calcolaBonusModulo(
  modulo: string,
  bonusModulo: Record<Modulo, number> = BonusModuloGironi
) {
  return bonusModulo[modulo as Modulo] ?? 0;
}