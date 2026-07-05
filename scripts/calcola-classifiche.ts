import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { calcolaDettaglioFormazione } from "../src/lib/fantagoat/calcoloFormazioneFase2";
import { competizioniDesignanti } from "../src/lib/fantagoat/continuitaCapitano";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const competizioniFase1 = ["G1AF", "G1GL", "G2AF", "G2GL", "G3AF", "G3GL"];

const competizioniFase2 = [
  "16ALTA",
  "16BASSA",
  "8ALTA",
  "8BASSA",
  "QUARTI",
  "SEMIFINALI",
  "TERZO_POSTO",
  "FINALE",
];

const competizioniDaCalcolare = [...competizioniFase1, ...competizioniFase2];

function parseFase1(codice: string) {
  return {
    giornata: codice.slice(0, 2),
    blocco: codice.slice(2),
  };
}

function raggruppaPerPartecipante(rows: any[]) {
  const map = new Map<string, any[]>();

  for (const r of rows) {
    const id = r.partecipante_id;
    if (!id) continue;

    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(r);
  }

  return map;
}

async function salvaClassifica(
  codice: string,
  risultati: {
    competizione: string;
    partecipante_id: string;
    punti: number;
  }[]
) {
  risultati.sort((a, b) => b.punti - a.punti);

  const righeClassifica = risultati.map((r, index) => ({
    ...r,
    posizione: index + 1,
    updated_at: new Date().toISOString(),
  }));

  const { error: deleteError } = await supabase
    .from("classifiche")
    .delete()
    .eq("competizione", codice);

  if (deleteError) throw deleteError;

  if (righeClassifica.length === 0) {
    console.log(`⚠️ ${codice}: nessuna riga da salvare`);
    return;
  }

  const { error: insertError } = await supabase
    .from("classifiche")
    .insert(righeClassifica);

  if (insertError) throw insertError;

  console.log(`✅ ${codice}: ${righeClassifica.length} partecipanti aggiornati`);
}

async function salvaRisultatiCompetizione(codice: string, risultati: any[]) {
  const { error: deleteError } = await supabase
    .from("risultati_competizione")
    .delete()
    .eq("competizione", codice);

  if (deleteError) throw deleteError;

  if (risultati.length === 0) {
    console.log(`⚠️ ${codice}: nessun risultato competizione da salvare`);
    return;
  }

  const { error: insertError } = await supabase
    .from("risultati_competizione")
    .insert(risultati);

  if (insertError) throw insertError;

  console.log(`✅ ${codice}: risultati_competizione aggiornati`);
}

async function calcolaFase1(codice: string) {
  console.log(`\n🏆 Calcolo ${codice}`);

  const { giornata, blocco } = parseFase1(codice);

  const { data: rows, error } = await supabase
    .from("v_risultati_fase1")
    .select("partecipante,giornata,blocco,punti")
    .eq("giornata", giornata)
    .eq("blocco", blocco);

  if (error) throw error;

  if (!rows || rows.length === 0) {
    console.log(`⚠️ Nessun risultato trovato per ${codice}`);
    return;
  }

  const { data: partecipanti, error: partecipantiError } = await supabase
    .from("partecipanti")
    .select("id,nome,slug");

  if (partecipantiError) throw partecipantiError;

  const partecipantiBySlug = new Map(
    (partecipanti ?? []).map((p: any) => [p.slug, p.id])
  );

  const risultati = rows
    .map((r: any) => {
      const slug = String(r.partecipante ?? "")
        .toLowerCase()
        .replaceAll(" ", "");

      return {
        competizione: codice,
        partecipante_id: partecipantiBySlug.get(slug),
        punti: Number(Number(r.punti ?? 0).toFixed(1)),
      };
    })
    .filter((r: any) => r.partecipante_id);

  await salvaClassifica(codice, risultati);
}

async function getContinuitaCapitano(codice: string, partecipante_id: string) {
  const codiciDesignanti = competizioniDesignanti(codice);

  if (codiciDesignanti.length === 0) {
    return undefined;
  }

  const { data: designati, error } = await supabase
    .from("v_formazioni_competizione_live")
    .select("giocatore_id,is_capitano,is_vice,competizione_codice")
    .eq("partecipante_id", partecipante_id)
    .in("competizione_codice", codiciDesignanti)
    .or("is_capitano.eq.true,is_vice.eq.true");

  if (error) throw error;

  return {
    capitaniPrecedenti:
      designati?.filter((g) => g.is_capitano).map((g) => g.giocatore_id) ?? [],
    vicePrecedenti:
      designati?.filter((g) => g.is_vice).map((g) => g.giocatore_id) ?? [],
  };
}

async function calcolaFase2(codice: string) {
  console.log(`\n🏆 Calcolo ${codice}`);

  const { data: rows, error } = await supabase
    .from("v_formazioni_competizione_live")
    .select("*")
    .eq("competizione_codice", codice);

  if (error) throw error;

  if (!rows || rows.length === 0) {
    console.log(`⚠️ Nessuna formazione trovata per ${codice}`);
    return;
  }

  const gruppi = raggruppaPerPartecipante(rows);

  const righeClassifica: {
    competizione: string;
    partecipante_id: string;
    punti: number;
  }[] = [];

  const righeRisultati: any[] = [];

  for (const [partecipante_id, righe] of gruppi.entries()) {
    const continuitaCapitano = await getContinuitaCapitano(
      codice,
      partecipante_id
    );

    const dettaglio = calcolaDettaglioFormazione(righe, continuitaCapitano);
    const totale = Number(dettaglio.totaleFinale.toFixed(1));

    righeClassifica.push({
      competizione: codice,
      partecipante_id,
      punti: totale,
    });

    righeRisultati.push({
      competizione: codice,
      partecipante_id,

      totale,
      totale_giocatori: Number(dettaglio.totaleGiocatori.toFixed(1)),

      bonus_capitano: Number(dettaglio.bonusCapitano.toFixed(1)),
      bonus_panchina: Number(dettaglio.bonusPanchina.toFixed(1)),

      mod_difesa: Number(dettaglio.modificatoreDifesa.toFixed(1)),
      mod_centrocampo: Number(dettaglio.modificatoreCentrocampo.toFixed(1)),

      bonus_modulo: Number(dettaglio.bonusModulo.toFixed(1)),
      continuita: Number(dettaglio.continuitaCapitano.toFixed(1)),

      moltiplicatore: Number(dettaglio.moltiplicatore),

      modulo_finale: dettaglio.risultato.moduloFinale,

      created_at: new Date().toISOString(),
    });
  }

  await salvaClassifica(codice, righeClassifica);
  await salvaRisultatiCompetizione(codice, righeRisultati);
}

async function calcolaCompetizione(codice: string) {
  if (competizioniFase1.includes(codice)) {
    return calcolaFase1(codice);
  }

  return calcolaFase2(codice);
}

async function main() {
  const arg = process.argv[2]?.toUpperCase();
  const competizioni = arg ? [arg] : competizioniDaCalcolare;

  for (const codice of competizioni) {
    await calcolaCompetizione(codice);
  }

  console.log("\n✅ Classifiche aggiornate");
}

main().catch((error) => {
  console.error("❌ Errore:", error);
  process.exit(1);
});