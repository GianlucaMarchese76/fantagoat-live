import Link from "next/link";
import { supabase } from "../lib/supabase";
import {
  calcolaGenerale,
  labelCompetizione,
  codiceCompetizione,
  statoCompetizione,
  getClassificaCompetizione,
  creaSlug,
} from "../lib/fantagoat";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function aggiungiPartecipante(formData: FormData) {
  "use server";

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  const slug = creaSlug(nome);

  await supabase.from("partecipanti").insert({
    nome,
    slug,
    attivo: true,
  });

  const { data: partite } = await supabase
    .from("calendario_partite")
    .select("giornata, blocco, kickoff")
    .order("kickoff");

  const now = new Date();

  const prossima = (partite ?? [])
    .map((p) => ({
      giornata: p.giornata,
      blocco: p.blocco,
      deadline: new Date(new Date(p.kickoff).getTime() - 5 * 60 * 1000),
    }))
    .filter((p) => now < p.deadline)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())[0];

  const codice = prossima
    ? codiceCompetizione(prossima.giornata, prossima.blocco)
    : "16ALTA";

  revalidatePath("/");

  redirect(`/crea-rosa/${codice}?partecipante=${slug}`);
}

export default async function Home() {
  const { data: competizioni } = await supabase
    .from("v_competizioni_concluse")
    .select("*")
    .order("giornata")
    .order("blocco");

  const { data: partite } = await supabase
    .from("calendario_partite")
    .select("giornata, blocco, kickoff, fine_partita")
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
    const key = `${p.giornata}-${p.blocco}`;
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

  const competizioniChiuse =
    competizioni?.filter((c) => c.conclusa) ?? [];

  const generale = await calcolaGenerale({
  competizioni: competizioniChiuse,
  getClassifica: (giornata, blocco, definitiva) =>
    getClassificaCompetizione(
      supabase,
      giornata,
      blocco,
      definitiva
    ),
});

const competizioneLive = Array.from(blocchi.values()).find((b) => {
  const c = competizioni?.find(
    (x) => x.giornata === b.giornata && x.blocco === b.blocco
  );

  return (
    c &&
    statoCompetizione(c.conclusa, b.primaPartita, now) === "LIVE"
  );
});

  const classificaLive = competizioneLive
    ? await getClassificaCompetizione(
      supabase,
        competizioneLive.giornata,
        competizioneLive.blocco,
        false
      )
    : [];

  const partiteLiveBlocco = competizioneLive
    ? (partite ?? []).filter(
        (p) =>
          p.giornata === competizioneLive.giornata &&
          p.blocco === competizioneLive.blocco
      )
    : [];

  const partiteGiocateLive = partiteLiveBlocco.filter(
    (p) => p.fine_partita && new Date(p.fine_partita) <= now
  ).length;

  const partiteTotaliLive = partiteLiveBlocco.length;

  const partiteMancantiLive =
    partiteTotaliLive - partiteGiocateLive;

  return (
    <main className="min-h-screen p-4 bg-slate-100">
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

    <div>
      <h1 className="text-3xl md:text-5xl font-black">
        FantaGOAT Live
      </h1>

      <p className="text-slate-600">
        Fantacalcio Live 2026
      </p>
    </div>
  </div>
</header>

<section className="mb-8 bg-white rounded-2xl shadow p-4">
  <h2 className="text-xl font-bold mb-3">
    Aggiungi partecipante
  </h2>

  <form action={aggiungiPartecipante} className="grid gap-3">
    <input
      name="nome"
      placeholder="Nome partecipante"
      className="w-full rounded-xl border border-slate-300 p-3"
      required
    />

    <button
      type="submit"
      className="rounded-xl bg-blue-600 text-white font-bold p-3"
    >
      Aggiungi e crea rosa
    </button>
  </form>
</section>

      <section className="mb-8">
        <h2 className="text-sm font-bold text-slate-500 mb-3">
          CLASSIFICHE
        </h2>

        <div className="grid gap-4">
          <section className="bg-white rounded-2xl shadow p-4">
            <h3 className="text-xl font-bold mb-1">
              Classifica Generale
            </h3>

            <div className="text-sm text-slate-500 mb-3">
              Totale complessivo giornate concluse
            </div>

            <div className="grid gap-2">
              {generale.slice(0, 4).map((r) => (
                <div
                  key={r.partecipante}
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
  href={`/partecipanti/${encodeURIComponent(r.partecipante)}`}
  className="font-semibold hover:text-blue-600"
>
  {r.posizione}. {r.partecipante}
</Link>

                  <div className="text-xl font-bold tabular-nums">
                    {r.punti}
                  </div>
                </div>
              ))}
            </div>

            <a
              href="/classifiche/generale"
              className="block mt-4 text-blue-600 text-sm font-semibold"
            >
              → Apri classifica generale
            </a>
          </section>

          <section className="bg-white rounded-2xl shadow p-4">
            <h3 className="text-xl font-bold mb-2">
              Classifica Live
            </h3>

            {competizioneLive ? (
              <>
                <div className="text-slate-600">
                  {labelCompetizione(
                    competizioneLive.giornata,
                    competizioneLive.blocco
                  )}
                </div>

                <div className="text-xs text-slate-500 mb-3">
                  Aggiornata a {partiteGiocateLive} partite su{" "}
                  {partiteTotaliLive}
                  {partiteMancantiLive > 0
                    ? ` · Mancano ${partiteMancantiLive} partite`
                    : " · Giornata completata"}
                </div>

                <div className="grid gap-2">
                  {classificaLive.slice(0, 4).map((r) => (
                    <Link
                      key={r.partecipante}
                      href={`/formazioni/${r.partecipante}/${competizioneLive.giornata}/${competizioneLive.blocco}`}
                      className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 hover:bg-slate-100 transition"
                    >
                      <div>
                        <div className="font-semibold">
                          {r.posizione}. {r.partecipante}
                        </div>

                        <div className="text-xs text-blue-600">
                          Vedi formazione →
                        </div>
                      </div>

                      <div className="text-xl font-bold tabular-nums">
                        {r.punti}
                      </div>
                    </Link>
                  ))}
                </div>

                <a
                  href={`/classifiche/${competizioneLive.giornata}${competizioneLive.blocco}`}
                  className="block mt-4 text-blue-600 text-sm font-semibold"
                >
                  → Apri classifica live
                </a>
              </>
            ) : (
              <div className="text-slate-600">
                Nessuna giornata live in corso.
              </div>
            )}

            <a
              href="/classifiche"
              className="block mt-4 text-blue-600 text-sm font-semibold"
            >
              → Tutte le classifiche
            </a>
          </section>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-slate-500 mb-3">
          ROSA E FORMAZIONI
        </h2>

        <div className="grid gap-4">
          <a
            href="/inserisci-formazione"
            className="bg-blue-600 text-white rounded-2xl shadow p-5 block"
          >
            <div className="text-2xl font-bold mb-2">
              ⚡ Schiera Formazione
            </div>

            {prossimaDeadline ? (
              <div className="text-blue-100">
                Scadenza:{" "}
                {labelCompetizione(
                  prossimaDeadline.giornata,
                  prossimaDeadline.blocco
                )}{" "}
                ·{" "}
                {prossimaDeadline.deadline.toLocaleString("it-IT", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "Europe/Rome",
                })}
              </div>
            ) : (
              <div className="text-blue-100">
                Il torneo si è concluso.
              </div>
            )}
          </a>

          <a
            href="/formazioni"
            className="bg-white rounded-2xl shadow p-4 block"
          >
            <div className="text-xl font-bold">Formazioni</div>
            <div className="text-slate-600">
              Consulta le formazioni schierate.
            </div>
          </a>

          <a
            href="/rose"
            className="bg-white rounded-2xl shadow p-4 block"
          >
            <div className="text-xl font-bold">Rose</div>
            <div className="text-slate-600">
              Scopri le rose dei partecipanti.
            </div>
          </a>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-bold text-slate-500 mb-3">
          REGOLAMENTO
        </h2>

        <a
          href="/regolamento"
          className="bg-white rounded-2xl shadow p-4 block"
        >
          <div className="text-xl font-bold">
            Regolamento FantaGOAT2026
          </div>

          <div className="text-slate-600">
            Regolamento ufficiale, riferimento Gazzetta ed eccezioni FantaGOAT.
          </div>
        </a>
      </section>
    </main>
  );
}