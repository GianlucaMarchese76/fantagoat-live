function slugPartecipante(nome: string) {
  return String(nome ?? "").toLowerCase().replaceAll(" ", "");
}

async function leggiCompetizione(
  supabase: any,
  competizione: string
) {
  const { data } = await supabase
    .from("v_classifiche")
    .select("*")
    .eq("competizione", competizione);

  return data ?? [];
}

export async function getClassificaCompetizione(
  supabase: any,
  competizioneOrGiornata: string,
  blocco?: string,
  definitiva?: boolean
) {
  let competizioni: string[];

  // Compatibilità con il vecchio codice
  if (blocco) {
    if (
      competizioneOrGiornata === "Sedicesimi" &&
      (blocco === "1-8" || blocco === "9-16")
    ) {
      competizioni = ["16ALTA", "16BASSA"];
    } else if (
      competizioneOrGiornata === "Ottavi" &&
      (blocco === "1-4" || blocco === "5-8")
    ) {
      competizioni = ["8ALTA", "8BASSA"];
    } else {
      const mapping: Record<string, string> = {
        "1-8": "16ALTA",
        "9-16": "16BASSA",
        "1-4": "8ALTA",
        "5-8": "8BASSA",
      };

      competizioni = [
        mapping[blocco] ?? competizioneOrGiornata,
      ];
    }
  } else {
    if (competizioneOrGiornata === "16") {
      competizioni = ["16ALTA", "16BASSA"];
    } else if (competizioneOrGiornata === "8") {
      competizioni = ["8ALTA", "8BASSA"];
    } else {
      competizioni = [competizioneOrGiornata];
    }
  }

  const map = new Map<
    string,
    {
      partecipante: string;
      slug: string;
      punti: number;
    }
  >();

  for (const competizione of competizioni) {
    const rows = await leggiCompetizione(supabase, competizione);

    for (const r of rows) {
      const slug = slugPartecipante(r.partecipante);

      if (!map.has(slug)) {
        map.set(slug, {
          partecipante: r.partecipante,
          slug,
          punti: 0,
        });
      }

      map.get(slug)!.punti += Number(r.punti ?? 0);
    }
  }

  return Array.from(map.values())
    .map((r) => ({
      posizione: 0,
      partecipante: r.partecipante,
      slug: r.slug,
      punti: Number(r.punti.toFixed(1)),
    }))
    .sort((a, b) => b.punti - a.punti)
    .map((r, index) => ({
      ...r,
      posizione: index + 1,
    }));
}