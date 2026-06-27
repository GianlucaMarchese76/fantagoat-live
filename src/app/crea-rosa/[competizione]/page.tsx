import { supabase } from "../../../lib/supabase";
import CreaRosaClient from "./CreaRosaClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAPPA_SEDICESIMI: Record<
  string,
  { casa: string; trasferta: string; label: string }
> = {
  "73": { casa: "CAN", trasferta: "SUD", label: "CAN - SUD" },
  "74": { casa: "GER", trasferta: "PAR", label: "GER - PAR" },
  "75": { casa: "OLA", trasferta: "MAR", label: "OLA - MAR" },
  "77": { casa: "FRA", trasferta: "SVE", label: "FRA - SVE" },
  "81": { casa: "USA", trasferta: "BOS", label: "USA - BOS" },
  "82": {
    casa: "BEL",
    trasferta: "3A/E/H/I/J",
    label: "BEL - 3ª classificata",
  },
  "83": { casa: "2K", trasferta: "2L", label: "2K - 2L" },
  "84": { casa: "SPA", trasferta: "2J", label: "SPA - 2J" },
};

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

  const partiteFase = (competizionePartite ?? [])
    .map((p) => {
      const numeroPartita = String(p.partita);
      const match = MAPPA_SEDICESIMI[numeroPartita];

      return {
        partita: match?.label ?? numeroPartita,
        kickoff: "",
        ordine: p.ordine ?? 999,
      };
    })
    .sort((a, b) => a.ordine - b.ordine)
    .slice(0, 8);

  const avversariByNazionale = new Map<string, string>();

  for (const p of competizionePartite ?? []) {
    const numeroPartita = String(p.partita);
    const match = MAPPA_SEDICESIMI[numeroPartita];

    if (!match) continue;

    if (/^[A-Z]{3}$/.test(match.casa) && /^[A-Z]{3}$/.test(match.trasferta)) {
      avversariByNazionale.set(match.casa, match.trasferta);
      avversariByNazionale.set(match.trasferta, match.casa);
    }
  }

  const nazionaliAmmesse = Array.from(
    new Set(
      (competizionePartite ?? [])
        .flatMap((p) => {
          const match = MAPPA_SEDICESIMI[String(p.partita)];
          return match ? [match.casa, match.trasferta] : [];
        })
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