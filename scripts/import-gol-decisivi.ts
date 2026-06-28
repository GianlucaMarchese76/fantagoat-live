import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Errore: indica il file Excel.");
  console.error(
    "Uso: npm run import-gol-decisivi -- data/punteggi/gol_decisivi.xlsx"
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type RigaExcel = {
  giornata: string;
  blocco: string;
  giocatore: string;
  nazionale: string;
  ruolo?: string;
  Position?: string;
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

    // accetta sia "ruolo" sia "Position"
    const ruolo = normalizza(row.ruolo || row.Position);

    if (!giornata || !blocco || !giocatore || !nazionale) {
      console.warn("Riga saltata:", row);
      continue;
    }

    // 1° ricerca: nome + nazionale
    const { data: candidati, error } = await supabase
      .from("giocatori")
      .select("id,nome,ruolo")
      .ilike("nome", giocatore)
      .eq("nazionale", nazionale);

    if (error) {
      console.error(
        `Errore ricerca ${giocatore}: ${error.message}`
      );
      continue;
    }

    if (!candidati || candidati.length === 0) {
      console.error(
        `Giocatore non trovato: ${giocatore} (${nazionale})`
      );
      continue;
    }

    let giocatori = candidati;

    // Se ambiguo e il ruolo è presente, filtra
    if (giocatori.length > 1 && ruolo) {
      giocatori = giocatori.filter(
        (g) => normalizza(g.ruolo) === ruolo
      );
    }

    if (giocatori.length === 0) {
      console.error(
        `Nessun giocatore con ruolo ${ruolo}: ${giocatore} (${nazionale})`
      );
      continue;
    }

    if (giocatori.length > 1) {
      console.error(
        `Giocatore ambiguo: ${giocatore} (${nazionale}) -> ${giocatori
          .map((g) => `${g.nome} ${g.ruolo}`)
          .join(", ")}`
      );
      continue;
    }

    const g = giocatori[0];

    const { error: upsertError } = await supabase
      .from("gol_decisivi")
      .upsert(
        {
          giornata,
          blocco,
          giocatore_id: g.id,
          punti: 1,
        },
        {
          onConflict: "giornata,blocco,giocatore_id",
        }
      );

    if (upsertError) {
      console.error(
        `Errore inserimento ${giocatore}: ${upsertError.message}`
      );
      continue;
    }

    console.log(
      `OK: ${giornata} ${blocco} - ${g.nome} ${g.ruolo}`
    );
  }

  console.log("Import gol decisivi completato.");
}

main();