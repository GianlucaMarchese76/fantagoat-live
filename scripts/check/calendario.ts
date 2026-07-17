import { supabase, ok, err } from "./utils";

const ATTESE: Record<string, number> = {
  sedicesimi: 16,
  ottavi: 8,
  quarti: 4,
  semifinali: 2,
  finale: 1,
  TERZOPOSTO: 1,
};

async function main() {
  console.log("\n📅 CHECK CALENDARIO\n");

  const { data, error } = await supabase
    .from("calendario_partite")
    .select("*")
    .order("giornata")
    .order("partita");

  if (error) throw error;

  let errori = 0;

  for (const [giornata, attese] of Object.entries(ATTESE)) {
    const rows = (data ?? []).filter(r => r.giornata === giornata);

    const partite = new Map<string, typeof rows>();

    for (const r of rows) {
      const key = String(r.partita);

      if (!partite.has(key))
        partite.set(key, []);

      partite.get(key)!.push(r);
    }

    if (partite.size !== attese) {
      err(
        `${giornata}: trovate ${partite.size} partite, attese ${attese}`
      );
      errori++;
    } else {
      ok(`${giornata}: ${attese} partite`);
    }

    for (const [partita, squadre] of partite.entries()) {
      if (squadre.length !== 2) {
        err(
          `${giornata} partita ${partita}: ${squadre.length} squadre`
        );
        errori++;
      }

      const nazionali = squadre.map(s => s.nazionale);

      if (new Set(nazionali).size !== nazionali.length) {
        err(
          `${giornata} partita ${partita}: nazionale duplicata (${nazionali.join(", ")})`
        );
        errori++;
      }
    }
  }

  console.log("");

  if (errori === 0) {
    ok("Calendario integro");
  } else {
    err(`${errori} errori trovati`);
    process.exit(1);
  }
}

main();