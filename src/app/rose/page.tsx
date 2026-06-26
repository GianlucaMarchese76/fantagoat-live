import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PartecipanteRow = {
  id: string;
  nome: string;
  slug: string;
};

type RosaOldRow = {
  partecipante: string;
  blocco: string;
};

type CompetizioneRow = {
  id: string;
  codice: string;
  nome: string;
  ordine: number;
};

type RosaItem = {
  label: string;
  href: string;
  ordinamento: number;
};

function labelCompetizione(codice: string) {
  switch (codice) {
    case "16ALTA":
      return "1/16 gare 1-8";
    case "16BASSA":
      return "1/16 gare 9-16";
    case "8ALTA":
      return "1/8 gare 1-4";
    case "8BASSA":
      return "1/8 gare 5-8";
    case "QUARTI":
      return "Quarti";
    case "SEMIFINALI":
      return "Semifinale";
    case "TERZOPOSTO":
      return "3°-4° posto";
    case "FINALE":
      return "Finale";
    default:
      return codice;
  }
}

export default async function RosePage() {
  const { data: roseOld, error: errorOld } = await supabase
    .from("v_rose")
    .select("partecipante, blocco");

  const { data: roseCompetizioneRaw, error: errorCompetizione } =
    await supabase
      .from("rose_competizione")
      .select("competizione_id, partecipante_id, giocatore_id");

  const { data: partecipanti } = await supabase
    .from("partecipanti")
    .select("id,nome,slug");

  const { data: competizioni } = await supabase
    .from("competizioni")
    .select("id,codice,nome,ordine");

  const partecipantiById = new Map(
    ((partecipanti ?? []) as PartecipanteRow[]).map((p) => [p.id, p])
  );

  const partecipantiByNome = new Map(
    ((partecipanti ?? []) as PartecipanteRow[]).map((p) => [p.nome, p])
  );

  const competizioniById = new Map(
    ((competizioni ?? []) as CompetizioneRow[]).map((c) => [c.id, c])
  );

  const roseCompetizioneComplete = Array.from(
    (
      (roseCompetizioneRaw ?? []).reduce((acc, r) => {
        const key = `${r.competizione_id}-${r.partecipante_id}`;

        if (!acc.has(key)) {
          acc.set(key, {
            competizione_id: String(r.competizione_id),
            partecipante_id: String(r.partecipante_id),
            giocatori: new Set<string>(),
          });
        }

        acc.get(key)!.giocatori.add(String(r.giocatore_id));

        return acc;
      }, new Map<string, {
        competizione_id: string;
        partecipante_id: string;
        giocatori: Set<string>;
      }>())
    ).values()
  ).filter((r) => r.giocatori.size === 16);

  const gruppi = new Map<string, RosaItem[]>();

  for (const r of (roseOld ?? []) as RosaOldRow[]) {
    const partecipante = partecipantiByNome.get(r.partecipante);
    if (!partecipante) continue;

    const lista = gruppi.get(partecipante.nome) ?? [];

    for (const giornata of ["G1", "G2", "G3"]) {
      const href = `/partecipanti/${encodeURIComponent(
        partecipante.nome
      )}/${r.blocco}`;

      if (!lista.some((x) => x.label === `${giornata}${r.blocco}`)) {
        lista.push({
          label: `${giornata}${r.blocco}`,
          href,
          ordinamento:
            giornata === "G1"
              ? r.blocco === "AF"
                ? 1
                : 2
              : giornata === "G2"
                ? r.blocco === "AF"
                  ? 3
                  : 4
                : r.blocco === "AF"
                  ? 5
                  : 6,
        });
      }
    }

    gruppi.set(partecipante.nome, lista);
  }

  for (const r of roseCompetizioneComplete) {
    const partecipante = partecipantiById.get(r.partecipante_id);
    const competizione = competizioniById.get(r.competizione_id);

    if (!partecipante || !competizione) continue;

    const lista = gruppi.get(partecipante.nome) ?? [];

    const href = `/crea-rosa/${competizione.codice}?partecipante=${encodeURIComponent(
      partecipante.slug
    )}`;

    if (!lista.some((x) => x.href === href)) {
      lista.push({
        label: labelCompetizione(competizione.codice),
        href,
        ordinamento: 100 + Number(competizione.ordine ?? 0),
      });
    }

    gruppi.set(partecipante.nome, lista);
  }

  const partecipantiConRose = Array.from(gruppi.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <a href="/" className="text-sm text-blue-600">
        ← Home
      </a>

      <h1 className="mt-5 mb-6 text-4xl font-bold">Rose</h1>

      {(errorOld || errorCompetizione) && (
        <pre className="text-red-600">
          {JSON.stringify(errorOld ?? errorCompetizione, null, 2)}
        </pre>
      )}

      {partecipantiConRose.length === 0 && (
        <section className="rounded-2xl bg-white p-4 shadow">
          <div className="text-slate-600">Nessuna rosa salvata.</div>
        </section>
      )}

      <div className="grid gap-4">
        {partecipantiConRose.map(([partecipante, lista]) => (
          <section
            key={partecipante}
            className="rounded-2xl bg-white p-4 shadow"
          >
            <h2 className="mb-3 text-2xl font-bold">{partecipante}</h2>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[...lista]
                .sort((a, b) => a.ordinamento - b.ordinamento)
                .map((r) => (
                  <a
                    key={`${partecipante}-${r.label}-${r.href}`}
                    href={r.href}
                    className="rounded-xl bg-slate-100 px-4 py-3 text-center font-bold"
                  >
                    {r.label}
                  </a>
                ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}