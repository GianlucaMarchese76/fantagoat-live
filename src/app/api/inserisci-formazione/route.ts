import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function POST(request: Request) {
  const formData = await request.formData();

  const partecipante = String(formData.get("partecipante") ?? "");
  const giornata = String(formData.get("giornata") ?? "");
  const blocco = String(formData.get("blocco") ?? "");
  const modulo = String(formData.get("modulo") ?? "");
  const bonusMalusModulo = Number(formData.get("bonus_malus_modulo") ?? 0);
  const capitano = String(formData.get("capitano") ?? "");
  const vice = String(formData.get("vice") ?? "");

const { data: partite, error: partiteError } = await supabase
  .from("calendario_partite")
  .select("kickoff")
  .eq("giornata", giornata)
  .eq("blocco", blocco)
  .order("kickoff", { ascending: true })
  .limit(1);

if (partiteError || !partite || partite.length === 0) {
  return NextResponse.json(
    { error: "Calendario non trovato" },
    { status: 400 }
  );
}

const primaPartita = new Date(partite[0].kickoff);
const chiusuraInserimento = new Date(
  primaPartita.getTime() - 5 * 60 * 1000
);

if (new Date() >= chiusuraInserimento) {
  return NextResponse.json(
    { error: "Inserimento formazione chiuso" },
    { status: 403 }
  );
}

  const { data: partecipanteRow, error: partecipanteError } = await supabase
    .from("partecipanti")
    .select("id")
    .eq("nome", partecipante)
    .single();

  if (partecipanteError || !partecipanteRow) {
    return NextResponse.json(
      { error: "Partecipante non trovato" },
      { status: 400 }
    );
  }

  const partecipanteId = partecipanteRow.id;

  const titolari = Array.from({ length: 11 }, (_, i) => ({
    slot: `T${i + 1}`,
    giocatore_id: String(formData.get(`titolare_${i + 1}`) ?? ""),
    ruolo: String(formData.get(`ruolo_titolare_${i + 1}`) ?? ""),
    tipo: "Titolare",
    ordine: i + 1,
  }));

  const panchina = Array.from({ length: 15 }, (_, i) => ({
    slot: `P${i + 1}`,
    giocatore_id: String(formData.get(`panchina_${i + 1}`) ?? ""),
    ruolo: String(formData.get(`ruolo_panchina_${i + 1}`) ?? ""),
    tipo: "Panchina",
    ordine: i + 1,
  }));

  const tutti = [...titolari, ...panchina];

  if (tutti.some((r) => !r.giocatore_id)) {
    return NextResponse.json(
      { error: "Formazione incompleta" },
      { status: 400 }
    );
  }

  const ids = tutti.map((r) => r.giocatore_id);
  const idsUnici = new Set(ids);

  if (idsUnici.size !== ids.length) {
    return NextResponse.json(
      { error: "Ci sono giocatori duplicati" },
      { status: 400 }
    );
  }

  if (!capitano || !vice || capitano === vice) {
    return NextResponse.json(
      { error: "Capitano e vice non validi" },
      { status: 400 }
    );
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
    modulo,
    bonus_malus_modulo: bonusMalusModulo,
  }));

  const { error: insertError } = await supabase
    .from("formazioni")
    .insert(righeFormazione);

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: metaError.message },
      { status: 500 }
    );
  }

  return NextResponse.redirect(
    new URL(
      `/formazioni/${encodeURIComponent(partecipante)}/${giornata}/${blocco}`,
      request.url
    ),
    303
  );
}