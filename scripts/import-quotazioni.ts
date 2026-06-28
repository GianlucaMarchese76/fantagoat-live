import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as XLSX from "xlsx";
import path from "path";
import { createClient } from "@supabase/supabase-js";

console.log("✅ Env caricata");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const CAMPO_QUOTAZIONE: Record<string, string> = {
  "16ALTA": "quotazione_sedicesimi",
  "16BASSA": "quotazione_sedicesimi",
  "8ALTA": "quotazione_ottavi",
  "8BASSA": "quotazione_ottavi",
  "QUARTI": "quotazione_quarti",
  "SEMIFINALI": "quotazione_semifinali",
  "TERZO_POSTO": "quotazione_finale",
  "FINALE": "quotazione_finale",
};

async function main() {
  console.log("🚀 Avvio import...");

  const competizione = process.argv[2]?.toUpperCase();

  if (!competizione) {
    throw new Error("Specificare la competizione");
  }

  console.log("Competizione:", competizione);

  const campo = CAMPO_QUOTAZIONE[competizione];

  if (!campo) {
    throw new Error("Competizione non riconosciuta");
  }

  console.log("Campo:", campo);

  const filePath = path.join(
    process.cwd(),
    "data",
    "quotazioni",
    `quotazioni_${competizione}.xlsx`
  );

  console.log("File:", filePath);

  const workbook = XLSX.readFile(filePath);

  console.log("Workbook aperto");

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  console.log(`Righe lette: ${rows.length}`);

  let aggiornati = 0;
  let nonTrovati = 0;

  for (const row of rows) {
    const nome = String(row["Name"] ?? "").trim();
    const nazionale = String(row["Team"] ?? "").trim();
    const quotazione = Number(row["Quotation"]);

    if (!nome || !nazionale || isNaN(quotazione)) continue;

    console.log(`${nome} (${nazionale}) -> ${quotazione}`);

    const { data, error } = await supabase
      .from("giocatori")
      .update({
        [campo]: quotazione,
      })
      .eq("nome", nome)
      .eq("nazionale", nazionale)
      .select();

    if (error) {
      console.error(error);
      continue;
    }

    if (!data || data.length === 0) {
      nonTrovati++;
      continue;
    }

    aggiornati++;
  }

  console.log("---------------------------");
  console.log("Aggiornati:", aggiornati);
  console.log("Non trovati:", nonTrovati);
  console.log("Import terminato");
}

main().catch(console.error);