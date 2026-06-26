import { supabase } from "../../../lib/supabase";
import CreaRosaClient from "./CreaRosaClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function datiCalendarioDaCodice(codice: string) {
  switch (codice) {
    case "16ALTA":
      return { giornata: "sedicesimi", blocco: "1-8" };
    case "16BASSA":
      return { giornata: "sedicesimi", blocco: "9-16" };
    case "8ALTA":
      return { giornata: "ottavi", blocco: "1-4" };
    case "8BASSA":
      return { giornata: "ottavi", blocco: "5-8" };
    case "QUARTI":
      return { giornata: "quarti", blocco: "unico" };
    case "SEMIFINALI":
      return { giornata: "semifinale", blocco: "unico" };
    case "TERZOPOSTO":
      return { giornata: "terzo_posto", blocco: "unico" };
    case "FINALE":
      return { giornata: "finale", blocco: "unico" };
    default:
      return null;
  }
}

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

  const calendario = datiCalendarioDaCodice(competizioneData.codice);

  const { data: partiteRaw } = calendario
    ? await supabase
        .from("calendario_partite")
        .select(
          "partita, kickoff, nazionale, avversaria, nome_nazionale, nome_avversaria"
        )
        .eq("giornata", calendario.giornata)
        .eq("blocco", calendario.blocco)
        .order("kickoff")
    : { data: [] };

  const partiteFase = Array.from(
    new Map(
      (partiteRaw ?? []).map((p) => {
        const casa = String(p.nazionale ?? "");
        const trasferta = String(p.avversaria ?? "");
        const chiave = [casa, trasferta].sort().join("-");

        return [
          chiave,
          {
            partita: `${casa} - ${trasferta}`,
            kickoff: p.kickoff,
          },
        ];
      })
    ).values()
  ).slice(0, 8);

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
      partite={partiteFase}
    />
  );
}