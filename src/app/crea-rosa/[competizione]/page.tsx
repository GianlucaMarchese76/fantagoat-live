import { supabase } from "../../../lib/supabase";
import CreaRosaClient from "./CreaRosaClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CreaRosaCompetizionePage({
  params,
  searchParams,
}: {
  params: Promise<{ competizione: string }>;
  searchParams: Promise<{ partecipante?: string }>;
}) {
  const { competizione } = await params;

  const { partecipante } = await searchParams;

  if (!partecipante) {
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white">
      Partecipante mancante nella URL.
    </main>
  );
}

  const { data: competizioneData } = await supabase
    .from("competizioni")
    .select("*")
    .eq("codice", competizione.toUpperCase())
    .single();

const { data: partecipanteData } = await supabase
  .from("partecipanti")
  .select("*")
  .eq("slug", partecipante.toLowerCase())
  .single();

  if (!competizioneData) {
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white">
      Competizione non trovata.
    </main>
  );
}

if (!partecipanteData) {
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white">
      Partecipante non trovato.
    </main>
  );
}

  const campoQuotazione =
    competizioneData.codice === "16ALTA" ||
    competizioneData.codice === "16BASSA"
      ? "quotazione_sedicesimi"
      : competizioneData.codice === "8ALTA" ||
          competizioneData.codice === "8BASSA"
        ? "quotazione_ottavi"
        : competizioneData.codice === "QUARTI"
          ? "quotazione_quarti"
          : competizioneData.codice === "SEMIFINALI"
            ? "quotazione_semifinali"
            : "quotazione_finale";

  const { data: giocatori } = await supabase
    .from("giocatori")
    .select(`id,nome,ruolo,nazionale,${campoQuotazione}`)
    .order(campoQuotazione, { ascending: false });

  const giocatoriNormalizzati =
    giocatori?.map((g) => ({
      id: g.id,
      nome: g.nome,
      ruolo: g.ruolo,
      nazionale: g.nazionale,
      quotazione_sedicesimi: Number(
  (g as Record<string, unknown>)[campoQuotazione] ?? 0
),
    })) ?? [];

const { data: rosaSalvata } = await supabase
  .from("rose_competizione")
  .select("giocatore_id")
  .eq("competizione_id", competizioneData.id)
  .eq("partecipante_id", partecipanteData.id);

const idsRosaSalvata = rosaSalvata?.map((r) => r.giocatore_id) ?? [];

const rosaIniziale = giocatoriNormalizzati.filter((g) =>
  idsRosaSalvata.includes(g.id)
);

  return (
    <CreaRosaClient
  competizione={competizioneData}
    partecipante={partecipanteData}
    giocatori={giocatoriNormalizzati}
    rosaIniziale={rosaIniziale}
    campoQuotazione={campoQuotazione}
/>
  );
}