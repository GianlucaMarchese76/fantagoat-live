import { supabase } from "../../../../../lib/supabase";
import FormazioneClient from "./FormazioneClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InserisciFormazionePage({
  params,
}: {
  params: Promise<{
    partecipante: string;
    giornata: string;
    blocco: string;
  }>;
}) {
  const { partecipante, giornata, blocco } = await params;

  const partecipanteNorm = decodeURIComponent(partecipante);
  const giornataNorm = decodeURIComponent(giornata).toUpperCase();
  const bloccoNorm = decodeURIComponent(blocco).toUpperCase();

 const usaVecchiaRosa = giornataNorm.startsWith("G");

const { data: rosa, error: rosaError } = usaVecchiaRosa
  ? await supabase
      .from("v_rose")
      .select("*")
      .eq("partecipante", partecipanteNorm)
      .eq("blocco", bloccoNorm)
      .order("ruolo")
      .order("giocatore")
  : await supabase
      .from("v_rose_competizione")
      .select("*")
      .eq("partecipante", partecipanteNorm)
      .eq("giornata", giornataNorm.toLowerCase())
      .eq("blocco", bloccoNorm)
      .order("ruolo")
      .order("giocatore");

  const { data: calendario } = await supabase
    .from("calendario_partite")
    .select("giornata, blocco, nazionale, nome_avversaria, kickoff")
    .eq("giornata", giornataNorm)
    .eq("blocco", bloccoNorm);

    const { data: partecipanteRow } = await supabase
  .from("partecipanti")
  .select("id")
  .eq("nome", partecipanteNorm)
  .single();

const partecipanteId = partecipanteRow?.id;

const { data: formazioneEsistente } = partecipanteId
  ? await supabase
      .from("formazioni")
      .select("*")
      .eq("partecipante_id", partecipanteId)
      .eq("giornata", giornataNorm)
      .eq("blocco", bloccoNorm)
      .order("tipo")
      .order("ordine")
  : { data: [] };

const { data: metaEsistente } = partecipanteId
  ? await supabase
      .from("formazioni_meta")
      .select("*")
      .eq("partecipante_id", partecipanteId)
      .eq("giornata", giornataNorm)
      .eq("blocco", bloccoNorm)
      .maybeSingle()
  : { data: null };

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a href="/classifiche" className="text-blue-600 text-sm">
        ← Classifiche
      </a>

      <h1 className="text-4xl font-bold mt-5 mb-2">
        Inserisci formazione
      </h1>

      <div className="text-slate-600 mb-6">
        {partecipanteNorm} · {giornataNorm}
        {bloccoNorm}
      </div>

      {metaEsistente?.created_at ? (
  <div className="text-sm text-slate-500 mb-6">
    Ultimo salvataggio:{" "}
    {new Date(metaEsistente.created_at).toLocaleString("it-IT", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Rome",
    })}
  </div>
) : (
  <div className="text-sm text-slate-500 mb-6">
    Nessuna formazione salvata.
  </div>
)}

      {rosaError && (
        <pre className="text-red-600">
          {JSON.stringify(rosaError, null, 2)}
        </pre>
      )}

      <FormazioneClient
  partecipante={partecipanteNorm}
  giornata={giornataNorm}
  blocco={bloccoNorm}
  rosa={rosa ?? []}
  calendario={calendario ?? []}
  formazioneEsistente={formazioneEsistente ?? []}
  metaEsistente={metaEsistente}
/>
    </main>
  );
}