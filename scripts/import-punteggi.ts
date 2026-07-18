import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import path from "node:path";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function parseFileName(filePath: string) {
  const base = path.basename(filePath, path.extname(filePath));
  const baseNorm = base.toLowerCase();

  const match = base.match(/^(G\d+)([A-Z]+)$/);

  if (match) {
    return {
      giornata: match[1],
      blocco: match[2] as string | null,
    };
  }

  if (baseNorm === "sedicesimi") {
    return {
      giornata: "sedicesimi",
      blocco: null as string | null,
    };
  }

  if (baseNorm === "ottavi") {
    return {
      giornata: "ottavi",
      blocco: null as string | null,
    };
  }

  if (baseNorm === "quarti") {
    return {
      giornata: "quarti",
      blocco: null as string | null,
    };
  }

    if (baseNorm === "semifinali") {
    return {
      giornata: "semifinali",
      blocco: null as string | null,
    };
  }

  if (baseNorm === "terzo_posto") {
    return {
      giornata: "terzo_posto",
      blocco: null as string | null,
    };
  }

  if (baseNorm === "finale") {
    return {
      giornata: "finale",
      blocco: null as string | null,
    };
  }

  throw new Error(
    `Nome file non valido: ${base}. Usa un nome come G2AF.xlsx, sedicesimi.xlsx, ottavi.xlsx, quarti.xlsx, semifinali.xlsx, terzo_posto.xlsx oppure finale.xlsx`
  );
}

function toNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "-"
  ) {
    return null;
  }

  const n = Number(String(value).replace(",", "."));

  return Number.isFinite(n) ? n : null;
}

function normalizeName(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeRole(value: unknown): string {
  const role = String(value ?? "")
    .trim()
    .toLowerCase();

  if (role === "goalkeeper") return "P";
  if (role === "defender") return "D";
  if (role === "midfielder") return "C";
  if (role === "forward") return "A";
  if (role === "attacker") return "A";
  if (role === "striker") return "A";

  return String(value ?? "").trim();
}

function normalizeTeam(value: unknown): string {
  return String(value ?? "").trim();
}

function makePlayerKey(
  nome: string,
  ruolo: string,
  nazionale: string
) {
  return `${nome}|${ruolo}|${nazionale}`.toLowerCase();
}

async function creaMappaBlocchiPerGiornata(
  giornata: string,
  rows: any[]
) {
  const nazionaliExcel = Array.from(
    new Set(
      rows
        .map((row) => normalizeTeam(row.Team))
        .filter(Boolean)
    )
  );

  const { data, error } = await supabase
    .from("calendario_partite")
    .select("nazionale, blocco")
    .ilike("giornata", giornata)
    .in("nazionale", nazionaliExcel);

  if (error) throw error;

  const bloccoByNazionale = new Map<string, string>();

  for (const r of data ?? []) {
    bloccoByNazionale.set(
      String(r.nazionale).trim(),
      String(r.blocco).trim()
    );
  }

  return bloccoByNazionale;
}

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    throw new Error(
      "Uso: npx tsx scripts/import-punteggi.ts data/punteggi/G2AF.xlsx oppure data/punteggi/sedicesimi.xlsx oppure data/punteggi/ottavi.xlsx oppure data/punteggi/quarti.xlsx oppure data/punteggi/semifinali.xlsx oppure data/punteggi/terzo_posto.xlsx oppure data/punteggi/finale.xlsx"
    );
  }

  const { giornata, blocco } = parseFileName(filePath);

  const giocatori: Array<{
    id: string;
    nome: string;
    ruolo: string;
    nazionale: string;
  }> = [];

  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from("giocatori")
      .select("id,nome,ruolo,nazionale")
      .range(from, to);

    if (error) throw error;

    giocatori.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      break;
    }
  }

  const { count, error: countError } = await supabase
    .from("giocatori")
    .select("*", {
      count: "exact",
      head: true,
    });

  if (countError) throw countError;

  console.log("Totale giocatori nel DB:", count);

  const giocatoriByKey = new Map(
    giocatori.map((g) => [
      makePlayerKey(
        String(g.nome).trim(),
        String(g.ruolo).trim(),
        String(g.nazionale).trim()
      ),
      g.id,
    ])
  );

  const giocatoriList = giocatori.map((g) => ({
    id: g.id,
    nome: String(g.nome).trim(),
  }));

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    throw new Error("Il file Excel non contiene fogli leggibili.");
  }

  const rows = XLSX.utils.sheet_to_json<any>(sheet, {
    defval: null,
  });

  const usaMappaBlocchi =
    giornata === "sedicesimi" ||
    giornata === "ottavi";

  const bloccoByNazionale = usaMappaBlocchi
    ? await creaMappaBlocchiPerGiornata(giornata, rows)
    : new Map<string, string>();

  if (
  !usaMappaBlocchi &&
  !blocco &&
  giornata !== "quarti" &&
  giornata !== "semifinali" &&
  giornata !== "terzo_posto" &&
  giornata !== "finale"
) {
    throw new Error("Blocco non determinato.");
  }

  const records: any[] = [];
  const nonTrovati: string[] = [];
  const saltati: string[] = [];

  for (const row of rows) {
    const position = String(row.Position ?? "")
      .trim()
      .toLowerCase();

    if (position === "coach") {
      continue;
    }

    const nome = normalizeName(row.Name);

    if (!nome) {
      continue;
    }

    const ruolo = normalizeRole(row.Position);
    const nazionale = normalizeTeam(row.Team);

    let bloccoRecord: string | undefined;

    if (
  giornata === "quarti" ||
  giornata === "semifinali" ||
  giornata === "terzo_posto" ||
  giornata === "finale"
) {
      bloccoRecord = "unico";
    } else if (usaMappaBlocchi) {
      bloccoRecord = bloccoByNazionale.get(nazionale);
    } else {
      bloccoRecord = blocco ?? undefined;
    }

    if (!bloccoRecord) {
      saltati.push(`${nazionale} - ${nome}`);
      continue;
    }

    let nomeLookup = nome;

    if (
      nome === "M. Kim" &&
      ruolo === "D" &&
      nazionale === "KOR"
    ) {
      const quotazione = toNumber(row.Quotation) ?? 0;

      if (quotazione >= 20) {
        nomeLookup = "M. Kim (Min-jae)";
      } else {
        nomeLookup = "M. Kim (Moon-hwan)";
      }
    }

    const giocatoreId = giocatoriByKey.get(
      makePlayerKey(
        nomeLookup,
        ruolo,
        nazionale
      )
    );

    if (!giocatoreId) {
      const cognome = nome
        .split(" ")
        .slice(1)
        .join(" ")
        .toLowerCase();

      const possibiliMatch = cognome
        ? giocatoriList
            .filter((g) =>
              g.nome.toLowerCase().includes(cognome)
            )
            .slice(0, 5)
            .map((g) => g.nome)
        : [];

      console.log(
        `NON TROVATO: ${nome} -> possibili match DB:`,
        possibiliMatch
      );

      nonTrovati.push(
        `${nome} (${ruolo}, ${nazionale})`
      );

      continue;
    }

    records.push({
      giornata,
      blocco: bloccoRecord,
      giocatore_id: giocatoreId,
      voto: toNumber(row.Rating),
      fantapunti: toNumber(row.Fpt),
      voto_g2: toNumber(row.Rating),
      fantapunti_g2: toNumber(row.Fpt),

      nome_debug: nome,
      ruolo_debug: ruolo,
      nazionale_debug: nazionale,
    });
  }

  console.log(`Import ${giornata}`);
  console.log(`Blocco: ${blocco ?? "unico/multiplo"}`);
  console.log(`Righe Excel: ${rows.length}`);
  console.log(`Record pronti: ${records.length}`);
  console.log(
    `Giocatori non trovati: ${nonTrovati.length}`
  );
  console.log(
    `Righe saltate per nazionale fuori competizione: ${saltati.length}`
  );

  if (saltati.length > 0) {
    console.log("Prime righe saltate:");
    console.log(saltati.slice(0, 30));
  }

  if (nonTrovati.length > 0) {
    console.log("Primi non trovati:");
    console.log(nonTrovati.slice(0, 30));
  }

  const seen = new Map<string, any>();
  const duplicati: Array<{
    primo: any;
    duplicato: any;
  }> = [];

  for (const record of records) {
    const key =
      `${record.giornata}|` +
      `${record.blocco}|` +
      `${record.giocatore_id}`;

    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, record);
      continue;
    }

    duplicati.push({
      primo: existing,
      duplicato: record,
    });

    const existingScore =
      Number(existing.voto ?? 0) +
      Number(existing.fantapunti ?? 0);

    const currentScore =
      Number(record.voto ?? 0) +
      Number(record.fantapunti ?? 0);

    if (currentScore > existingScore) {
      seen.set(key, record);
    }
  }

  const recordsUnici = Array.from(seen.values());

  const recordsDaInserire = recordsUnici.map(
    ({
      nome_debug,
      ruolo_debug,
      nazionale_debug,
      ...record
    }) => record
  );

  if (duplicati.length > 0) {
    console.log("Duplicati effettivi:");

    for (const item of duplicati) {
      console.log({
        primo: {
          nome: item.primo.nome_debug,
          ruolo: item.primo.ruolo_debug,
          nazionale: item.primo.nazionale_debug,
          voto: item.primo.voto,
          fantapunti: item.primo.fantapunti,
        },
        duplicato: {
          nome: item.duplicato.nome_debug,
          ruolo: item.duplicato.ruolo_debug,
          nazionale: item.duplicato.nazionale_debug,
          voto: item.duplicato.voto,
          fantapunti: item.duplicato.fantapunti,
        },
      });
    }
  }

  console.log(`Record unici: ${recordsUnici.length}`);
  console.log(`Duplicati rimossi: ${duplicati.length}`);

  if (recordsDaInserire.length > 0) {
    const { error: upsertError } = await supabase
      .from("punteggi_giocatori")
      .upsert(recordsDaInserire, {
        onConflict:
          "giornata,blocco,giocatore_id",
      });

    if (upsertError) {
      throw upsertError;
    }
  }

  console.log("Import completato.");
  console.log(
    "Nota: import eseguito con upsert, senza delete preventivo."
  );
}

main().catch((error) => {
  console.error("Errore import punteggi:");
  console.error(error);
  process.exit(1);
});