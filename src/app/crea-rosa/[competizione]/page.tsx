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

  const { data: competizionePartite } = await supabase
    .from("competizioni_partite")
    .select("partita, ordine")
    .eq("competizione_id", competizioneData.id)
    .order("ordine", { ascending: true });

  const partiteIds = (competizionePartite ?? []).map((p) => p.partita);

  const { data: partiteRaw } =
    partiteIds.length > 0
      ? await supabase
          .from("calendario_partite")
          .select(
            "partita, kickoff, nazionale, avversaria, nome_nazionale, nome_avversaria"
          )
          .in("partita", partiteIds)
      : { data: [] };

      const avversariByNazionale = new Map<string, string>();

for (const p of partiteRaw ?? []) {
  const nazionale = String(p.nazionale ?? "");
  const avversaria = String(p.avversaria ?? "");

  if (/^[A-Z]{3}$/.test(nazionale) && /^[A-Z]{3}$/.test(avversaria)) {
    avversariByNazionale.set(nazionale, avversaria);
    avversariByNazionale.set(avversaria, nazionale);
  }
}

  const ordinePartite = new Map(
    (competizionePartite ?? []).map((p) => [p.partita, p.ordine ?? 999])
  );

  const partiteFase = Array.from(
  new Map(
    (partiteRaw ?? []).map((p) => {
      const casa = String(p.nazionale ?? "");
      const trasferta = String(p.avversaria ?? "");
      const numeroPartita = String(p.partita ?? "");

      return [
        numeroPartita,
        {
          partita: `${casa} - ${trasferta}`,
          kickoff: p.kickoff,
          ordine: ordinePartite.get(numeroPartita) ?? 999,
        },
      ];
    })
  ).values()
)
  .sort((a, b) => a.ordine - b.ordine)
  .slice(0, 8);

  const nazionaliAmmesse = Array.from(
    new Set(
      (partiteRaw ?? [])
        .flatMap((p) => [p.nazionale, p.avversaria])
        .filter((codice) => /^[A-Z]{3}$/.test(String(codice)))
    )
  );

  const { data: giocatori } =
    nazionaliAmmesse.length > 0
      ? await supabase
          .from("giocatori")
          .select(`id,nome,ruolo,nazionale,${campoQuotazione}`)
          .in("nazionale", nazionaliAmmesse)
          .order(campoQuotazione, { ascending: false })
      : { data: [] };

  const giocatoriNormalizzati =
  giocatori?.map((g) => ({
    id: g.id,
    nome: g.nome,
    ruolo: g.ruolo,
    nazionale: g.nazionale,
    avversaria: avversariByNazionale.get(g.nazionale) ?? null,
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

  const { data: formazioneEsistente } = await supabase
  .from("formazioni_competizione")
  .select("giocatore_id, tipo, ordine, is_capitano, is_vice, modulo")
  .eq("competizione_id", competizioneData.id)
  .eq("partecipante_id", partecipanteData.id)
  .order("tipo")
  .order("ordine");

  return (
    <CreaRosaClient
  competizione={competizioneData}
  partecipante={partecipanteData}
  giocatori={giocatoriNormalizzati}
  rosaIniziale={rosaIniziale}
  formazioneEsistente={formazioneEsistente ?? []}
  campoQuotazione={campoQuotazione}
  partite={partiteFase}
/>
  );
}