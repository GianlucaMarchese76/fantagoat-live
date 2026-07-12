import { supabase } from "../../../lib/supabase";
import { calcolaTotaleFormazione } from "../../../lib/fantagoat/calcoloFormazioneFase2";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const COMPETIZIONI_FASE1 = [
  "G1AF",
  "G1GL",
  "G2AF",
  "G2GL",
  "G3AF",
  "G3GL",
];

const COMPETIZIONI_MATA_MATA = [
  "16ALTA",
  "16BASSA",
  "8ALTA",
  "8BASSA",
  "QUARTI",
  "SEMIFINALI",
  "TERZO_POSTO",
  "FINALE",
];

const COMPETIZIONI_GENERALE = [
  ...COMPETIZIONI_FASE1,
  ...COMPETIZIONI_MATA_MATA,
];

const MAPPA_COMPETIZIONI: Record<
  string,
  {
    giornata: string;
    blocco: string;
    titolo: string;
  }
> = {
  G1AF: {
    giornata: "G1",
    blocco: "AF",
    titolo: "Classifiche · Giornata 1 · Gironi A, B, C, D, E, F",
  },
  G1GL: {
    giornata: "G1",
    blocco: "GL",
    titolo: "Classifiche · Giornata 1 · Gironi G, H, I, J, K, L",
  },
  G2AF: {
    giornata: "G2",
    blocco: "AF",
    titolo: "Classifiche · Giornata 2 · Gironi A, B, C, D, E, F",
  },
  G2GL: {
    giornata: "G2",
    blocco: "GL",
    titolo: "Classifiche · Giornata 2 · Gironi G, H, I, J, K, L",
  },
  G3AF: {
    giornata: "G3",
    blocco: "AF",
    titolo: "Classifiche · Giornata 3 · Gironi A, B, C, D, E, F",
  },
  G3GL: {
    giornata: "G3",
    blocco: "GL",
    titolo: "Classifiche · Giornata 3 · Gironi G, H, I, J, K, L",
  },

  "16ALTA": {
    giornata: "Sedicesimi",
    blocco: "1-8",
    titolo: "Classifiche · Sedicesimi · Tabellone 1-8",
  },
  "16BASSA": {
    giornata: "Sedicesimi",
    blocco: "9-16",
    titolo: "Classifiche · Sedicesimi · Tabellone 9-16",
  },
  "8ALTA": {
    giornata: "Ottavi",
    blocco: "1-4",
    titolo: "Classifiche · Ottavi · Tabellone 1-4",
  },
  "8BASSA": {
    giornata: "Ottavi",
    blocco: "5-8",
    titolo: "Classifiche · Ottavi · Tabellone 5-8",
  },
  QUARTI: {
    giornata: "quarti",
    blocco: "unico",
    titolo: "Classifiche · Quarti di Finale",
  },
  SEMIFINALI: {
    giornata: "semifinali",
    blocco: "unico",
    titolo: "Classifiche · Semifinali",
  },
  TERZO_POSTO: {
    giornata: "terzo_posto",
    blocco: "unico",
    titolo: "Classifiche · Finale 3° Posto",
  },
  FINALE: {
    giornata: "finale",
    blocco: "unico",
    titolo: "Classifiche · Finale",
  },
};

type RigaClassifica = {
  competizione: string;
  partecipante_id: string;
  punti: number | string | null;
  posizione: number | null;
  partecipanti:
    | {
        id: string;
        nome: string;
        slug: string;
      }
    | {
        id: string;
        nome: string;
        slug: string;
      }[]
    | null;
};

type RigaClassificaVisualizzata = {
  partecipante_id?: string;
  partecipante: string;
  slug: string;
  posizione: number;
  punti: number;
};

function normalizzaCompetizione(value: string) {
  const decoded = decodeURIComponent(value).toUpperCase();

  if (decoded === "TERZO-POSTO") return "TERZO_POSTO";
  if (decoded === "MATA_MATA_CUP") return "MATA-MATA-CUP";

  return decoded;
}

function formatPunti(punti: number) {
  return Number.isInteger(punti) ? String(punti) : punti.toFixed(1);
}

function getPartecipante(join: RigaClassifica["partecipanti"]) {
  if (Array.isArray(join)) return join[0] ?? null;
  return join ?? null;
}

async function getClassificaDaTabella(
  codici: string[]
): Promise<RigaClassificaVisualizzata[]> {
  const { data, error } = await supabase
    .from("classifiche")
    .select(
      `
      competizione,
      partecipante_id,
      punti,
      posizione,
      partecipanti:partecipante_id (
        id,
        nome,
        slug
      )
    `
    )
    .in("competizione", codici);

  if (error) {
    console.error("Errore caricamento classifica:", error);
    return [];
  }

  const map = new Map<
    string,
    {
      partecipante_id: string;
      partecipante: string;
      slug: string;
      punti: number;
    }
  >();

  for (const r of (data ?? []) as RigaClassifica[]) {
    if (!r.partecipante_id) continue;

    const partecipante = getPartecipante(r.partecipanti);
    if (!partecipante) continue;

    const precedente = map.get(r.partecipante_id);

    map.set(r.partecipante_id, {
      partecipante_id: r.partecipante_id,
      partecipante: partecipante.nome,
      slug: partecipante.slug,
      punti: (precedente?.punti ?? 0) + Number(r.punti ?? 0),
    });
  }

  return Array.from(map.values())
    .sort(
      (a, b) =>
        b.punti - a.punti ||
        a.partecipante.localeCompare(b.partecipante)
    )
    .map((r, index) => ({
      ...r,
      posizione: index + 1,
      punti: Number(r.punti.toFixed(1)),
    }));
}

function HeaderTitolo({ titolo }: { titolo: string }) {
  const [prima, ...rest] = titolo.split("·");
  const sottotitolo = rest.join("·").trim();

  return (
    <h1 className="leading-tight">
      <span className="block text-4xl font-black">
        {prima.trim()}
      </span>

      {sottotitolo && (
        <span className="mt-1 block text-3xl font-semibold text-slate-500">
          {sottotitolo}
        </span>
      )}
    </h1>
  );
}

function ClassificaList({
  classifica,
  codice,
  aggregata = false,
}: {
  classifica: RigaClassificaVisualizzata[];
  codice: string;
  aggregata?: boolean;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow">
      <div className="grid gap-2">
        {classifica.length === 0 && (
          <div className="text-slate-500">
            Nessun dato disponibile.
          </div>
        )}

        {classifica.map((r) => {
          const href =
            aggregata ||
            codice === "GENERALE" ||
            codice === "MATA-MATA-CUP"
              ? `/partecipanti/${encodeURIComponent(r.slug)}`
              : COMPETIZIONI_FASE1.includes(codice)
                ? `/formazioni/${encodeURIComponent(
                    r.slug
                  )}/${codice.slice(0, 2)}/${codice.slice(2)}`
                : `/formazioni-competizione/${codice}/dettaglio?partecipante=${encodeURIComponent(
                    r.slug
                  )}`;

          return (
            <a
              key={r.partecipante_id ?? r.slug ?? r.partecipante}
              href={href}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-8 text-xl font-bold">
                  {r.posizione}.
                </div>

                <div className="truncate font-semibold">
                  {r.partecipante}
                </div>
              </div>

              <div className="text-2xl font-bold tabular-nums">
                {formatPunti(Number(r.punti ?? 0))}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function PaginaClassifica({
  titolo,
  classifica,
  codice,
  aggregata = false,
  errore,
}: {
  titolo: string;
  classifica: RigaClassificaVisualizzata[];
  codice: string;
  aggregata?: boolean;
  errore?: unknown;
}) {
  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-sm text-blue-600">
          ← Classifiche
        </a>

        <header className="mt-5 mb-6">
          <HeaderTitolo titolo={titolo} />
        </header>

        {Boolean(errore) && (
  <pre className="mb-4 overflow-auto rounded-xl bg-red-50 p-4 text-sm text-red-600">
    {JSON.stringify(errore, null, 2)}
  </pre>
)}

        <ClassificaList
          classifica={classifica}
          codice={codice}
          aggregata={aggregata}
        />
      </div>
    </main>
  );
}

export default async function ClassificaPage({
  params,
}: {
  params: Promise<{ competizione: string }>;
}) {
  const { competizione } = await params;
  const competizioneNorm = normalizzaCompetizione(competizione);

  if (competizioneNorm === "GENERALE") {
    const classifica = await getClassificaDaTabella(
      COMPETIZIONI_GENERALE
    );

    return (
      <PaginaClassifica
        titolo="Classifica · Generale"
        classifica={classifica}
        codice="GENERALE"
        aggregata
      />
    );
  }

  if (competizioneNorm === "MATA-MATA-CUP") {
    const classifica = await getClassificaDaTabella(
      COMPETIZIONI_MATA_MATA
    );

    return (
      <PaginaClassifica
        titolo="Classifica · Mata Mata Cup"
        classifica={classifica}
        codice="MATA-MATA-CUP"
        aggregata
      />
    );
  }

  if (COMPETIZIONI_FASE1.includes(competizioneNorm)) {
    const configurazione = MAPPA_COMPETIZIONI[competizioneNorm];
    const classifica = await getClassificaDaTabella([
      competizioneNorm,
    ]);

    return (
      <PaginaClassifica
        titolo={configurazione.titolo}
        classifica={classifica}
        codice={competizioneNorm}
      />
    );
  }

  const configurazione = MAPPA_COMPETIZIONI[competizioneNorm];

  if (!configurazione) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto max-w-3xl">
          <a href="/" className="text-sm text-blue-600">
            ← Classifiche
          </a>

          <div className="mt-6 rounded-2xl bg-white p-5 shadow">
            Competizione non riconosciuta.
          </div>
        </div>
      </main>
    );
  }

  const titoloPagina = configurazione.titolo;

  const { data: statoFase, error: statoFaseError } = await supabase
    .from("v_competizioni_concluse")
    .select("conclusa")
    .ilike("giornata", configurazione.giornata)
    .ilike("blocco", configurazione.blocco)
    .maybeSingle();

  if (statoFaseError) {
    console.error(
      "Errore caricamento stato competizione:",
      statoFaseError
    );
  }

  /*
   * Quando la competizione è conclusa, usa il risultato
   * ufficiale salvato nella tabella classifiche.
   */
  if (statoFase?.conclusa) {
    const classifica = await getClassificaDaTabella([
      competizioneNorm,
    ]);

    return (
      <PaginaClassifica
        titolo={titoloPagina}
        classifica={classifica}
        codice={competizioneNorm}
      />
    );
  }

  /*
   * Quando la competizione non è ancora conclusa,
   * continua a calcolare la classifica live dalla vista
   * v_formazioni_competizione_live.
   */
  const { data, error } = await supabase
    .from("v_formazioni_competizione_live")
    .select("*")
    .eq("competizione_codice", competizioneNorm)
    .order("partecipante")
    .order("tipo")
    .order("ordine");

  const gruppi = new Map<string, any[]>();

  for (const row of data ?? []) {
    const key =
      row.partecipante_slug ??
      row.partecipante;

    if (!gruppi.has(key)) {
      gruppi.set(key, []);
    }

    gruppi.get(key)!.push(row);
  }

  const classifica: RigaClassificaVisualizzata[] = Array.from(
    gruppi.entries()
  )
    .map(([slug, rows]) => ({
      slug,
      partecipante_id: rows[0]?.partecipante_id,
      partecipante: rows[0]?.partecipante ?? slug,
      posizione: 0,
      punti: calcolaTotaleFormazione(rows),
    }))
    .sort(
      (a, b) =>
        b.punti - a.punti ||
        a.partecipante.localeCompare(b.partecipante)
    )
    .map((r, index) => ({
      ...r,
      posizione: index + 1,
      punti: Number(r.punti.toFixed(1)),
    }));

  return (
    <PaginaClassifica
      titolo={titoloPagina}
      classifica={classifica}
      codice={competizioneNorm}
      errore={error}
    />
  );
}
