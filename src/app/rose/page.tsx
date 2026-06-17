import { supabase } from "../../lib/supabase";

export default async function RosePage() {
  const { data: partecipanti, error } = await supabase
    .from("partecipanti")
    .select("*")
    .order("nome");

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a
        href="/"
        className="text-blue-600 text-sm"
      >
        ← Home
      </a>

      <h1 className="text-4xl font-bold mt-5 mb-6">
        Rose
      </h1>

      {error && (
        <pre className="text-red-600">
          {JSON.stringify(error, null, 2)}
        </pre>
      )}

      <div className="grid gap-3">
        {partecipanti?.map((p) => (
          <a
            key={p.id}
            href={`/partecipanti/${encodeURIComponent(
              p.nome
            )}`}
            className="bg-white rounded-2xl shadow p-4 flex items-center justify-between"
          >
            <div className="text-xl font-semibold">
              {p.nome}
            </div>

            <div className="text-slate-400">
              →
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}