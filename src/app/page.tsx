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

const COMPETIZIONI_PRIMA_FASE = ["G1AF", "G1GL", "G2AF", "G2GL", "G3AF", "G3GL"];

const COMPETIZIONI_GENERALE = [
  ...COMPETIZIONI_PRIMA_FASE,
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

function nomeCompetizione(giornata: string, blocco: string) {
  const g = String(giornata ?? "").toLowerCase();
  const b = String(blocco ?? "").toLowerCase();

  switch (g) {
    case "g1":
      return `Prima Giornata • ${blocco}`;
    case "g2":
      return `Seconda Giornata • ${blocco}`;
    case "g3":
      return `Terza Giornata • ${blocco}`;
    case "sedicesimi":
      return b === "1-8"
        ? "Sedicesimi • Tabellone 1-8"
        : "Sedicesimi • Tabellone 9-16";
    case "ottavi":
      return b === "1-4"
        ? "Ottavi • Tabellone 1-4"
        : "Ottavi • Tabellone 5-8";
    case "quarti":
      return "Quarti di Finale";
    case "semifinali":
      return "Semifinali";
    case "finale":
      return "Finale";
    default:
      return `${giornata} ${blocco}`;
  }
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

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 md:p-7 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
      {children}
    </div>
  );
}

function PodiumRow({ r }: { r: RigaAggregata }) {
  const medal =
    r.posizione === 1
      ? "🥇"
      : r.posizione === 2
        ? "🥈"
        : r.posizione === 3
          ? "🥉"
          : r.posizione;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <Link
        href={`/partecipanti/${encodeURIComponent(
          String(r.slug ?? "").toLowerCase()
        )}`}
        className="flex min-w-0 items-center gap-3 font-bold text-slate-900 hover:text-blue-600"
      >
        <span className="text-xl">{medal}</span>
        <span className="truncate">{r.partecipante}</span>
      </Link>

      <div className="shrink-0 text-xl font-black tabular-nums text-slate-950">
        {formatPunti(r.punti)}
      </div>
    </div>
  );
}

function RankingRow({ r }: { r: RigaAggregata }) {
  return (
    <div className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-slate-100 px-1 py-3 last:border-b-0">
      <div className="text-sm font-black text-slate-400">{r.posizione}</div>

      <Link
        href={`/partecipanti/${encodeURIComponent(
          String(r.slug ?? "").toLowerCase()
        )}`}
        className="min-w-0 truncate font-bold text-slate-900 hover:text-blue-600"
      >
        {r.partecipante}
      </Link>

      <div className="text-lg font-black tabular-nums text-slate-950">
        {formatPunti(r.punti)}
      </div>
    </div>
  );
}

function LiveRankingCard({
  righe,
  sottotitolo,
}: {
  righe: RigaAggregata[];
  sottotitolo: string;
}) {
  return (
    <Card className="h-full">
      <SectionEyebrow>Turno in svolgimento</SectionEyebrow>

      <div className="mb-5">
        <h2 className="text-2xl font-black tracking-tight text-slate-950">
          Classifica Live
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{sottotitolo}</p>
      </div>

      {righe.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
          Classifica live non ancora disponibile.
        </div>
      ) : (
        <div className="grid gap-3">
          {righe.slice(0, 3).map((r) => (
            <PodiumRow key={r.partecipante_id} r={r} />
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-3 border-t border-slate-100 pt-5">
        <Link
          href="/classifiche/ottavi"
          className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-slate-800"
        >
          Vedi classifica completa
        </Link>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/classifiche/prima-fase"
            className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            <span className="block">Classifica Fase a Gironi →</span>
            <span className="mt-1 block text-xs font-semibold text-slate-400">
              G1AF · G1GL · G2AF · G2GL · G3AF · G3GL
            </span>
          </Link>

          <Link
            href="/classifiche/sedicesimi"
            className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            Sedicesimi →
          </Link>
        </div>
      </div>
    </Card>
  );
}

function GeneralRankingCard({ righe }: { righe: RigaAggregata[] }) {
  return (
    <Card>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionEyebrow>Classifica</SectionEyebrow>
          <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            Classifica Generale
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Somma complessiva Fase a Gironi + Sedicesimi + Ottavi.
          </p>
        </div>

        <Link
          href="/classifiche/generale"
          className="text-sm font-black text-blue-600 hover:text-blue-700"
        >
          Apri completa →
        </Link>
      </div>

      {righe.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
          Classifica non ancora disponibile.
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-[42px_1fr_auto] gap-3 border-b border-slate-200 px-1 pb-2 text-xs font-black uppercase tracking-widest text-slate-400">
            <div>Pos</div>
            <div>Partecipante</div>
            <div>Punti</div>
          </div>

          <div>
            {righe.map((r) => (
              <RankingRow key={r.partecipante_id} r={r} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon,
  external = false,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="group rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
        {icon}
      </div>

      <div className="text-xl font-black text-slate-950">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-500">{description}</div>

      <div className="mt-4 text-sm font-black text-blue-600 group-hover:text-blue-700">
        Apri →
      </div>
    </Link>
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
  }

  const ctaLabel = partecipanteLoggato ? "GIOCA" : "ACCEDI PER GIOCARE";

  const [generale, primaFase, sedicesimi, ottavi] = await Promise.all([
    getClassificaAggregata(COMPETIZIONI_GENERALE),
    getClassificaAggregata(COMPETIZIONI_PRIMA_FASE),
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

  const liveSubtitle = competizioneLive
    ? `Live ${competizioneLive.giornata} — ${partiteGiocateLive}/${partiteTotaliLive} partite concluse, ${partiteMancantiLive} mancanti`
    : "Somma live 8ALTA + 8BASSA";

  return (
    <main className="min-h-screen bg-[#F6F7FB] px-4 py-5 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between gap-4 md:mb-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-fantagoat-2026.png"
              alt="FantaGOAT"
              width={64}
              height={64}
              priority
              className="rounded-2xl"
            />

            <div>
              <h1 className="text-2xl font-black leading-none tracking-tight md:text-4xl">
                FantaGOAT
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Fantacalcio Live 2026
              </p>
            </div>
          </Link>

          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
            {partecipanteLoggato ? (
              <div className="flex items-center gap-4">
                <div className="hidden text-sm font-black text-slate-700 sm:block">
                  👤 {partecipanteLoggato.nome}
                </div>

                <form method="post" action="/api/logout">
                  <button className="text-sm font-black text-blue-600 hover:text-blue-700">
                    Esci
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/login" className="text-sm font-black text-blue-600">
                Accedi
              </Link>
            )}
          </div>
        </header>

        <section className="mb-6 grid gap-5 lg:grid-cols-[1.45fr_1fr] md:mb-8">
          <Link
            href={hrefSchiera}
            className="group relative overflow-hidden rounded-[32px] bg-slate-950 p-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:p-8"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.35),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.22),transparent_34%)]" />

            <div className="relative">
              {prossimaDeadline ? (
                <div className="rounded-[24px] bg-white/10 p-5 ring-1 ring-white/15 md:p-6">
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
                    Prossima deadline
                  </div>

                  <div className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                    {nomeCompetizione(
                      prossimaDeadline.giornata,
                      prossimaDeadline.blocco
                    )}
                  </div>

                  <div className="mt-2 text-base font-bold text-slate-300">
                    {prossimaDeadline.deadline.toLocaleString("it-IT", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "Europe/Rome",
                    })}
                  </div>

                  <div className="mt-6 rounded-2xl bg-white px-4 py-4 text-center text-3xl font-black text-slate-950 md:text-4xl">
                    <CountdownDeadline
                      deadline={prossimaDeadline.deadline.toISOString()}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] bg-white/10 p-5 ring-1 ring-white/15 md:p-6">
                  <div className="text-2xl font-black">
                    Nessuna prossima scadenza trovata
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">
                    Puoi comunque consultare classifiche, formazioni, rose e
                    regolamento.
                  </div>
                </div>
              )}

              <div className="mt-6 rounded-2xl bg-blue-600 px-5 py-4 text-center text-base font-black tracking-wide text-white transition group-hover:bg-blue-500 md:text-lg">
                {ctaLabel}
              </div>
            </div>
          </Link>

          <LiveRankingCard righe={ottavi} sottotitolo={liveSubtitle} />
        </section>

        <section className="mb-6 md:mb-8">
          <GeneralRankingCard righe={generale} />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <QuickLink
            href="/formazioni"
            title="Formazioni"
            description="Consulta le formazioni schierate."
            icon="⚽"
          />

          <QuickLink
            href="/rose"
            title="Rose"
            description="Scopri le rose dei partecipanti."
            icon="👥"
          />

          <QuickLink
            href="/regolamento/Regolamento_Ufficiale_FantaGOAT_2026.pdf"
            title="Regolamento"
            description="Apri il documento ufficiale FantaGOAT 2026."
            icon="📘"
            external
          />
        </section>
      </div>
    </main>
  );
}