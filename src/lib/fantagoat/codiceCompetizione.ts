export function codiceCompetizione(giornata: string, blocco: string) {
  if (giornata === "sedicesimi" && blocco === "1-8") return "16ALTA";
  if (giornata === "sedicesimi" && blocco === "9-16") return "16BASSA";
  if (giornata === "ottavi" && blocco === "1-4") return "8ALTA";
  if (giornata === "ottavi" && blocco === "5-8") return "8BASSA";
  if (giornata === "quarti") return "QUARTI";
  if (giornata === "semifinale") return "SEMIFINALI";
  if (giornata === "TERZOPOSTO") return "TERZOPOSTO";
  if (giornata === "finale") return "FINALE";

  return "16ALTA";
}