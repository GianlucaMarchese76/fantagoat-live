import { supabase } from "../../../../lib/supabase";

const ordineRuoli = ["P", "D", "C", "A"];

const ruoloLabel: Record<string, string> = {
  P: "PORTIERI",
  D: "DIFENSORI",
  C: "CENTROCAMPISTI",
  A: "ATTACCANTI",
};

const ruoloBg: Record<string, string> = {
  P: "bg-sky-50 border-sky-200",
  D: "bg-blue-50 border-blue-200",
  C: "bg-emerald-50 border-emerald-200",
  A: "bg-orange-50 border-orange-200",
};

function prezzo(g: any) {
  return Number(g.prezzo_acquisto ?? 0);
}

function formatNome(nome: string) {
  return nome
    .toLowerCase()
    .split(" ")
    .map((parte) => {
      if (parte.includes(".")) return parte.toUpperCase();
      return parte.charAt(0).toUpperCase() + parte.slice(1);
    })
    .join(" ");
}

export default async function RosaBloccoPage({
  params,
}: {
  params: Promise<{ nome: string; blocco: string }>;
}) {
  const { nome, blocco } = await params;

  const partecipante = decodeURIComponent(nome);
  const bloccoNorm = blocco.toUpperCase();
  const bloccoLabel = bloccoNorm === "AF" ? "A-F" : "G-L";

  const budget = 520;

  const { data, error } = await supabase
    .from("v_rose")
    .select("*")
    .eq("partecipante", partecipante)
    .eq("blocco", bloccoNorm);

  const giocatori = data ?? [];
  const totale = giocatori.reduce((sum, g) => sum + prezzo(g), 0);
  const residui = budget - totale;

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a
        href={`/partecipanti/${partecipante}`}
        className="text-blue-600 text-sm"
      >
        ← Indietro
      </a>

      <header className="mt-5 mb-4">
        <h1 className="text-5xl md:text-7xl font-bold leading-none tracking-tight break-words">
  {partecipante}
</h1>

        <div className="text-xl text-slate-600 mt-3">
          Rosa {bloccoLabel}
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm px-4 py-3 mb-6">
        <div className="flex items-baseline justify-between">
          <div className="text-sm text-slate-500">
            Crediti
          </div>

          <div className="text-xl font-bold tabular-nums">
            {totale} / {budget}
          </div>
        </div>

        <div className="text-sm text-slate-500 text-right mt-1">
          Residui: {residui}
        </div>
      </div>

      {error && (
        <pre className="text-red-600">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <div className="grid gap-6">
        {ordineRuoli.map((ruolo) => {
          const gruppo = giocatori
            .filter((g) => g.ruolo === ruolo)
            .sort((a, b) => {
              if (prezzo(a) !== prezzo(b)) return prezzo(b) - prezzo(a);
              return b.giocatore.localeCompare(a.giocatore);
            });

          if (gruppo.length === 0) return null;

          return (
            <section
              key={ruolo}
              className={`rounded-2xl border ${ruoloBg[ruolo]} overflow-hidden shadow-sm`}
            >
              <div className="px-4 py-3 font-bold tracking-wide">
                {ruoloLabel[ruolo]}
              </div>

              <div className="grid gap-2 p-3 bg-white/60">
                {gruppo.map((g) => (
                  <div
                    key={`${g.giocatore}-${g.nazionale}`}
                    className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">
                        {formatNome(g.giocatore)}{" "}
                      </span>

                      <span className="text-sm font-bold text-slate-500">
                        - {g.nazionale}
                      </span>
                    </div>

                    <div className="text-2xl font-bold tabular-nums">
                      {g.prezzo_acquisto}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}