"use client";

import { useMemo, useState } from "react";

type Giocatore = {
  partecipante: string;
  giocatore_id: string;
  giocatore: string;
  ruolo: string;
  nazionale: string;
  blocco: string;
  quotazione_g1: number | null;
  quotazione_g2: number | null;
  quotazione_g3: number | null;
};

type FormazioneSalvata = {
  giocatore_id: string;
  tipo: string;
  ordine: number;
  is_capitano: boolean;
  is_vice: boolean;
};

type MetaSalvata = {
  modulo_dichiarato: string;
  bonus_malus_modulo: number;
  created_at: string;
} | null;

type Calendario = {
  nazionale: string;
  nome_avversaria: string;
  kickoff: string;
};

const MODULI: Record<
  string,
  {
    label: string;
    bonus: number;
    ruoli: string[];
  }
> = {
  M_343: {
    label: "3-4-3",
    bonus: -1,
    ruoli: ["P", "D", "D", "D", "C", "C", "C", "C", "A", "A", "A"],
  },
  M_352: {
    label: "3-5-2",
    bonus: 2,
    ruoli: ["P", "D", "D", "D", "C", "C", "C", "C", "C", "A", "A"],
  },
  M_433: {
    label: "4-3-3",
    bonus: 1,
    ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "A", "A", "A"],
  },
  M_442: {
    label: "4-4-2",
    bonus: 0,
    ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "C", "A", "A"],
  },
  M_451: {
    label: "4-5-1",
    bonus: 1,
    ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "C", "C", "A"],
  },
  M_532: {
    label: "5-3-2",
    bonus: 2,
    ruoli: ["P", "D", "D", "D", "D", "D", "C", "C", "C", "A", "A"],
  },
  M_541: {
    label: "5-4-1",
    bonus: 3,
    ruoli: ["P", "D", "D", "D", "D", "D", "C", "C", "C", "C", "A"],
  },
};

const RUOLI_PANCHINA = [
  "P",
  "D",
  "D",
  "D",
  "D",
  "D",
  "C",
  "C",
  "C",
  "C",
  "C",
  "A",
  "A",
  "A",
  "A",
];

export default function FormazioneClient({
  partecipante,
  giornata,
  blocco,
  rosa,
  calendario,
  formazioneEsistente,
  metaEsistente,
}: {
  partecipante: string;
  giornata: string;
  blocco: string;
  rosa: Giocatore[];
  calendario: Calendario[];
  formazioneEsistente: FormazioneSalvata[];
  metaEsistente: MetaSalvata;
}) {
  const titolariIniziali = Array(11).fill("");
const panchinaIniziale = Array(15).fill("");

for (const r of formazioneEsistente) {
  if (r.tipo === "Titolare") {
    titolariIniziali[r.ordine - 1] = r.giocatore_id;
  }

  if (r.tipo === "Panchina") {
    panchinaIniziale[r.ordine - 1] = r.giocatore_id;
  }
}

const capitanoIniziale =
  formazioneEsistente.find((r) => r.is_capitano)?.giocatore_id ?? "";

const viceIniziale =
  formazioneEsistente.find((r) => r.is_vice)?.giocatore_id ?? "";

const [modulo, setModulo] = useState(
  metaEsistente?.modulo_dichiarato ?? "M_352"
);

const [titolari, setTitolari] = useState<string[]>(titolariIniziali);

const [panchina, setPanchina] = useState<string[]>(panchinaIniziale);

const [capitano, setCapitano] = useState(capitanoIniziale);

const [vice, setVice] = useState(viceIniziale);

  const ruoliTitolari = MODULI[modulo].ruoli;

  const avversari = useMemo(() => {
    const m = new Map<string, Calendario>();
    for (const c of calendario) {
      m.set(c.nazionale, c);
    }
    return m;
  }, [calendario]);

  const selezionati = useMemo(
  () => [...titolari, ...panchina].filter(Boolean),
  [titolari, panchina]
);

  function resetModulo(nuovoModulo: string) {
  const nuoviRuoli = MODULI[nuovoModulo].ruoli;

  const nuoviTitolari = titolari.map((giocatoreId, index) => {
    const vecchioRuolo = ruoliTitolari[index];
    const nuovoRuolo = nuoviRuoli[index];

    if (vecchioRuolo !== nuovoRuolo) {
      return "";
    }

    return giocatoreId;
  });

  setModulo(nuovoModulo);
  setTitolari(nuoviTitolari);

  if (capitano && !nuoviTitolari.includes(capitano)) {
    setCapitano("");
  }

  if (vice && !nuoviTitolari.includes(vice)) {
    setVice("");
  }
}

  function opzioniDisponibili(
    ruolo: string,
    valoreCorrente: string
  ) {
    return rosa
      .filter((g) => g.ruolo === ruolo)
      .filter(
        (g) =>
          g.giocatore_id === valoreCorrente ||
          !selezionati.includes(g.giocatore_id)
      );
  }
function cambiaPanchinaro(index: number, nuovoId: string) {
  if (nuovoId && selezionati.includes(nuovoId)) {
    return;
  }

  const copia = [...panchina];
  copia[index] = nuovoId;
  setPanchina(copia);
}

  const titolariScelti = rosa.filter((g) =>
    titolari.includes(g.giocatore_id)
  );

  return (
    <form method="post" action="/inserisci-formazione" className="space-y-6">
      <input type="hidden" name="partecipante" value={partecipante} />
      <input type="hidden" name="giornata" value={giornata} />
      <input type="hidden" name="blocco" value={blocco} />
      <input type="hidden" name="modulo" value={modulo} />
      <input
        type="hidden"
        name="bonus_malus_modulo"
        value={MODULI[modulo].bonus}
      />

      <section className="bg-white rounded-2xl shadow p-4">
        <label className="block text-sm font-semibold mb-2">
          Modulo
        </label>

        <select
          value={modulo}
          onChange={(e) => resetModulo(e.target.value)}
          className="w-full rounded-xl border p-3"
        >
          {Object.entries(MODULI).map(([key, value]) => (
            <option key={key} value={key}>
  {value.label}
</option>
          ))}
        </select>
      </section>

      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-2xl font-bold mb-4">Titolari</h2>

        <div className="grid gap-3">
          {ruoliTitolari.map((ruolo, index) => (
            <div key={index} className="grid gap-1">
              <label className="font-semibold">
                T{index + 1} · {ruolo}
              </label>

              <input
                type="hidden"
                name={`ruolo_titolare_${index + 1}`}
                value={ruolo}
              />

              <select
                name={`titolare_${index + 1}`}
                value={titolari[index]}
                onChange={(e) => {
                  const copia = [...titolari];
                  copia[index] = e.target.value;
                  setTitolari(copia);

                  if (capitano && !copia.includes(capitano)) {
                    setCapitano("");
                  }

                  if (vice && !copia.includes(vice)) {
                    setVice("");
                  }
                }}
                className="w-full rounded-xl border p-3"
                required
              >
                <option value="">Seleziona giocatore</option>

                {opzioniDisponibili(ruolo, titolari[index]).map((g) => {
                  const partita = avversari.get(g.nazionale);

                  return (
                    <option key={g.giocatore_id} value={g.giocatore_id}>
                      {g.giocatore} · {g.nazionale}
                      {partita?.nome_avversaria
                        ? ` vs ${partita.nome_avversaria}`
                        : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-2xl font-bold">
  Panchina (ordine sostituzioni)
</h2>

<p className="text-sm text-slate-500 mt-1 mb-4">
  L'ordine della panchina determina la priorità delle sostituzioni,
  purché sia possibile schierare un modulo consentito.
</p>

        <div className="grid gap-3">
          {Array.from({ length: 15 }, (_, index) => (
            <div key={index} className="grid gap-1">
              <label className="font-semibold">
  P{index + 1}{index < 3 ? " · Portiere" : ""}
</label>

              <input
  type="hidden"
  name={`ruolo_panchina_${index + 1}`}
  value={
    rosa.find((g) => g.giocatore_id === panchina[index])?.ruolo ?? ""
  }
/>

              <select
                name={`panchina_${index + 1}`}
                value={panchina[index]}
                onChange={(e) => cambiaPanchinaro(index, e.target.value)}
                className="w-full rounded-xl border p-3"
                required
              >
                <option value="">Seleziona giocatore</option>

                {rosa
  .filter((g) => (index < 3 ? g.ruolo === "P" : true))
  .filter(
    (g) =>
      g.giocatore_id === panchina[index] ||
      !selezionati.includes(g.giocatore_id)
  )
  .map((g) => {
                  const partita = avversari.get(g.nazionale);

                  return (
                    <option key={g.giocatore_id} value={g.giocatore_id}>
                      {g.giocatore} · {g.nazionale}
                      {partita?.nome_avversaria
                        ? ` vs ${partita.nome_avversaria}`
                        : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-2xl font-bold mb-4">Capitano e vice</h2>

        <div className="grid gap-3">
          <div>
            <label className="font-semibold">Capitano</label>
            <select
              name="capitano"
              value={capitano}
              onChange={(e) => setCapitano(e.target.value)}
              className="w-full rounded-xl border p-3"
              required
            >
              <option value="">Seleziona capitano</option>
              {titolariScelti
                .filter((g) => g.giocatore_id !== vice)
                .map((g) => (
                  <option key={g.giocatore_id} value={g.giocatore_id}>
                    {g.giocatore}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="font-semibold">Vicecapitano</label>
            <select
              name="vice"
              value={vice}
              onChange={(e) => setVice(e.target.value)}
              className="w-full rounded-xl border p-3"
              required
            >
              <option value="">Seleziona vice</option>
              {titolariScelti
                .filter((g) => g.giocatore_id !== capitano)
                .map((g) => (
                  <option key={g.giocatore_id} value={g.giocatore_id}>
                    {g.giocatore}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </section>

{new Set([...titolari, ...panchina].filter(Boolean)).size !==
  [...titolari, ...panchina].filter(Boolean).length && (
  <div className="rounded-xl bg-red-100 text-red-700 p-4 font-semibold">
    Ci sono giocatori duplicati nella formazione.
  </div>
)}

      <button
        type="submit"
        className="w-full rounded-2xl bg-blue-600 text-white font-bold py-4 text-lg"
      >
        Salva formazione
      </button>
    </form>
  );
}