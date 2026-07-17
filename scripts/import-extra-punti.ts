import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Errore: indica il file Excel.");
  console.error("Uso: npm run import-extra-punti -- data/punteggi/extra_punti_giocatori.xlsx");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type RigaExcel = {
  giornata: string;
  blocco: string;
  giocatore: string;
  nazionale: string;
  ruolo?: string;
  Position?: string;
  totale: number | string | null;
};

function normalizza(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "" || value === "-") {
    return 0;
  }

  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RigaExcel>(sheet, { defval: null });

  console.log(`Righe lette: ${rows.length}`);

  const fasiDaRipulire = Array.from(
  new Map(
    rows
      .map((row) => ({
        giornata: normalizza(row.giornata),
        blocco: normalizza(row.blocco),
      }))
      .filter((r) => r.giornata && r.blocco)
      .map((r) => [
        `${r.giornata.toLowerCase()}|${r.blocco.toLowerCase()}`,
        r,
      ])
  ).values()
);

for (const fase of fasiDaRipulire) {
  const { error: deleteError } = await supabase
    .from("extra_punti_giocatori")
    .delete()
    .ilike("giornata", fase.giornata)
    .ilike("blocco", fase.blocco);

  if (deleteError) {
    throw new Error(
      `Errore pulizia ${fase.giornata}/${fase.blocco}: ${deleteError.message}`
    );
  }

  console.log(
    `Pulizia completata: ${fase.giornata} / ${fase.blocco}`
  );
}

  for (const row of rows) {
    const giornata = normalizza(row.giornata);
    const blocco = normalizza(row.blocco);
    const giocatore = normalizza(row.giocatore);
    const nazionale = normalizza(row.nazionale);
    const ruolo = normalizza(row.ruolo || row.Position);
    const punti = toNumber(row.totale);

    if (!giornata || !blocco || !giocatore || !nazionale) {
      console.warn("Riga saltata:", row);
      continue;
    }

    const { data: candidati, error } = await supabase
      .from("giocatori")
      .select("id,nome,ruolo,nazionale")
      .ilike("nome", giocatore)
      .eq("nazionale", nazionale);

    if (error) {
      console.error(`Errore ricerca ${giocatore}: ${error.message}`);
      continue;
    }

    if (!candidati || candidati.length === 0) {
      console.error(`Giocatore non trovato: ${giocatore} (${nazionale})`);
      continue;
    }

    let giocatori = candidati;

    if (giocatori.length > 1 && ruolo) {
      giocatori = giocatori.filter((g) => normalizza(g.ruolo) === ruolo);
    }

    if (giocatori.length !== 1) {
      console.error(
        `Giocatore ambiguo/non trovato: ${giocatore} (${nazionale}) -> ${giocatori
          .map((g) => `${g.nome} ${g.ruolo}`)
          .join(", ")}`
      );
      continue;
    }

    const g = giocatori[0];

    const { error: upsertError } = await supabase
      .from("extra_punti_giocatori")
      .upsert(
        {
          giornata,
          blocco,
          giocatore_id: g.id,
          punti,
        },
        {
          onConflict: "giornata,blocco,giocatore_id",
        }
      );

    if (upsertError) {
      console.error(`Errore inserimento ${giocatore}: ${upsertError.message}`);
      continue;
    }

    console.log(`OK: ${giornata} ${blocco} - ${g.nome} ${g.ruolo} = ${punti}`);
  }

  console.log("Import extra punti completato.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});