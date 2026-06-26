import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PartecipanteRow = {
  id: string;
  nome: string;
  slug: string;
};

type FormazioneOldRow = {
  giornata: string;
  blocco: string;
  partecipante_id: string;
};

type FormazioneCompetizioneRow = {
  competizione_id: string;
  partecipante_id: string;
};

type CompetizioneRow = {
  id: string;
  codice: string;
  nome: string;
  giornata: string;
  blocco: string;
  ordine: number;
};

type FormazioneItem = {
  label: string;
  href: string;
  ordinamento: number;
};

function labelFormazioneCompetizione(codice: string) {
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

export default async function FormazioniPage() {
  const { data: righeOld, error: errorOld } = await supabase
    .from("formazioni")
    .select("giornata, blocco, partecipante_id");

  const { data: righeCompetizione, error: errorCompetizione } =
    await supabase
      .from("formazioni_competizione")
      .select("competizione_id, partecipante_id");

  const { data: partecipanti } = await supabase
    .from("partecipanti")
    .select("id,nome,slug");

  const { data: competizioni } = await supabase
    .from("competizioni")
    .select("id,codice,nome,giornata,blocco,ordine");

  const partecipantiMap = new Map(
    ((partecipanti ?? []) as PartecipanteRow[]).map((p) => [p.id, p])
  );

  const competizioniMap = new Map(
    ((competizioni ?? []) as CompetizioneRow[]).map((c) => [c.id, c])
  );

  const gruppi = new Map<string, FormazioneItem[]>();

  for (const r of (righeOld ?? []) as FormazioneOldRow[]) {
    const partecipante = partecipantiMap.get(r.partecipante_id);
    if (!partecipante) continue;

    const lista = gruppi.get(partecipante.nome) ?? [];

    if (
      !lista.some(
        (x) => x.href ===
          `/formazioni/${encodeURIComponent(
            partecipante.nome
          )}/${r.giornata}/${r.blocco}`
      )
    ) {
      lista.push({
        label: `${r.giornata}${r.blocco}`,
        href: `/formazioni/${encodeURIComponent(
          partecipante.nome
        )}/${r.giornata}/${r.blocco}`,
        ordinamento: 0,
      });
    }

    gruppi.set(partecipante.nome, lista);
  }

  for (const r of (righeCompetizione ?? []) as FormazioneCompetizioneRow[]) {
    const partecipante = partecipantiMap.get(r.partecipante_id);
    const competizione = competizioniMap.get(r.competizione_id);

    if (!partecipante || !competizione) continue;

    const lista = gruppi.get(partecipante.nome) ?? [];

    const href = `/formazioni-competizione/${competizione.codice}?partecipante=${encodeURIComponent(
      partecipante.slug
    )}`;

    if (!lista.some((x) => x.href === href)) {
      lista.push({
        label: labelFormazioneCompetizione(competizione.codice),
        href,
        ordinamento: competizione.ordine,
      });
    }

    gruppi.set(partecipante.nome, lista);
  }

  const partecipantiConFormazioni = Array.from(gruppi.entries()).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <a href="/" className="text-sm text-blue-600">
        ← Home
      </a>

      <h1 className="mt-5 mb-6 text-4xl font-bold">
        Formazioni
      </h1>

      {(errorOld || errorCompetizione) && (
        <pre className="text-red-600">
          {JSON.stringify(errorOld ?? errorCompetizione, null, 2)}
        </pre>
      )}

      {partecipantiConFormazioni.length === 0 && (
        <section className="rounded-2xl bg-white p-4 shadow">
          <div className="text-slate-600">
            Nessuna formazione salvata.
          </div>
        </section>
      )}

      <div className="grid gap-4">
        {partecipantiConFormazioni.map(([partecipante, lista]) => (
          <section
            key={partecipante}
            className="rounded-2xl bg-white p-4 shadow"
          >
            <h2 className="mb-3 text-2xl font-bold">
              {partecipante}
            </h2>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[...lista]
                .sort((a, b) => a.ordinamento - b.ordinamento)
                .map((f) => (
                  <a
                    key={f.href}
                    href={f.href}
                    className="rounded-xl bg-slate-100 px-4 py-3 text-center font-bold"
                  >
                    {f.label}
                  </a>
                ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}