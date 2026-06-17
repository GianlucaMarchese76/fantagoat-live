export default function ClassifichePage() {
  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a href="/" className="text-blue-600 text-sm">
        ← Home
      </a>

      <h1 className="text-4xl font-bold mt-5 mb-6">
        Classifiche
      </h1>

      <div className="grid gap-3">
        <a
          href="/classifiche/generale"
          className="bg-white rounded-2xl shadow p-4 flex items-center justify-between"
        >
          <div className="text-xl font-semibold">Generale</div>
          <div className="text-slate-400">→</div>
        </a>

        {["G1AF", "G1GL", "G2AF", "G2GL", "G3AF", "G3GL"].map((c) => (
          <a
            key={c}
            href={`/classifiche/${c}`}
            className="bg-white rounded-2xl shadow p-4 flex items-center justify-between"
          >
            <div className="text-xl font-semibold">{c}</div>
            <div className="text-slate-400">→</div>
          </a>
        ))}
      </div>
    </main>
  );
}