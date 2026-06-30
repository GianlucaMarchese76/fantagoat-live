import { calcolaClassifica } from "./calcolaClassifica";

export async function getClassificaCompetizione(
  supabase: any,
  giornata: string,
  blocco: string,
  definitiva: boolean
) {
  const { data } = await supabase
    .from("v_formazioni_dettaglio_live")
    .select("*")
    .eq("giornata", giornata)
    .eq("blocco", blocco);

  return calcolaClassifica({
    rows: data ?? [],
    definitiva,
  });
}