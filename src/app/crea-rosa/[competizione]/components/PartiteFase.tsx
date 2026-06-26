import Bandiera from "../../../../components/Bandiera";

type PartitaFase = {
  partita: string;
  kickoff: string;
};

function parsePartita(partita: string) {
  const [casa, trasferta] = partita.split(" - ");

  return {
    casa: casa?.trim() ?? "",
    trasferta: trasferta?.trim() ?? "",
  };
}

function RigaPartita({ partita }: { partita: PartitaFase }) {
  const { casa, trasferta } = parsePartita(partita.partita);

  return (
    <div className="rounded-xl bg-[#07101f] px-3 py-2 ring-1 ring-slate-700/70">
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-200">
        <div className="flex items-center gap-2">
          <Bandiera codice={casa} size={22} />
          <span>{casa}</span>
        </div>

        <span className="text-slate-500">-</span>

        <div className="flex items-center gap-2">
          <span>{trasferta}</span>
          <Bandiera codice={trasferta} size={22} />
        </div>
      </div>
    </div>
  );
}

export default function PartiteFase({
  partite,
}: {
  partite: PartitaFase[];
}) {
  const partiteSinistra = partite.slice(0, 4);
  const partiteDestra = partite.slice(4, 8);

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-[#101a2d] p-3">
      <h2 className="mb-3 text-xl font-black text-white">
        Partite fase
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          {partiteSinistra.map((partita, index) => (
            <RigaPartita
              key={`${partita.partita}-${index}`}
              partita={partita}
            />
          ))}
        </div>

        <div className="grid gap-2">
          {partiteDestra.map((partita, index) => (
            <RigaPartita
              key={`${partita.partita}-${index}`}
              partita={partita}
            />
          ))}
        </div>
      </div>
    </section>
  );
}