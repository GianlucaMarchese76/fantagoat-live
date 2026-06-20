export default function InserisciFormazioneIndex() {
  const partecipanti = [
    "CeccoliSimone",
    "Greppi",
    "Marchese",
    "Mazzullo",
  ];

  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <h1 className="text-4xl font-bold mb-2">
        📝 Inserisci Formazione
      </h1>

      <p className="text-slate-600 mb-6">
        Seleziona il partecipante.
      </p>

      <div className="grid gap-3">
        {partecipanti.map((p) => (
          <a
            key={p}
            href={`/inserisci-formazione/${p}/G3/AF`}
            className="bg-white rounded-2xl shadow p-4 block"
          >
            <div className="text-xl font-bold">
              {p}
            </div>

            <div className="text-slate-600">
              G3 · Blocco AF
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}