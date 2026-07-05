import Link from "next/link";
import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ORDINE_COMPETIZIONI = [
  "G1AF",
  "G1GL",
  "G2AF",
  "G2GL",
  "G3AF",
  "G3GL",
  "16ALTA",
  "16BASSA",
  "8ALTA",
  "8BASSA",
];

const COMPETIZIONI_FASE_1 = [
  "G1AF",
  "G1GL",
  "G2AF",
  "G2GL",
  "G3AF",
  "G3GL",
];

const COMPETIZIONI_SEDICESIMI = ["16ALTA", "16BASSA"];
const COMPETIZIONI_OTTAVI = ["8ALTA", "8BASSA"];

type RigaClassifica = {
  competizione: string;
  punti: number | string | null;
  posizione: number | null;
};

function formatPunti(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function sommaPunti(righe: RigaClassifica[], competizioni: string[]) {
  return righe
    .filter((r) => competizioni.includes(r.competizione))
    .reduce((sum, r) => sum + Number(r.punti ?? 0), 0);
}

function getFormazioneHref(
  partecipanteNome: string,
  partecipanteSlug: string,
  competizione: string
) {
  if (competizione.startsWith("G")) {
    const giornata = competizione.slice(0, 2);
    const blocco = competizione.slice(2);

    return `/formazioni/${encodeURIComponent(
      partecipanteNome
    )}/${giornata}/${blocco}`;
  }

  return `/formazioni-competizione/${competizione}/dettaglio?partecipante=${encodeURIComponent(
    partecipanteSlug
  )}`;
}

function labelCompetizioneDettaglio(competizione: string) {
  const labels: Record<string, string> = {
    G1AF: "G1 A-F",
    G1GL: "G1 G-L",
    G2AF: "G2 A-F",
    G2GL: "G2 G-L",
    G3AF: "G3 A-F",
    G3GL: "G3 G-L",
    "16ALTA": "Sedicesimi 1-8",
    "16BASSA": "Sedicesimi 9-16",
    "8ALTA": "Ottavi 1-4",
    "8BASSA": "Ottavi 5-8",
  };

  return labels[competizione] ?? competizione;
}

export default async function PartecipantePage({
  params,
}: {
  params: Promise<{ nome: string }>;
}) {
  const { nome } = await params;
  const parametro = decodeURIComponent(nome).toLowerCase().replaceAll(" ", "");

  const { data: partecipante } = await supabase
    .from("partecipanti")
    .select("id,nome,slug")
    .eq("slug", parametro)
    .maybeSingle();

  if (!partecipante) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <Link href="/" className="text-sm text-blue-600">
          ← Home
        </Link>

        <section className="mt-6 rounded-2xl bg-white p-4 shadow">
          <h1 className="text-2xl font-bold">Partecipante non trovato</h1>
          <p className="mt-2 text-sm text-slate-500">
            Parametro ricevuto: {parametro}
          </p>
        </section>
      </main>
    );
  }

  const { data } = await supabase
    .from("classifiche")
    .select("competizione,punti,posizione")
    .eq("partecipante_id", partecipante.id);

  const risultati = ((data ?? []) as RigaClassifica[])
    .filter((r) => ORDINE_COMPETIZIONI.includes(r.competizione))
    .sort(
      (a, b) =>
        ORDINE_COMPETIZIONI.indexOf(a.competizione) -
        ORDINE_COMPETIZIONI.indexOf(b.competizione)
    );

  const totaleFase1 = sommaPunti(risultati, COMPETIZIONI_FASE_1);
  const totaleSedicesimi = sommaPunti(risultati, COMPETIZIONI_SEDICESIMI);
  const totaleOttavi = sommaPunti(risultati, COMPETIZIONI_OTTAVI);
  const totaleGenerale = totaleFase1 + totaleSedicesimi + totaleOttavi;

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <Link href="/" className="text-sm text-blue-600">
        ← Home
      </Link>

      <header className="mb-6 mt-5">
        <h1 className="text-4xl font-bold">{partecipante.nome}</h1>

        <div className="mt-3 flex gap-4 text-sm">
          <Link
            href={`/partecipanti/${encodeURIComponent(partecipante.slug)}/AF`}
            className="font-semibold text-blue-600 hover:underline"
          >
            Rosa A-F
          </Link>

          <Link
            href={`/partecipanti/${encodeURIComponent(partecipante.slug)}/GL`}
            className="font-semibold text-blue-600 hover:underline"
          >
            Rosa G-L
          </Link>
        </div>
      </header>

      <section className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm font-semibold text-slate-500">
            Classifica Generale
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums">
            {formatPunti(totaleGenerale)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm font-semibold text-slate-500">
            Prima fase
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums">
            {formatPunti(totaleFase1)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm font-semibold text-slate-500">
            Sedicesimi
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums">
            {formatPunti(totaleSedicesimi)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-sm font-semibold text-slate-500">Ottavi</div>
          <div className="mt-2 text-3xl font-black tabular-nums">
            {formatPunti(totaleOttavi)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-4 text-xl font-bold">
          Dettaglio Classifica Generale
        </h2>

        <div className="grid gap-2">
          {risultati.map((r) => (
            <Link
              key={r.competizione}
              href={getFormazioneHref(
  partecipante.nome,
  partecipante.slug,
  r.competizione
)}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
            >
              <div>
                <div className="font-bold">
                  {labelCompetizioneDettaglio(r.competizione)}
                </div>

                <div className="text-xs text-blue-600">
                  Apri formazione →
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums">
                  {formatPunti(Number(r.punti ?? 0))}
                </div>

                {r.posizione ? (
                  <div className="text-xs text-slate-500">
                    Pos. {r.posizione}
                  </div>
                ) : null}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="text-xl font-bold">Totale</div>

          <div className="text-3xl font-bold tabular-nums">
            {formatPunti(totaleGenerale)}
          </div>
        </div>
      </section>
    </main>
  );
}