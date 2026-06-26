export const ModuliFantagoat: Record<string, { label: string; ruoli: string[] }> = {
  M_343: {
    label: "3-4-3",
    ruoli: ["P", "D", "D", "D", "C", "C", "C", "C", "A", "A", "A"],
  },
  M_352: {
    label: "3-5-2",
    ruoli: ["P", "D", "D", "D", "C", "C", "C", "C", "C", "A", "A"],
  },
  M_433: {
    label: "4-3-3",
    ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "A", "A", "A"],
  },
  M_442: {
    label: "4-4-2",
    ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "C", "A", "A"],
  },
  M_451: {
    label: "4-5-1",
    ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "C", "C", "A"],
  },
  M_532: {
    label: "5-3-2",
    ruoli: ["P", "D", "D", "D", "D", "D", "C", "C", "C", "A", "A"],
  },
  M_541: {
    label: "5-4-1",
    ruoli: ["P", "D", "D", "D", "D", "D", "C", "C", "C", "C", "A"],
  },
};

export function normalizzaModulo(modulo: string | null | undefined) {
  if (!modulo) return "M_442";
  if (ModuliFantagoat[modulo]) return modulo;

  const trovato = Object.entries(ModuliFantagoat).find(
    ([, value]) => value.label === modulo
  );

  return trovato?.[0] ?? "M_442";
}