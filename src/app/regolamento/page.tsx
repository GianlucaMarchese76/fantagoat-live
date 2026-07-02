export default function RegolamentoPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <a href="/" className="text-blue-600 text-sm">
        ← Home
      </a>

      <h1 className="text-4xl font-bold mt-5">
        Regolamento Ufficiale FantaGOAT 2026
      </h1>

      <p className="text-slate-600 mt-2">
        Versione 2.0 – Fase a Eliminazione Diretta
      </p>

      <a
        href="/Regolamento_Ufficiale_FantaGOAT_2026_v2.0.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-5 mb-6 rounded-xl bg-blue-600 px-5 py-3 text-white font-semibold"
      >
        📄 Scarica il PDF ufficiale
      </a>

      <details open className="mb-4 rounded-xl bg-white shadow">
        <summary className="cursor-pointer p-4 text-xl font-bold">
          Premessa
        </summary>

        <div className="border-t p-4">
          ...
        </div>
      </details>

      <details className="mb-4 rounded-xl bg-white shadow">
        <summary className="cursor-pointer p-4 text-xl font-bold">
          Art. 1 — Finalità della competizione
        </summary>

        <div className="border-t p-4">
          ...
        </div>
      </details>

      <details className="mb-4 rounded-xl bg-white shadow">
        <summary className="cursor-pointer p-4 text-xl font-bold">
          Art. 2 — Struttura della competizione
        </summary>

        <div className="border-t p-4">
          ...
        </div>
      </details>
    </main>
  );
}