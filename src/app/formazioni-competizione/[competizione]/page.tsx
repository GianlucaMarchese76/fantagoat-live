import { supabase } from "../../../lib/supabase";
import FormazioneClient from "./FormazioneClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FormazioniPage({
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

  if (!competizioneData) {
    return (
      <main className="min-h-screen bg-slate-950 p-4 text-white">
        Competizione non trovata.
      </main>
    );
  }

  const { data: partecipanteData } = await supabase
    .from("partecipanti")
    .select("*")
    .eq("slug", partecipante.trim().toLowerCase())
    .single();

  if (!partecipanteData) {
    return (
      <main className="min-h-screen bg-slate-950 p-4 text-white">
        Partecipante non trovato.
      </main>
    );
  }

  const { data: rose } = await supabase
    .from("rose_competizione")
    .select("giocatore_id, costo")
    .eq("competizione_id", competizioneData.id)
    .eq("partecipante_id", partecipanteData.id);

  const idsGiocatori = rose?.map((r) => r.giocatore_id) ?? [];

  const { data: giocatori } = await supabase
    .from("giocatori")
    .select("id, nome, ruolo, nazionale")
    .in("id", idsGiocatori);

  const giocatoriRosa =
    giocatori?.map((g) => {
      const rigaRosa = rose?.find((r) => r.giocatore_id === g.id);

      return {
        id: g.id,
        nome: g.nome,
        ruolo: g.ruolo,
        nazionale: g.nazionale,
        costo: Number(rigaRosa?.costo ?? 0),
      };
    }) ?? [];

  const { data: formazioneSalvata } = await supabase
    .from("formazioni_competizione")
    .select("giocatore_id, tipo, ordine, is_capitano, is_vice, modulo")
    .eq("competizione_id", competizioneData.id)
    .eq("partecipante_id", partecipanteData.id)
    .order("ordine", { ascending: true });

const titolariIniziali =
  formazioneSalvata
    ?.filter((r) => r.tipo === "titolare")
    .map((r) => r.giocatore_id) ?? [];

const panchinaIniziale =
  formazioneSalvata
    ?.filter((r) => r.tipo === "panchina")
    .map((r) => r.giocatore_id) ?? [];

console.log("PANCHINA INIZIALE", panchinaIniziale);

  const capitanoIniziale =
    formazioneSalvata?.find((r) => r.is_capitano)?.giocatore_id ?? null;

  const viceIniziale =
    formazioneSalvata?.find((r) => r.is_vice)?.giocatore_id ?? null;

  const moduloIniziale = formazioneSalvata?.[0]?.modulo ?? "4-4-2";

  return (
  <main className="min-h-screen bg-slate-950 p-4 text-white">
    <div className="mb-4 flex gap-4">
      <a href="/" className="text-sm text-slate-300">
        ← Home
      </a>

      <a
        href={`/crea-rosa/${competizioneData.codice}?partecipante=${encodeURIComponent(
          partecipanteData.slug
        )}`}
        className="text-sm text-slate-300"
      >
        ← Torna alla rosa
      </a>
    </div>

    <FormazioneClient
      competizione={competizioneData}
      partecipante={partecipanteData}
      giocatoriRosa={giocatoriRosa}
      titolariIniziali={titolariIniziali}
      panchinaIniziale={panchinaIniziale}
      capitanoIniziale={capitanoIniziale}
      viceIniziale={viceIniziale}
      moduloIniziale={moduloIniziale}
    />
  </main>
);
}