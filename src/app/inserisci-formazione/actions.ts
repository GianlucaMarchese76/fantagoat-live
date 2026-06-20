"use server";

import { redirect } from "next/navigation";
import { supabase } from "../../lib/supabase";

export async function salvaFormazione(formData: FormData) {
  const partecipante = String(formData.get("partecipante"));
  const giornata = String(formData.get("giornata"));
  const blocco = String(formData.get("blocco"));
  const modulo = String(formData.get("modulo"));
  const bonusMalusModulo = Number(formData.get("bonus_malus_modulo") ?? 0);
  const capitano = String(formData.get("capitano"));
  const vice = String(formData.get("vice"));

  const { data: partecipanteRow, error: partecipanteError } = await supabase
    .from("partecipanti")
    .select("id")
    .eq("nome", partecipante)
    .single();

  if (partecipanteError || !partecipanteRow) {
    throw new Error("Partecipante non trovato");
  }

  const partecipanteId = partecipanteRow.id;

  const titolari = Array.from({ length: 11 }, (_, i) => ({
    slot: `T${i + 1}`,
    giocatore_id: String(formData.get(`titolare_${i + 1}`)),
    ruolo: String(formData.get(`ruolo_titolare_${i + 1}`)),
    tipo: "Titolare",
    ordine: i + 1,
  }));

  const panchina = Array.from({ length: 15 }, (_, i) => ({
    slot: `P${i + 1}`,
    giocatore_id: String(formData.get(`panchina_${i + 1}`)),
    ruolo: String(formData.get(`ruolo_panchina_${i + 1}`)),
    tipo: "Panchina",
    ordine: i + 1,
  }));

  const tutti = [...titolari, ...panchina];

  if (tutti.some((r) => !r.giocatore_id || r.giocatore_id === "null")) {
    throw new Error("Formazione incompleta");
  }

  if (!capitano || !vice || capitano === vice) {
    throw new Error("Capitano e vice non validi");
  }

  await supabase
    .from("formazioni")
    .delete()
    .eq("partecipante_id", partecipanteId)
    .eq("giornata", giornata)
    .eq("blocco", blocco);

  await supabase
    .from("formazioni_meta")
    .delete()
    .eq("partecipante_id", partecipanteId)
    .eq("giornata", giornata)
    .eq("blocco", blocco);

  const righeFormazione = tutti.map((r) => ({
    giornata,
    blocco,
    partecipante_id: partecipanteId,
    giocatore_id: r.giocatore_id,
    slot: r.slot,
    ruolo: r.ruolo,
    tipo: r.tipo,
    ordine: r.ordine,
    is_capitano: r.giocatore_id === capitano,
    is_vice: r.giocatore_id === vice,
  }));

  const { error: insertError } = await supabase
    .from("formazioni")
    .insert(righeFormazione);

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: metaError } = await supabase
    .from("formazioni_meta")
    .insert({
      giornata,
      blocco,
      partecipante_id: partecipanteId,
      modulo_dichiarato: modulo,
      bonus_malus_modulo: bonusMalusModulo,
    });

  if (metaError) {
    throw new Error(metaError.message);
  }

  redirect(`/formazioni/${encodeURIComponent(partecipante)}/${giornata}/${blocco}`);
}