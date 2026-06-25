export function labelCompetizione(giornata: string, blocco: string) {
  if (giornata.startsWith("G")) {
    return `Giornata ${giornata.slice(1)} ${blocco}`;
  }

  switch (giornata) {
    case "16ALTA":
      return "Sedicesimi • Gare 1-8";
    case "16BASSA":
      return "Sedicesimi • Gare 9-16";
    case "8ALTA":
      return "Ottavi • Gare 1-4";
    case "8BASSA":
      return "Ottavi • Gare 5-8";
    case "QF":
      return "Quarti di finale";
    case "SF":
      return "Semifinali";
    case "3P":
      return "Finale 3° posto";
    case "FIN":
      return "Finale";
    default:
      return `${giornata} ${blocco}`.trim();
  }
}