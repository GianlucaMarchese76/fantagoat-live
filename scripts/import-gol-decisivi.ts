import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Errore: indica il file Excel.");
  console.error("Uso: npm run import-gol-decisivi -- data/punteggi/gol_decisivi.xlsx");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
);

type RigaExcel = {
  giornata: string;
  blocco: string;
  giocatore: string;
  nazionale: string;
};

function normalizza(value: unknown) {
  return String(value ?? "").trim();
}

async function main() {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<RigaExcel>(sheet);

  console.log(`Righe lette: ${rows.length}`);

  for (const row of rows) {
    const giornata = normalizza(row.giornata);
    const blocco = normalizza(row.blocco);
    const giocatore = normalizza(row.giocatore);
    const nazionale = normalizza(row.nazionale);

    if (!giornata || !blocco || !giocatore || !nazionale) {
      console.warn("Riga saltata:", row);
      continue;
    }

    const { data: giocatoreData, error: giocatoreError } = await supabase
      .from("giocatori")
      .select("id, nome")
      .ilike("nome", giocatore)
      .eq("nazionale", nazionale)
      .single();

    if (giocatoreError || !giocatoreData) {
      console.error(
  `Giocatore non trovato: ${giocatore} (${nazionale})`
);
      continue;
    }

    const { error } = await supabase
      .from("gol_decisivi")
      .upsert(
        {
          giornata,
          blocco,
          giocatore_id: giocatoreData.id,
          punti: 1,
        },
        {
          onConflict: "giornata,blocco,giocatore_id",
        }
      );

    if (error) {
      console.error(`Errore inserimento ${giocatore}:`, error.message);
      continue;
    }

    console.log(`OK: ${giornata} ${blocco} - ${giocatoreData.nome}`);
  }

  console.log("Import gol decisivi completato.");
}

main();