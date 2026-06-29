import { calcolaClassifica } from "./calcolaClassifica";

function codiceCompetizioneDaCalendario(giornata: string, blocco: string) {
  const key = `${giornata}|${blocco}`;

  const mappa: Record<string, string> = {
    "Sedicesimi|1-8": "16ALTA",
    "Sedicesimi|9-16": "16BASSA",
    "Ottavi|1-4": "8ALTA",
    "Ottavi|5-8": "8BASSA",
  };

  return mappa[key] ?? `${giornata}${blocco}`;
}

export async function getClassificaCompetizione(
  supabase: any,
  giornata: string,
  blocco: string,
  definitiva: boolean
) {
  const competizioneCodice = codiceCompetizioneDaCalendario(giornata, blocco);

  const { data, error } = await supabase
    .from("v_formazioni_competizione_live")
    .select("*")
    .eq("competizione_codice", competizioneCodice);

  if (error) {
    console.log("ERRORE getClassificaCompetizione", JSON.stringify(error, null, 2));
    return [];
  }

  return calcolaClassifica({
    rows: data ?? [],
    definitiva,
  });
}