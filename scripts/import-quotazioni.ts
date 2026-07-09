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

function parseQuota(value: unknown) {
  return Math.round(
    Number(String(value ?? "").trim().replace(",", "."))
  );
}

async function main() {
  console.log("🚀 Avvio import...");

  const competizione = process.argv[2]?.toUpperCase();

  if (!competizione) {
    throw new Error("Specificare la competizione");
  }

  const campo = CAMPO_QUOTAZIONE[competizione];

  if (!campo) {
    throw new Error("Competizione non riconosciuta");
  }

  console.log("Competizione:", competizione);
  console.log("Campo:", campo);

  console.log(`🧹 Azzero ${campo}...`);

  const { error: resetError } = await supabase
    .from("giocatori")
    .update({ [campo]: null })
    .not("id", "is", null);

  if (resetError) throw resetError;

  console.log("✅ Reset completato");

  const filePath = path.join(
    process.cwd(),
    "data",
    "quotazioni",
    `quotazioni_${competizione}.xlsx`
  );

  console.log("File:", filePath);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

  console.log(`Righe lette: ${rows.length}`);

  let aggiornati = 0;
  let nonTrovati = 0;
  let saltati = 0;
  let ambigui = 0;

  for (const row of rows) {
    const nome = String(row["Name"] ?? "").trim();
    const nazionale = String(row["Team"] ?? "").trim();
    const ruolo = String(
      row["Role"] ?? row["Ruolo"] ?? row["Position"] ?? ""
    ).trim();

    const quotazione = parseQuota(row["Quotation"]);

    if (!nome || !nazionale || isNaN(quotazione) || quotazione <= 0) {
      saltati++;
      continue;
    }

    let query = supabase
      .from("giocatori")
      .update({
        [campo]: quotazione,
      })
      .eq("nome", nome)
      .eq("nazionale", nazionale);

    if (ruolo) {
      query = query.eq("ruolo", ruolo);
    }

    const { data, error } = await query.select("id,nome,nazionale,ruolo");

    if (error) {
      console.error("Errore:", nome, nazionale, ruolo, error);
      continue;
    }

    if (!data || data.length === 0) {
      nonTrovati++;
      console.log(`❌ Non trovato: ${nome} (${nazionale}) ${ruolo || ""}`);
      continue;
    }

    if (data.length > 1) {
      ambigui++;
      console.log(
        `⚠️ Ambiguo: ${nome} (${nazionale}) ${ruolo || ""} -> aggiornati ${data.length} record`
      );
    }

    aggiornati += data.length;

    console.log(`✅ ${nome} (${nazionale}) ${ruolo || ""} -> ${quotazione}`);
  }

  const { count: valorizzati } = await supabase
    .from("giocatori")
    .select("*", { count: "exact", head: true })
    .not(campo, "is", null);

  console.log("---------------------------");
  console.log("Righe Excel:", rows.length);
  console.log("Aggiornati:", aggiornati);
  console.log("Valorizzati nel DB:", valorizzati ?? 0);
  console.log("Non trovati:", nonTrovati);
  console.log("Ambigui:", ambigui);
  console.log("Saltati:", saltati);
  console.log("Import terminato");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});