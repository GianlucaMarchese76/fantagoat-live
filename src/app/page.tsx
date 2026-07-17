import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

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
  "quarti|unico": "QUARTI",
  "semifinale|unico": "SEMIFINALI",
  "semifinali|unico": "SEMIFINALI",
  "terzo_posto|unico": "TERZOPOSTO",
  "finale|unico": "FINALE",
};

const COMPETIZIONI_PRIMA_FASE = [
  "G1AF",
  "G1GL",
  "G2AF",
  "G2GL",
  "G3AF",
  "G3GL",
];

const COMPETIZIONI_MATA_MATA = [
  "16ALTA",
  "16BASSA",
  "8ALTA",
  "8BASSA",
  "QUARTI",
  "SEMIFINALI",
  "TERZOPOSTO",
  "FINALE",
];

const COMPETIZIONI_GENERALE = [
  ...COMPETIZIONI_PRIMA_FASE,
  ...COMPETIZIONI_MATA_MATA,
];

const FASI_FINALI = [
  {
    giornata: "quarti",
    codice: "QUARTI",
    titolo: "Classifiche Quarti",
    label: "Quarti di Finale",
    href: "/classifiche/quarti",
  },
  {
    giornata: "semifinali",
    codice: "SEMIFINALI",
    titolo: "Classifiche Semifinali",
    label: "Semifinali",
    href: "/classifiche/semifinali",
  },
  {
    giornata: "terzo_posto",
    codice: "TERZOPOSTO",
    titolo: "Classifica Finale 3° Posto",
    label: "Finale 3° Posto",
    href: "/classifiche/terzo-posto",
  },
  {
    giornata: "finale",
    codice: "FINALE",
    titolo: "Classifica Finale",
    label: "Finale",
    href: "/classifiche/finale",
  },
] as const;

type CodiceFaseFinale = (typeof FASI_FINALI)[number]["codice"];

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

type VincitoriStorici = Record<string, RigaAggregata | null>;

type FaseFinaleStato = (typeof FASI_FINALI)[number] & {
  primaPartita: Date | null;
  ultimaFine: Date | null;
  iniziata: boolean;
  conclusa: boolean;
};

function normalizzaGiornata(giornata: string | null | undefined) {
  const value = String(giornata ?? "").trim().toLowerCase();

  if (value === "semifinale") return "semifinali";

  if (
    value === "terzoposto" ||
    value === "terzo-posto" ||
    value === "terzo_posto" ||
    value === "finale_3_posto" ||
    value === "finale-3-posto"
  ) {
    return "terzo_posto";
  }

  return value;
}

function chiaveCalendario(giornata: string, blocco: string) {
  return `${normalizzaGiornata(giornata)}|${String(blocco).toLowerCase()}`;
}

function slugPartecipante(nome: string) {
  return String(nome ?? "").toLowerCase().replaceAll(" ", "");
}

function formatPunti(punti: number) {
  return Number.isInteger(punti) ? String(punti) : punti.toFixed(1);
}

function nomeCompetizione(giornata: string, blocco: string) {
  const g = normalizzaGiornata(giornata);
  const b = String(blocco ?? "").toLowerCase();

  switch (g) {
    case "g1":
      return b === "af"
        ? "Giornata 1 · Gironi A-F"
        : "Giornata 1 · Gironi G-L";

    case "g2":
      return b === "af"
        ? "Giornata 2 · Gironi A-F"
        : "Giornata 2 · Gironi G-L";

    case "g3":
      return b === "af"
        ? "Giornata 3 · Gironi A-F"
        : "Giornata 3 · Gironi G-L";

    case "sedicesimi":
      return b === "1-8"
        ? "Sedicesimi · Tabellone 1-8"
        : "Sedicesimi · Tabellone 9-16";

    case "ottavi":
      return b === "1-4"
        ? "Ottavi · Tabellone 1-4"
        : "Ottavi · Tabellone 5-8";

    case "quarti":
      return "Quarti di Finale";

    case "semifinale":
    case "semifinali":
      return "Semifinali";

    case "terzo_posto":
      return "Finale 3° Posto";

    case "finale":
      return "Finale";

    default:
      return `${giornata} ${blocco}`;
  }
}

function getLiveConfig(giornata?: string | null) {
  const g = normalizzaGiornata(giornata);

  if (g === "sedicesimi") {
    return {
      titolo: "Classifica Live Sedicesimi",
      label: "Sedicesimi",
      codici: ["16ALTA", "16BASSA"],
      href: "/classifiche/sedicesimi",
    };
  }

  if (g === "ottavi") {
    return {
      titolo: "Classifica Live Ottavi",
      label: "Ottavi",
      codici: ["8ALTA", "8BASSA"],
      href: "/classifiche/ottavi",
    };
  }

  if (g === "quarti") {
    return {
      titolo: "Classifica Live Quarti",
      label: "Quarti",
      codici: ["QUARTI"],
      href: "/classifiche/quarti",
    };
  }

  if (g === "semifinali") {
    return {
      titolo: "Classifica Live Semifinali",
      label: "Semifinali",
      codici: ["SEMIFINALI"],
      href: "/classifiche/semifinali",
    };
  }

  if (g === "terzo_posto") {
    return {
      titolo: "Classifica Live Finale 3° Posto",
      label: "Finale 3° Posto",
      codici: ["TERZOPOSTO"],
      href: "/classifiche/terzo-posto",
    };
  }

  if (g === "finale") {
    return {
      titolo: "Classifica Live Finale",
      label: "Finale",
      codici: ["FINALE"],
      href: "/classifiche/finale",
    };
  }

  return null;
}

function getPartecipanteFromJoin(r: RigaClassifica) {
  if (Array.isArray(r.partecipanti)) {
    return r.partecipanti[0] ?? null;
  }

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

    const partecipante = getPartecipanteFromJoin(r);
    const precedente = map.get(r.partecipante_id);

    map.set(r.partecipante_id, {
      partecipante_id: r.partecipante_id,
      partecipante: partecipante?.nome ?? "Partecipante",
      slug:
        partecipante?.slug ??
        slugPartecipante(partecipante?.nome ?? ""),
      punti: (precedente?.punti ?? 0) + Number(r.punti ?? 0),
    });
  }

  return Array.from(map.values())
    .sort(
      (a, b) =>
        b.punti - a.punti ||
        a.partecipante.localeCompare(b.partecipante)
    )
    .map((r, index) => ({
      posizione: index + 1,
      ...r,
      punti: Number(r.punti.toFixed(1)),
    }));
}

async function getVincitoreCompetizione(
  codice: string
): Promise<RigaAggregata | null> {
  const classifica = await getClassificaAggregata([codice]);
  return classifica[0] ?? null;
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
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

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
      {children}
    </div>
  );
}

function PodiumRow({
  r,
  dettaglioCompetizione,
}: {
  r: RigaAggregata;
  dettaglioCompetizione?: string;
}) {
  const medal =
    r.posizione === 1
      ? "🥇"
      : r.posizione === 2
        ? "🥈"
        : r.posizione === 3
          ? "🥉"
          : `${r.posizione}.`;

  const href = dettaglioCompetizione
    ? `/formazioni-competizione/${encodeURIComponent(
        dettaglioCompetizione
      )}/dettaglio?partecipante=${encodeURIComponent(r.slug)}`
    : `/partecipanti/${encodeURIComponent(
        String(r.slug ?? "").toLowerCase()
      )}`;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <Link
        href={href}
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
      <div className="text-sm font-black text-slate-400">
        {r.posizione}
      </div>

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

function HistoricalCompetitionLink({
  href,
  label,
  vincitore,
}: {
  href: string;
  label: string;
  vincitore: RigaAggregata | null;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl bg-white px-3 py-3 text-center transition hover:bg-blue-50"
    >
      <span className="block text-xs font-black text-slate-700">
        {label}
      </span>

      {vincitore ? (
        <span className="mt-1.5 block text-[11px] font-semibold leading-4 text-slate-400">
          {vincitore.partecipante}
          <span className="mx-1">·</span>
          {formatPunti(vincitore.punti)}
        </span>
      ) : (
        <span className="mt-1.5 block text-[11px] font-semibold text-slate-300">
          —
        </span>
      )}
    </Link>
  );
}

function HistoricalRankingsBlock({
  vincitoriStorici,
  fasiFinaliArchiviate,
}: {
  vincitoriStorici: VincitoriStorici;
  fasiFinaliArchiviate: readonly CodiceFaseFinale[];
}) {
  return (
    <Card>
      <SectionEyebrow>Archivio classifiche</SectionEyebrow>

      <h2 className="mb-5 text-2xl font-black tracking-tight text-slate-950">
        Classifiche delle fasi concluse
      </h2>

      <div className="grid gap-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-3 text-sm font-black text-slate-800">
            Classifiche Prima Fase
          </div>

          <div className="grid grid-cols-2 gap-2">
            <HistoricalCompetitionLink
              href="/classifiche/G1AF"
              label="G1 · Gironi A-F"
              vincitore={vincitoriStorici.G1AF}
            />

            <HistoricalCompetitionLink
              href="/classifiche/G1GL"
              label="G1 · Gironi G-L"
              vincitore={vincitoriStorici.G1GL}
            />

            <HistoricalCompetitionLink
              href="/classifiche/G2AF"
              label="G2 · Gironi A-F"
              vincitore={vincitoriStorici.G2AF}
            />

            <HistoricalCompetitionLink
              href="/classifiche/G2GL"
              label="G2 · Gironi G-L"
              vincitore={vincitoriStorici.G2GL}
            />

            <HistoricalCompetitionLink
              href="/classifiche/G3AF"
              label="G3 · Gironi A-F"
              vincitore={vincitoriStorici.G3AF}
            />

            <HistoricalCompetitionLink
              href="/classifiche/G3GL"
              label="G3 · Gironi G-L"
              vincitore={vincitoriStorici.G3GL}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-3 text-sm font-black text-slate-800">
            Classifiche Sedicesimi
          </div>

          <div className="grid grid-cols-2 gap-2">
            <HistoricalCompetitionLink
              href="/classifiche/16ALTA"
              label="Tabellone 1-8"
              vincitore={vincitoriStorici["16ALTA"]}
            />

            <HistoricalCompetitionLink
              href="/classifiche/16BASSA"
              label="Tabellone 9-16"
              vincitore={vincitoriStorici["16BASSA"]}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-3 text-sm font-black text-slate-800">
            Classifiche Ottavi
          </div>

          <div className="grid grid-cols-2 gap-2">
            <HistoricalCompetitionLink
              href="/classifiche/8ALTA"
              label="Tabellone 1-4"
              vincitore={vincitoriStorici["8ALTA"]}
            />

            <HistoricalCompetitionLink
              href="/classifiche/8BASSA"
              label="Tabellone 5-8"
              vincitore={vincitoriStorici["8BASSA"]}
            />
          </div>
        </div>

        {FASI_FINALI.filter((fase) =>
          fasiFinaliArchiviate.includes(fase.codice)
        ).map((fase) => (
          <div
            key={fase.codice}
            className="rounded-2xl bg-slate-50 p-4"
          >
            <div className="mb-3 text-sm font-black text-slate-800">
              {fase.titolo}
            </div>

            <HistoricalCompetitionLink
              href={fase.href}
              label={fase.label}
              vincitore={vincitoriStorici[fase.codice]}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function LiveRankingCard({
  righe,
  titolo,
  sottotitolo,
  href,
  dettaglioCompetizione,
}: {
  righe: RigaAggregata[];
  titolo: string;
  sottotitolo: string;
  href: string;
  dettaglioCompetizione?: string;
}) {
  return (
    <Card>
      <SectionEyebrow>Turno in svolgimento</SectionEyebrow>

      <div className="mb-5">
        <h2 className="text-2xl font-black tracking-tight text-slate-950">
          {titolo}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {sottotitolo}
        </p>
      </div>

      {righe.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-500">
          Classifica live non ancora disponibile.
        </div>
      ) : (
        <div className="grid gap-3">
          {righe.slice(0, 3).map((r) => (
            <PodiumRow
              key={r.partecipante_id}
              r={r}
              dettaglioCompetizione={dettaglioCompetizione}
            />
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-slate-100 pt-5">
        <Link
          href={href}
          className="block rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-slate-800"
        >
          Vedi classifica completa
        </Link>
      </div>
    </Card>
  );
}

function RankingCard({
  titolo,
  eyebrow,
  descrizione,
  righe,
  href,
  maxRows,
}: {
  titolo: string;
  eyebrow: string;
  descrizione: string;
  righe: RigaAggregata[];
  href: string;
  maxRows?: number;
}) {
  const rows =
    typeof maxRows === "number" ? righe.slice(0, maxRows) : righe;

  return (
    <Card>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionEyebrow>{eyebrow}</SectionEyebrow>

          <h2 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
            {titolo}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {descrizione}
          </p>
        </div>

        <Link
          href={href}
          className="text-sm font-black text-blue-600 hover:text-blue-700"
        >
          Apri completa →
        </Link>
      </div>

      {rows.length === 0 ? (
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
            {rows.map((r) => (
              <RankingRow
                key={r.partecipante_id}
                r={r}
              />
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

      <div className="text-xl font-black text-slate-950">
        {title}
      </div>

      <div className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </div>

      <div className="mt-4 text-sm font-black text-blue-600 group-hover:text-blue-700">
        Apri →
      </div>
    </Link>
  );
}

export default async function Home() {
  const cookieStore = await cookies();

  const slugLoggato =
    cookieStore.get(COOKIE_PARTECIPANTE)?.value ?? null;

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
    .select(
      "giornata, blocco, partita, numero_tabellone, kickoff, fine_partita, nazionale, avversaria"
    )
    .order("kickoff");

  const now = new Date();

  const blocchi = new Map<
    string,
    {
      giornata: string;
      blocco: string;
      primaPartita: Date;
      ultimaFine: Date | null;
      deadline: Date;
    }
  >();

  for (const p of partite ?? []) {
    if (!p.giornata || !p.blocco || !p.kickoff) {
      continue;
    }

    const key = chiaveCalendario(p.giornata, p.blocco);
    const kickoff = new Date(p.kickoff);
    const finePartita = p.fine_partita
      ? new Date(p.fine_partita)
      : null;
    const esistente = blocchi.get(key);

    if (!esistente) {
      blocchi.set(key, {
        giornata: normalizzaGiornata(p.giornata),
        blocco: p.blocco,
        primaPartita: kickoff,
        ultimaFine: finePartita,
        deadline: new Date(kickoff.getTime() - 5 * 60 * 1000),
      });

      continue;
    }

    if (kickoff < esistente.primaPartita) {
      esistente.primaPartita = kickoff;
      esistente.deadline = new Date(
        kickoff.getTime() - 5 * 60 * 1000
      );
    }

    if (
      finePartita &&
      (!esistente.ultimaFine || finePartita > esistente.ultimaFine)
    ) {
      esistente.ultimaFine = finePartita;
    }
  }

  const prossimaDeadline = Array.from(blocchi.values())
    .filter((b) => now < b.deadline)
    .sort(
      (a, b) =>
        a.deadline.getTime() - b.deadline.getTime()
    )[0];

  const blocchiGiocabili = Array.from(blocchi.values()).filter(
  (b) => {
    const codice =
      CODICE_COMPETIZIONE_BY_CALENDARIO[
        chiaveCalendario(b.giornata, b.blocco)
      ];

    return Boolean(codice);
  }
);

const prossimoBloccoNonIniziato = blocchiGiocabili
  .filter((b) => now < b.primaPartita)
  .sort(
    (a, b) =>
      a.primaPartita.getTime() - b.primaPartita.getTime()
  )[0];

const ultimoBloccoIniziato = blocchiGiocabili
  .filter((b) => now >= b.primaPartita)
  .sort(
    (a, b) =>
      b.primaPartita.getTime() - a.primaPartita.getTime()
  )[0];

const competizioneGiocabile =
  prossimaDeadline ??
  prossimoBloccoNonIniziato ??
  ultimoBloccoIniziato;

const codiceCompetizioneGiocabile = competizioneGiocabile
  ? CODICE_COMPETIZIONE_BY_CALENDARIO[
      chiaveCalendario(
        competizioneGiocabile.giornata,
        competizioneGiocabile.blocco
      )
    ] ?? ""
  : "";

  const titoloCompetizioneGiocabile =
  codiceCompetizioneGiocabile === "16ALTA"
    ? "Sedicesimi 1-8"
    : codiceCompetizioneGiocabile === "16BASSA"
      ? "Sedicesimi 9-16"
      : codiceCompetizioneGiocabile === "8ALTA"
        ? "Ottavi 1-4"
        : codiceCompetizioneGiocabile === "8BASSA"
          ? "Ottavi 5-8"
          : codiceCompetizioneGiocabile === "QUARTI"
            ? "Quarti di finale"
            : codiceCompetizioneGiocabile === "SEMIFINALI"
              ? "Semifinali"
              : codiceCompetizioneGiocabile === "TERZOPOSTO"
                ? "Finale 3° posto"
                : codiceCompetizioneGiocabile === "FINALE"
                  ? "Finale"
                  : "";

  const partiteProssimoTurno = competizioneGiocabile
    ? Array.from(
        new Map(
          (partite ?? [])
            .filter(
              (p) =>
                normalizzaGiornata(p.giornata) ===
                  normalizzaGiornata(
                    competizioneGiocabile.giornata
                  ) &&
                String(p.blocco ?? "").toLowerCase() ===
                  String(
                    competizioneGiocabile.blocco ?? ""
                  ).toLowerCase()
            )
            .map((row) => {
              const casa = String(row.nazionale ?? "").trim();
              const ospite = String(row.avversaria ?? "").trim();

              const chiavePartita =
                row.numero_tabellone != null
                  ? String(row.numero_tabellone)
                  : String(row.partita ?? "").trim() ||
                    [casa, ospite].sort().join("|");

              return [
                chiavePartita,
                {
                  partita: chiavePartita,
                  casa,
                  ospite,
                },
              ] as const;
            })
        ).values()
      ).sort((a, b) =>
        a.partita.localeCompare(b.partita, "it", {
          numeric: true,
        })
      )
    : [];

  const codiceCompetizioneHome =
    codiceCompetizioneGiocabile || null;

  const { data: competizioneAttiva } =
    codiceCompetizioneHome
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

    const rosaCompleta =
      (rosaCompetizione ?? []).length === 16;

    hrefSchiera = rosaCompleta
      ? `/formazioni-competizione/${codiceCompetizioneHome}?partecipante=${encodeURIComponent(
          partecipanteLoggato.slug
        )}`
      : `/crea-rosa/${codiceCompetizioneHome}?partecipante=${encodeURIComponent(
          partecipanteLoggato.slug
        )}`;
  }

  const statiFasiFinali: FaseFinaleStato[] = FASI_FINALI.map(
    (fase) => {
      const bloccoFase = Array.from(blocchi.values()).find(
        (blocco) =>
          normalizzaGiornata(blocco.giornata) === fase.giornata
      );

      const primaPartita = bloccoFase?.primaPartita ?? null;
      const ultimaFine = bloccoFase?.ultimaFine ?? null;

      return {
        ...fase,
        primaPartita,
        ultimaFine,
        iniziata: Boolean(primaPartita && now >= primaPartita),
        conclusa: Boolean(ultimaFine && now >= ultimaFine),
      };
    }
  );

  const ultimaFaseFinaleIniziata = [...statiFasiFinali]
    .filter((fase) => fase.iniziata)
    .sort(
      (a, b) =>
        (b.primaPartita?.getTime() ?? 0) -
        (a.primaPartita?.getTime() ?? 0)
    )[0];

  const faseLiveFinale =
    ultimaFaseFinaleIniziata &&
    !(
      ultimaFaseFinaleIniziata.codice === "FINALE" &&
      ultimaFaseFinaleIniziata.conclusa
    )
      ? ultimaFaseFinaleIniziata
      : null;

  const fasiFinaliArchiviate = statiFasiFinali
    .filter((fase, index) => {
      if (!fase.iniziata) return false;

      if (fase.codice === "FINALE") {
        return fase.conclusa;
      }

      return Boolean(statiFasiFinali[index + 1]?.iniziata);
    })
    .map((fase) => fase.codice);

  const competizioneLiveOrdinaria =
    Array.from(blocchi.values()).find((b) => {
      const giornata = normalizzaGiornata(b.giornata);

      if (
        giornata === "quarti" ||
        giornata === "semifinali" ||
        giornata === "terzo_posto" ||
        giornata === "finale"
      ) {
        return false;
      }

      const configurazione =
        competizioniConcluse?.find(
          (x) =>
            normalizzaGiornata(x.giornata) === giornata &&
            String(x.blocco).toLowerCase() ===
              String(b.blocco).toLowerCase()
        );

      return (
        configurazione &&
        statoCompetizione(
          configurazione.conclusa,
          b.primaPartita,
          now
        ) === "LIVE"
      );
    }) ?? null;

  const competizioneLive = faseLiveFinale
    ? {
        giornata: faseLiveFinale.giornata,
        blocco: "unico",
        primaPartita: faseLiveFinale.primaPartita ?? now,
        ultimaFine: faseLiveFinale.ultimaFine,
        deadline: new Date(
          (faseLiveFinale.primaPartita ?? now).getTime() -
            5 * 60 * 1000
        ),
      }
    : competizioneLiveOrdinaria;

  const liveConfig = getLiveConfig(
    competizioneLive?.giornata
  );

  const partiteLiveFase = competizioneLive
    ? (partite ?? []).filter(
        (p) =>
          String(p.giornata).toLowerCase() ===
          String(
            competizioneLive.giornata
          ).toLowerCase()
      )
    : [];

  const partiteTotaliLive = new Set(
    partiteLiveFase.map((p) => p.partita)
  ).size;

  const partiteGiocateLive = new Set(
    partiteLiveFase
      .filter(
        (p) =>
          p.fine_partita &&
          new Date(p.fine_partita) <= now
      )
      .map((p) => p.partita)
  ).size;

  const partiteMancantiLive = Math.max(
    0,
    partiteTotaliLive - partiteGiocateLive
  );

  const [
    generale,
    mataMata,
    liveRanking,
    vincitoreG1AF,
    vincitoreG1GL,
    vincitoreG2AF,
    vincitoreG2GL,
    vincitoreG3AF,
    vincitoreG3GL,
    vincitore16ALTA,
    vincitore16BASSA,
    vincitore8ALTA,
    vincitore8BASSA,
    vincitoreQuarti,
    vincitoreSemifinali,
    vincitoreTerzoPosto,
    vincitoreFinale,
  ] = await Promise.all([
    getClassificaAggregata(COMPETIZIONI_GENERALE),
    getClassificaAggregata(COMPETIZIONI_MATA_MATA),

    liveConfig
      ? getClassificaAggregata(liveConfig.codici)
      : Promise.resolve([]),

    getVincitoreCompetizione("G1AF"),
    getVincitoreCompetizione("G1GL"),
    getVincitoreCompetizione("G2AF"),
    getVincitoreCompetizione("G2GL"),
    getVincitoreCompetizione("G3AF"),
    getVincitoreCompetizione("G3GL"),
    getVincitoreCompetizione("16ALTA"),
    getVincitoreCompetizione("16BASSA"),
    getVincitoreCompetizione("8ALTA"),
    getVincitoreCompetizione("8BASSA"),
    getVincitoreCompetizione("QUARTI"),
    getVincitoreCompetizione("SEMIFINALI"),
    getVincitoreCompetizione("TERZOPOSTO"),
    getVincitoreCompetizione("FINALE"),
  ]);

  const vincitoriStorici: VincitoriStorici = {
    G1AF: vincitoreG1AF,
    G1GL: vincitoreG1GL,
    G2AF: vincitoreG2AF,
    G2GL: vincitoreG2GL,
    G3AF: vincitoreG3AF,
    G3GL: vincitoreG3GL,
    "16ALTA": vincitore16ALTA,
    "16BASSA": vincitore16BASSA,
    "8ALTA": vincitore8ALTA,
    "8BASSA": vincitore8BASSA,
    QUARTI: vincitoreQuarti,
    SEMIFINALI: vincitoreSemifinali,
    TERZOPOSTO: vincitoreTerzoPosto,
    FINALE: vincitoreFinale,
  };

  const posizioneUtenteGenerale = partecipanteLoggato
    ? generale.find(
        (r) =>
          r.partecipante_id === partecipanteLoggato.id
      )?.posizione
    : null;

  const nomeProssimoTurno =
    titoloCompetizioneGiocabile || "Nessuna scadenza attiva";

  const liveSubtitle = liveConfig
    ? `${partiteGiocateLive}/${partiteTotaliLive} partite concluse, ${partiteMancantiLive} mancanti`
    : "Nessuna competizione live in corso.";

  return (
    <main className="min-h-screen bg-[#F6F7FB] px-4 py-5 text-slate-950 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between gap-4 md:mb-8">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
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
                FantaGOAT Live
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

                <form
                  method="post"
                  action="/api/logout"
                >
                  <button className="text-sm font-black text-blue-600 hover:text-blue-700">
                    Esci
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-black text-blue-600"
              >
                Accedi
              </Link>
            )}
          </div>
        </header>

        <section className="mb-6 rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
          {partecipanteLoggato && (
            <div className="mb-4 text-left text-sm font-black uppercase tracking-[0.12em] text-slate-800">
              {partecipanteLoggato.nome}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Live
              </div>

              <div className="mt-1 text-lg font-black">
                {liveConfig?.label ?? "—"}
              </div>
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Partite
              </div>

              <div className="mt-1 text-lg font-black">
                {liveConfig
                  ? `${partiteGiocateLive}/${partiteTotaliLive}`
                  : "—"}
              </div>
            </div>

            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Generale
              </div>

              <div className="mt-1 text-lg font-black">
                {posizioneUtenteGenerale
                  ? `#${posizioneUtenteGenerale}`
                  : "—"}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-5 lg:grid-cols-[1.25fr_1fr] md:mb-8">
          <Link
            href={hrefSchiera}
            className="group relative overflow-hidden rounded-[32px] bg-blue-600 p-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:p-8"
          >
            <div className="relative">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">
                Prossimo turno
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                {nomeProssimoTurno}
              </h2>

              {partiteProssimoTurno.length > 0 && (
                <div className="mt-6 rounded-2xl bg-white/10 p-4">
                  <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-blue-100">
                    Tabellone
                  </div>

                  <div className="space-y-2">
                    {partiteProssimoTurno.map(
                      (partita) => (
                        <div
                          key={`${partita.partita}-${partita.casa}-${partita.ospite}`}
                          className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"
                        >
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex h-4 w-6 items-center justify-center">
                              <Image
                                src={`/bandiere/${partita.casa}.svg`}
                                alt={partita.casa}
                                width={24}
                                height={16}
                                className="max-h-4 w-auto"
                              />
                            </div>

                            <span className="w-8 text-left font-black tracking-wide">
                              {partita.casa}
                            </span>
                          </div>

                          <div className="text-center text-sm font-bold text-blue-100">
                            vs
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex h-4 w-6 items-center justify-center">
                              <Image
                                src={`/bandiere/${partita.ospite}.svg`}
                                alt={partita.ospite}
                                width={24}
                                height={16}
                                className="max-h-4 w-auto"
                              />
                            </div>

                            <span className="w-8 text-left font-black tracking-wide">
                              {partita.ospite}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {prossimaDeadline ? (
                <div className="mt-6 rounded-[24px] bg-white/10 p-5 ring-1 ring-white/15 md:p-6">
                  <div className="text-sm font-bold text-blue-100">
                    Scadenza formazione
                  </div>

                  <div className="mt-1 text-xl font-black">
                    {prossimaDeadline.deadline.toLocaleString(
                      "it-IT",
                      {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Europe/Rome",
                      }
                    )}
                  </div>

                  <div className="mt-6 rounded-2xl bg-white/10 px-4 py-4 text-center text-3xl font-black tabular-nums md:text-4xl">
                    <CountdownDeadline
                      deadline={prossimaDeadline.deadline.toISOString()}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[24px] bg-white/10 p-5 text-sm font-semibold leading-6 text-blue-50 ring-1 ring-white/15 md:p-6">
                  Puoi consultare classifiche, formazioni, rose e
                  regolamento.
                </div>
              )}

              <div className="mt-6 rounded-2xl bg-white px-5 py-4 text-center text-lg font-black tracking-wide text-blue-700 transition group-hover:bg-blue-50">
                GIOCA
              </div>
            </div>
          </Link>

          {liveConfig ? (
            <LiveRankingCard
              righe={liveRanking}
              titolo={liveConfig.titolo}
              sottotitolo={liveSubtitle}
              href={liveConfig.href}
              dettaglioCompetizione={
                liveConfig.codici[0]
              }
            />
          ) : (
            <Card>
              <SectionEyebrow>
                Turno in svolgimento
              </SectionEyebrow>

              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                Nessuna classifica live
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Quando inizierà il prossimo turno, la classifica live
                sarà visibile qui.
              </p>
            </Card>
          )}
        </section>

        <section className="mb-6 md:mb-8">
          <RankingCard
            titolo="🏆 Mata Mata Cup"
            eyebrow="Competizione"
            descrizione="Classifica della fase a eliminazione diretta."
            righe={mataMata}
            href="/classifiche/mata-mata-cup"
          />
        </section>

        <section className="mb-6 md:mb-8">
          <RankingCard
            titolo="🌍 Classifica Generale"
            eyebrow="Classifica"
            descrizione="Classifica complessiva del Mondiale."
            righe={generale}
            href="/classifiche/generale"
            maxRows={4}
          />
        </section>

        <section className="mb-6 md:mb-8">
          <HistoricalRankingsBlock
            vincitoriStorici={vincitoriStorici}
            fasiFinaliArchiviate={fasiFinaliArchiviate}
          />
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
