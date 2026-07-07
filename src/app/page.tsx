import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { supabase } from "../lib/supabase";
import { statoCompetizione } from "../lib/fantagoat";
import { COOKIE_PARTECIPANTE } from "../lib/fantagoat/sessione";
import CountdownDeadline from "../components/CountdownDeadline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CODICE_COMPETIZIONE_BY_CALENDARIO: Record<string, string> = {
  "sedicesimi|1-8": "16ALTA",
  "sedicesimi|9-16": "16BASSA",
  "ottavi|1-4": "8ALTA",
  "ottavi|5-8": "8BASSA",
};

const COMPETIZIONI_GENERALE = [
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

const COMPETIZIONI_SEDICESIMI = ["16ALTA", "16BASSA"];
const COMPETIZIONI_OTTAVI = ["8ALTA", "8BASSA"];

type PartecipanteJoin = {
  id: string;
  nome: string;
  slug: string;
};

type RigaClassifica = {
  competizione: string;
  partecipante_id: string;
  punti: number | string | null;
  posizione: number | null;
  partecipanti: PartecipanteJoin | PartecipanteJoin[] | null;
};

type RigaAggregata = {
  posizione: number;
  partecipante_id: string;
  partecipante: string;
  slug: string;
  punti: number;
};

function chiaveCalendario(giornata: string, blocco: string) {
  return `${String(giornata).toLowerCase()}|${String(blocco).toLowerCase()}`;
}

function slugPartecipante(nome: string) {
  return String(nome ?? "").toLowerCase().replaceAll(" ", "");
}

function formatPunti(punti: number) {
  return Number.isInteger(punti) ? String(punti) : punti.toFixed(1);
}

function getPartecipanteFromJoin(r: RigaClassifica) {
  if (Array.isArray(r.partecipanti)) return r.partecipanti[0] ?? null;
  return r.partecipanti ?? null;
}

async function getClassificaAggregata(
  codici: string[]
): Promise<RigaAggregata[]> {
  const { data, error } = await supabase
    .from("classifiche")
    .select(
      `
      competizione,
      partecipante_id,
      punti,
      posizione,
      partecipanti:partecipante_id (
        id,
        nome,
        slug
      )
    `
    )
    .in("competizione", codici);

  if (error) {
    console.error("Errore classifica aggregata:", error);
    return [];
  }

  const map = new Map<
    string,
    {
      partecipante_id: string;
      partecipante: string;
      slug: string;
      punti: number;
    }
  >();

  for (const r of (data ?? []) as RigaClassifica[]) {
    if (!r.partecipante_id) continue;

    const p = getPartecipanteFromJoin(r);
    const old = map.get(r.partecipante_id);

    map.set(r.partecipante_id, {
      partecipante_id: r.partecipante_id,
      partecipante: p?.nome ?? "Partecipante",
      slug: p?.slug ?? slugPartecipante(p?.nome ?? ""),
      punti: (old?.punti ?? 0) + Number(r.punti ?? 0),
    });
  }

  return Array.from(map.values())
    .sort(
      (a, b) =>
        b.punti - a.punti || a.partecipante.localeCompare(b.partecipante)
    )
    .map((r, index) => ({
      posizione: index + 1,
      ...r,
      punti: Number(r.punti.toFixed(1)),
    }));
}

function ClassificaCard({
  titolo,
  sottotitolo,
  righe,
  href,
}: {
  titolo: string;
  sottotitolo: string;
  righe: RigaAggregata[];
  href: string;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow">
      <h3 className="mb-1 text-xl font-bold">{titolo}</h3>
      <div className="mb-3 text-sm text-slate-500">{sottotitolo}</div>

      {righe.length === 0 ? (
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Classifica non ancora disponibile.
        </div>
      ) : (
        <div className="grid gap-2">
          {righe.slice(0, 8).map((r) => (
            <div
              key={r.partecipante_id}
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                r.posizione === 1
                  ? "bg-amber-50"
                  : r.posizione === 2
                    ? "bg-slate-100"
                    : r.posizione === 3
                      ? "bg-orange-50"
                      : "bg-slate-50"
              }`}
            >
              <Link
                href={`/partecipanti/${encodeURIComponent(
  String(r.slug ?? "").toLowerCase()
)}`}
                className="font-semibold hover:text-blue-600"
              >
                {r.posizione}. {r.partecipante}
              </Link>

              <div className="text-xl font-bold tabular-nums">
                {formatPunti(r.punti)}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link
        href={href}
        className="mt-4 block text-sm font-semibold text-blue-600"
      >
        → Apri classifica completa
      </Link>
    </section>
  );
}

export default async function Home() {
  const cookieStore = await cookies();
  const slugLoggato = cookieStore.get(COOKIE_PARTECIPANTE)?.value ?? null;

  const { data: partecipanteLoggato } = slugLoggato
    ? await supabase
        .from("partecipanti")
        .select("id,nome,slug")
        .eq("slug", slugLoggato)
        .maybeSingle()
    : { data: null };

  const { data: competizioniConcluse } = await supabase
    .from("v_competizioni_concluse")
    .select("*")
    .order("giornata")
    .order("blocco");

  const { data: partite } = await supabase
    .from("calendario_partite")
    .select("giornata, blocco, partita, kickoff, fine_partita")
    .order("kickoff");

  const now = new Date();

  const blocchi = new Map<
    string,
    {
      giornata: string;
      blocco: string;
      primaPartita: Date;
      deadline: Date;
    }
  >();

  for (const p of partite ?? []) {
    if (!p.giornata || !p.blocco || !p.kickoff) continue;

    const key = chiaveCalendario(p.giornata, p.blocco);
    const kickoff = new Date(p.kickoff);

    if (!blocchi.has(key) || kickoff < blocchi.get(key)!.primaPartita) {
      blocchi.set(key, {
        giornata: p.giornata,
        blocco: p.blocco,
        primaPartita: kickoff,
        deadline: new Date(kickoff.getTime() - 5 * 60 * 1000),
      });
    }
  }

  const prossimaDeadline = Array.from(blocchi.values())
    .filter((b) => now < b.deadline)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())[0];

  const competizioneGiocabile =
    prossimaDeadline ??
    Array.from(blocchi.values())
      .filter((b) => {
        const codice =
          CODICE_COMPETIZIONE_BY_CALENDARIO[
            chiaveCalendario(b.giornata, b.blocco)
          ];
        return Boolean(codice);
      })
      .sort((a, b) => b.primaPartita.getTime() - a.primaPartita.getTime())[0];

  const codiceCompetizioneHome = competizioneGiocabile
    ? CODICE_COMPETIZIONE_BY_CALENDARIO[
        chiaveCalendario(
          competizioneGiocabile.giornata,
          competizioneGiocabile.blocco
        )
      ]
    : null;

  const { data: competizioneAttiva } = codiceCompetizioneHome
    ? await supabase
        .from("competizioni")
        .select("*")
        .eq("codice", codiceCompetizioneHome)
        .maybeSingle()
    : { data: null };

  let hrefSchiera = "/login";
  let testoSchiera = "Accedi per schierare";

  if (partecipanteLoggato && competizioneAttiva) {
    const { data: rosaCompetizione } = await supabase
      .from("rose_competizione")
      .select("giocatore_id")
      .eq("competizione_id", competizioneAttiva.id)
      .eq("partecipante_id", partecipanteLoggato.id);

    const rosaCompleta = (rosaCompetizione ?? []).length === 16;

    hrefSchiera = rosaCompleta
      ? `/formazioni-competizione/${codiceCompetizioneHome}?partecipante=${encodeURIComponent(
          partecipanteLoggato.slug
        )}`
      : `/crea-rosa/${codiceCompetizioneHome}?partecipante=${encodeURIComponent(
          partecipanteLoggato.slug
        )}`;

    testoSchiera = rosaCompleta
      ? "Vai alla tua formazione"
      : "Crea la tua rosa e schiera la formazione";
  }

  const [generale, sedicesimi, ottavi] = await Promise.all([
    getClassificaAggregata(COMPETIZIONI_GENERALE),
    getClassificaAggregata(COMPETIZIONI_SEDICESIMI),
    getClassificaAggregata(COMPETIZIONI_OTTAVI),
  ]);

  const competizioneLive =
    Array.from(blocchi.values()).find((b) => {
      const c = competizioniConcluse?.find(
        (x) => x.giornata === b.giornata && x.blocco === b.blocco
      );

      return c && statoCompetizione(c.conclusa, b.primaPartita, now) === "LIVE";
    }) ?? null;

  const partiteLiveFase = competizioneLive
    ? (partite ?? []).filter((p) => p.giornata === competizioneLive.giornata)
    : [];

  const partiteTotaliLive =
  competizioneLive?.giornata === "ottavi"
    ? 8
    : new Set(partiteLiveFase.map((p) => p.partita)).size;
    
  const partiteGiocateLive = new Set(
    partiteLiveFase
      .filter((p) => p.fine_partita && new Date(p.fine_partita) <= now)
      .map((p) => p.partita)
  ).size;

  const partiteMancantiLive = Math.max(
    0,
    partiteTotaliLive - partiteGiocateLive
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <Image
            src="/logo-fantagoat-2026.png"
            alt="FantaGOAT"
            width={80}
            height={80}
            priority
            className="rounded-xl"
          />

          <div className="flex-1">
            <h1 className="text-3xl font-black md:text-5xl">
              FantaGOAT Live
            </h1>
            <p className="text-slate-600">Fantacalcio Live 2026</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-3 shadow">
          {partecipanteLoggato ? (
            <div className="flex items-center justify-between gap-3">
              <div className="font-bold">👤 {partecipanteLoggato.nome}</div>

              <form method="post" action="/api/logout">
                <button className="text-sm font-bold text-blue-600">
                  Esci
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="font-bold text-slate-600">👤 Ospite</div>

              <Link href="/login" className="text-sm font-bold text-blue-600">
                Accedi
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="mb-8">
        <Link
          href={hrefSchiera}
          className="block rounded-2xl bg-blue-600 p-5 text-white shadow"
        >
          <div className="mb-2 text-2xl font-bold">⚡ Gioca!</div>

          {prossimaDeadline ? (
            <div className="my-4 rounded-xl border border-blue-300/20 bg-blue-500/20 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-blue-200">
                ⏰ Prossima scadenza
              </div>

              <div className="mt-1 font-bold">
                {prossimaDeadline.giornata} {prossimaDeadline.blocco}
              </div>

              <div className="text-sm text-blue-100">
                {prossimaDeadline.deadline.toLocaleString("it-IT", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Europe/Rome",
                })}
              </div>

              <div className="mt-2 text-lg font-black text-white">
                <CountdownDeadline
                  deadline={prossimaDeadline.deadline.toISOString()}
                />
              </div>
            </div>
          ) : (
            <div className="my-4 rounded-xl border border-blue-300/20 bg-blue-500/20 p-3">
              <div className="font-bold">Nessuna prossima scadenza trovata</div>
              <div className="text-sm text-blue-100">
                Puoi comunque consultare classifiche, formazioni, rose e
                regolamento.
              </div>
            </div>
          )}

          <div className="font-semibold text-blue-100">{testoSchiera}</div>
        </Link>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold text-slate-500">CLASSIFICHE</h2>

        <div className="grid gap-4">
          <ClassificaCard
            titolo="Classifica Generale"
            sottotitolo="Somma complessiva Fase 1 + Sedicesimi + Ottavi"
            righe={generale}
            href="/classifiche/generale"
          />

          <ClassificaCard
            titolo="Classifica Sedicesimi"
            sottotitolo="Somma 16ALTA + 16BASSA"
            righe={sedicesimi}
            href="/classifiche/sedicesimi"
          />

          <ClassificaCard
            titolo="Classifica Live Ottavi"
            sottotitolo={
              competizioneLive
                ? `Live ${competizioneLive.giornata} — ${partiteGiocateLive}/${partiteTotaliLive} partite concluse, ${partiteMancantiLive} mancanti`
                : "Somma live 8ALTA + 8BASSA"
            }
            righe={ottavi}
            href="/classifiche/ottavi"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-slate-500">
          ROSA E FORMAZIONI
        </h2>

        <div className="grid gap-4">
          <Link
            href="/formazioni"
            className="block rounded-2xl bg-white p-4 shadow"
          >
            <div className="text-xl font-bold">Formazioni</div>
            <div className="text-slate-600">
              Consulta le formazioni schierate.
            </div>
          </Link>

          <Link href="/rose" className="block rounded-2xl bg-white p-4 shadow">
            <div className="text-xl font-bold">Rose</div>
            <div className="text-slate-600">
              Scopri le rose dei partecipanti.
            </div>
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-slate-500">
          REGOLAMENTO UFFICIALE
        </h2>

        <Link
          href="/regolamento/Regolamento_Ufficiale_FantaGOAT_2026.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl bg-white p-5 shadow transition hover:shadow-lg"
        >
          <div className="mb-2 text-2xl font-bold">📘 Regolamento</div>

          <div className="mb-4 text-slate-600">
            Documento ufficiale della Fase a Eliminazione Diretta contenente
            tutte le regole relative alla costruzione delle rose, alle
            formazioni, al sistema di punteggio e allo svolgimento della
            competizione.
          </div>

          <div className="flex items-center justify-between">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
              Versione 2.0
            </span>

            <span className="text-sm font-semibold text-blue-600">
              Apri PDF →
            </span>
          </div>
        </Link>
      </section>
    </main>
  );
}