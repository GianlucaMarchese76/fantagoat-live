export default async function PartecipantePage({
  params,
}: {
  params: Promise<{ nome: string }>;
}) {
  const { nome } = await params;
  const partecipante = decodeURIComponent(nome);

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a href="/" className="text-blue-600 text-sm">
        ← Home
      </a>

      <h1 className="text-3xl font-bold my-6">
        {partecipante}
      </h1>

      <div className="grid gap-4">
        <a
          href={`/partecipanti/${partecipante}/AF`}
          className="block bg-white rounded-xl p-5 shadow"
        >
          <div className="text-xl font-bold">Rosa A-F</div>
          <div className="text-slate-600">Apri rosa gruppo A-F</div>
        </a>

        <a
          href={`/partecipanti/${partecipante}/GL`}
          className="block bg-white rounded-xl p-5 shadow"
        >
          <div className="text-xl font-bold">Rosa G-L</div>
          <div className="text-slate-600">Apri rosa gruppo G-L</div>
        </a>
      </div>
    </main>
  );
}