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
    .select("numero_match, squadra_a, squadra_b, label, kickoff, ordine")
    .eq("competizione_id", competizioneData.id)
    .order("ordine", { ascending: true });

  const partiteValide =
    competizionePartite?.filter(
      (p) =>
        /^[A-Z]{3}$/.test(String(p.squadra_a ?? "")) &&
        /^[A-Z]{3}$/.test(String(p.squadra_b ?? ""))
    ) ?? [];

  const partiteFase =
    competizionePartite
      ?.map((p) => {
        const squadraA = String(p.squadra_a ?? "").trim().toUpperCase();
const squadraB = String(p.squadra_b ?? "").trim().toUpperCase();

        return {
          partita:
            p.label ??
            (squadraA && squadraB
              ? `${squadraA} - ${squadraB}`
              : String(p.numero_match ?? "")),
          kickoff: p.kickoff ?? "",
          ordine: p.ordine ?? 999,
        };
      })
      .sort((a, b) => a.ordine - b.ordine) ?? [];

  const avversariByNazionale = new Map<string, string>();

  for (const p of partiteValide) {
    const squadraA = String(p.squadra_a ?? "").trim().toUpperCase();
const squadraB = String(p.squadra_b ?? "").trim().toUpperCase();

    avversariByNazionale.set(squadraA, squadraB);
    avversariByNazionale.set(squadraB, squadraA);
  }

  const nazionaliAmmesse = Array.from(
    new Set(
      partiteValide.flatMap((p) => [
        String(p.squadra_a),
        String(p.squadra_b),
      ])
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
  giocatori
    ?.map((g) => {
      const quotazione = Number(
        (g as Record<string, unknown>)[campoQuotazione] ?? 0
      );

      return {
        id: g.id,
        nome: g.nome,
        ruolo: g.ruolo,
        nazionale: g.nazionale,
        avversaria:
          avversariByNazionale.get(
            String(g.nazionale ?? "").trim().toUpperCase()
          ) ?? undefined,
        quotazione_sedicesimi: quotazione,
      };
    })
    .filter((g) => g.quotazione_sedicesimi > 0) ?? [];

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

  const rosaBloccata =
  competizioneData.codice === "16ALTA" ||
  competizioneData.codice === "16BASSA" ||
      competizioneData.codice === "8ALTA";

    return (
    <CreaRosaClient
      competizione={competizioneData}
      partecipante={partecipanteData}
      giocatori={giocatoriNormalizzati}
      rosaIniziale={rosaIniziale}
      formazioneEsistente={formazioneEsistente ?? []}
      campoQuotazione={campoQuotazione}
      partite={partiteFase}
      rosaBloccata={rosaBloccata}
    />
  );
}