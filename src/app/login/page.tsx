import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    errore?: string;
    creato?: string;
    redirect?: string;
  }>;
}) {
  const params = await searchParams;

  const { data: partecipanti } = await supabase
    .from("partecipanti")
    .select("nome,slug")
    .order("nome");

  return (
    <main className="min-h-screen bg-[#08111d] p-4 text-white">
      <section className="mx-auto max-w-md rounded-3xl border border-slate-700 bg-[#101a2d] p-5 shadow-xl">
        <div className="text-center">
          <img
            src="/icon-512.png"
            alt="FantaGOAT"
            className="mx-auto h-40 w-40 rounded-3xl"
          />

          <h1 className="mt-3 text-3xl font-black">FantaGOAT 2026</h1>

          <p className="mt-1 text-sm text-slate-400">
            Accedi o crea il tuo partecipante
          </p>
        </div>

        <form method="post" action="/api/login" className="mt-6 grid gap-3">
          <input
            type="hidden"
            name="redirect"
            value={params.redirect ?? "/"}
          />

          <h2 className="text-lg font-black">Accedi</h2>

          <select
            name="slug"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
          >
            <option value="">Seleziona partecipante</option>

            {(partecipanti ?? []).map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.nome}
              </option>
            ))}
          </select>

          <input
            name="codice"
            type="password"
            placeholder="Codice personale"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
          />

          <button className="rounded-2xl bg-emerald-600 py-3 font-black">
            Entra
          </button>
        </form>

        <div className="my-6 border-t border-slate-700" />

        <form method="post" action="/api/iscriviti" className="grid gap-3">
          <h2 className="text-lg font-black">Nuovo partecipante</h2>

          <input
            name="nome"
            placeholder="Nickname"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
          />

          <input
            name="codice"
            type="password"
            placeholder="Scegli codice personale"
            required
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white"
          />

          <button className="rounded-2xl bg-slate-700 py-3 font-black">
            Crea partecipante
          </button>
        </form>

        {params.errore && (
          <div className="mt-4 rounded-xl bg-red-950 p-3 text-sm font-bold text-red-200">
            Operazione non riuscita. Controlla i dati inseriti.
          </div>
        )}

        {params.creato && (
          <div className="mt-4 rounded-xl bg-emerald-950 p-3 text-sm font-bold text-emerald-200">
            Partecipante creato correttamente. Ora puoi accedere.
          </div>
        )}

        <a
          href="/"
          className="mt-5 block text-center text-sm font-bold text-slate-300 underline"
        >
          Continua come ospite
        </a>
      </section>
    </main>
  );
}