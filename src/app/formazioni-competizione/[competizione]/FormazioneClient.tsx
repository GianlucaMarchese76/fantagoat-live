"use client";

import { useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  BonusModuloEliminazione,
  calcolaBonusModulo,
} from "../../../lib/fantagoat";

type GiocatoreRosa = {
  id: string;
  nome: string;
  ruolo: string;
  nazionale: string;
  avversaria: string | null;
  costo: number;
};

type Props = {
  competizione: any;
  partecipante: any;
  giocatoriRosa: GiocatoreRosa[];
  titolariIniziali: string[];
  panchinaIniziale: string[];
  capitanoIniziale: string | null;
  viceIniziale: string | null;
  moduloIniziale: string;
};

const MODULI: Record<string, { label: string; ruoli: string[] }> = {
  M_343: { label: "3-4-3", ruoli: ["P", "D", "D", "D", "C", "C", "C", "C", "A", "A", "A"] },
  M_352: { label: "3-5-2", ruoli: ["P", "D", "D", "D", "C", "C", "C", "C", "C", "A", "A"] },
  M_433: { label: "4-3-3", ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "A", "A", "A"] },
  M_442: { label: "4-4-2", ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "C", "A", "A"] },
  M_451: { label: "4-5-1", ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "C", "C", "A"] },
  M_532: { label: "5-3-2", ruoli: ["P", "D", "D", "D", "D", "D", "C", "C", "C", "A", "A"] },
  M_541: { label: "5-4-1", ruoli: ["P", "D", "D", "D", "D", "D", "C", "C", "C", "C", "A"] },
};

function normalizzaModulo(modulo: string | null | undefined) {
  if (!modulo) return "M_352";
  if (MODULI[modulo]) return modulo;

  const trovato = Object.entries(MODULI).find(
    ([, value]) => value.label === modulo
  );

  return trovato?.[0] ?? "M_352";
}

function ordinaRosa(a: GiocatoreRosa, b: GiocatoreRosa) {
  const ordine: Record<string, number> = { P: 1, D: 2, C: 3, A: 4 };

  if (ordine[a.ruolo] !== ordine[b.ruolo]) {
    return ordine[a.ruolo] - ordine[b.ruolo];
  }

  return b.costo - a.costo;
}

function siglaNazionale(nazionale: string) {
  return String(nazionale ?? "").split(" ")[0];
}

function labelAvversaria(g: GiocatoreRosa) {
  const nazionale = siglaNazionale(g.nazionale);
  const avversaria = g.avversaria ? siglaNazionale(g.avversaria) : null;

  return avversaria ? `${nazionale} vs ${avversaria}` : nazionale;
}

function bandieraNazionale(nazionale: string) {
  return `/bandiere/${siglaNazionale(nazionale)}.svg`;
}

function labelGiocatore(g: GiocatoreRosa) {
  return `${g.nome} · ${labelAvversaria(g)} · Q${g.costo}`;
}

function labelGiocatoreConRuolo(g: GiocatoreRosa) {
  return `[${g.ruolo}] ${labelGiocatore(g)}`;
}

export default function FormazioneClient({
  competizione,
  partecipante,
  giocatoriRosa,
  titolariIniziali,
  panchinaIniziale,
  capitanoIniziale,
  viceIniziale,
  moduloIniziale,
}: Props) {
  const moduloKeyIniziale = normalizzaModulo(moduloIniziale);

  const [modulo, setModulo] = useState(moduloKeyIniziale);
  const [titolari, setTitolari] = useState<string[]>(
    [...(titolariIniziali ?? []), ...Array(11).fill("")].slice(0, 11)
  );
  const [panchina, setPanchina] = useState<string[]>(
    [...(panchinaIniziale ?? []), ...Array(5).fill("")].slice(0, 5)
  );
  const [capitano, setCapitano] = useState(capitanoIniziale ?? "");
  const [vice, setVice] = useState(viceIniziale ?? "");
  const [salvataggio, setSalvataggio] = useState(false);
  const [messaggio, setMessaggio] = useState("");

  const ruoliTitolari = MODULI[modulo].ruoli;

  const rosaOrdinata = useMemo(
    () => [...(giocatoriRosa ?? [])].sort(ordinaRosa),
    [giocatoriRosa]
  );

  const selezionati = useMemo(
    () => [...titolari, ...panchina].filter(Boolean),
    [titolari, panchina]
  );

  const titolariScelti = titolari
    .map((id) => rosaOrdinata.find((g) => g.id === id))
    .filter(Boolean) as GiocatoreRosa[];

  const panchinaScelta = panchina
    .map((id) => rosaOrdinata.find((g) => g.id === id))
    .filter(Boolean) as GiocatoreRosa[];

  const formazioneCompleta =
    titolari.filter(Boolean).length === 11 &&
    panchina.filter(Boolean).length === 5 &&
    !!capitano &&
    !!vice &&
    new Set([...titolari, ...panchina].filter(Boolean)).size === 16;

  function resetModulo(nuovoModulo: string) {
    const nuoviRuoli = MODULI[nuovoModulo].ruoli;

    const nuoviTitolari = titolari.map((giocatoreId, index) => {
      if (ruoliTitolari[index] !== nuoviRuoli[index]) return "";
      return giocatoreId;
    });

    setModulo(nuovoModulo);
    setTitolari(nuoviTitolari);

    if (capitano && !nuoviTitolari.includes(capitano)) setCapitano("");
    if (vice && !nuoviTitolari.includes(vice)) setVice("");
  }

  function opzioniDisponibili(ruolo: string, valoreCorrente: string) {
    return rosaOrdinata
      .filter((g) => g.ruolo === ruolo)
      .filter(
        (g) =>
          g.id === valoreCorrente ||
          panchina.includes(g.id) ||
          !selezionati.includes(g.id)
      );
  }

  function opzioniPanchina(valoreCorrente: string) {
    return rosaOrdinata.filter(
      (g) => g.id === valoreCorrente || !selezionati.includes(g.id)
    );
  }

  function cambiaTitolare(index: number, nuovoId: string) {
    const nuoviTitolari = [...titolari];
    const nuovaPanchina = [...panchina];

    if (nuovoId) {
      const indexPanchina = nuovaPanchina.findIndex((id) => id === nuovoId);

      if (indexPanchina !== -1) {
        nuovaPanchina[indexPanchina] = "";
      }
    }

    nuoviTitolari[index] = nuovoId;

    setTitolari(nuoviTitolari);
    setPanchina(nuovaPanchina);

    if (capitano && !nuoviTitolari.includes(capitano)) setCapitano("");
    if (vice && !nuoviTitolari.includes(vice)) setVice("");
  }

  function cambiaPanchinaro(index: number, nuovoId: string) {
    const copia = [...panchina];
    copia[index] = nuovoId;
    setPanchina(copia);
  }

  function ripristinaFormazioneSalvata() {
    setModulo(moduloKeyIniziale);
    setTitolari([...(titolariIniziali ?? []), ...Array(11).fill("")].slice(0, 11));
    setPanchina([...(panchinaIniziale ?? []), ...Array(5).fill("")].slice(0, 5));
    setCapitano(capitanoIniziale ?? "");
    setVice(viceIniziale ?? "");
    setMessaggio("");
  }

  async function handleSalvaFormazione() {
    if (titolari.filter(Boolean).length !== 11) {
      setMessaggio("Formazione non valida: devi selezionare 11 titolari.");
      return;
    }

    if (panchina.filter(Boolean).length !== 5) {
      setMessaggio("Formazione non valida: devi selezionare 5 panchinari.");
      return;
    }

    if (!capitano) {
      setMessaggio("Formazione non valida: devi selezionare il capitano.");
      return;
    }

    if (!vice) {
      setMessaggio("Formazione non valida: devi selezionare il vicecapitano.");
      return;
    }

    if (new Set([...titolari, ...panchina].filter(Boolean)).size !== 16) {
      setMessaggio("Formazione non valida: ci sono giocatori duplicati.");
      return;
    }

    try {
      setSalvataggio(true);
      setMessaggio("");

      const bonusModulo = calcolaBonusModulo(
        MODULI[modulo].label,
        BonusModuloEliminazione
      );

      const righeTitolari = titolari.map((id, index) => ({
        competizione_id: competizione.id,
        partecipante_id: partecipante.id,
        giocatore_id: id,
        tipo: "titolare",
        ordine: index + 1,
        is_capitano: capitano === id,
        is_vice: vice === id,
        modulo: MODULI[modulo].label,
        bonus_malus_modulo: bonusModulo,
      }));

      const righePanchina = panchina.map((id, index) => ({
        competizione_id: competizione.id,
        partecipante_id: partecipante.id,
        giocatore_id: id,
        tipo: "panchina",
        ordine: index + 1,
        is_capitano: false,
        is_vice: false,
        modulo: MODULI[modulo].label,
        bonus_malus_modulo: bonusModulo,
      }));

      const { error: deleteError } = await supabase
        .from("formazioni_competizione")
        .delete()
        .eq("competizione_id", competizione.id)
        .eq("partecipante_id", partecipante.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("formazioni_competizione")
        .insert([...righeTitolari, ...righePanchina]);

      if (insertError) throw insertError;

      setMessaggio("Formazione salvata.");
    } catch (error) {
      console.error(error);
      setMessaggio("Errore durante il salvataggio della formazione.");
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white">
      <h1 className="text-3xl font-black">Formazione {competizione.nome}</h1>

      <p className="mt-1 text-sm text-slate-300">
        Partecipante: {partecipante.nome}
      </p>

      <section className="mt-4 rounded-2xl bg-slate-900 p-4">
        <label className="mb-2 block text-sm font-bold">Modulo</label>

        <select
          value={modulo}
          onChange={(e) => resetModulo(e.target.value)}
          className="w-full rounded-xl bg-slate-800 p-3"
        >
          {Object.entries(MODULI).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
        </select>

        <p className="mt-2 text-sm text-slate-400">
          Bonus/malus modulo:{" "}
          <span className="font-bold">
            {calcolaBonusModulo(MODULI[modulo].label, BonusModuloEliminazione) >
            0
              ? "+"
              : ""}
            {calcolaBonusModulo(MODULI[modulo].label, BonusModuloEliminazione)}
          </span>
        </p>
      </section>

      <section className="mt-3 rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-3 text-xl font-bold">Titolari</h2>

        <div className="grid gap-2">
          {ruoliTitolari.map((ruolo, index) => (
            <div key={index} className="grid gap-1">
              <label className="text-sm font-semibold">
                T{index + 1} · {ruolo}
              </label>

              <select
                value={titolari[index]}
                onChange={(e) => cambiaTitolare(index, e.target.value)}
                className="w-full rounded-xl bg-slate-800 p-2.5 text-sm"
              >
                <option value="">
                  {titolari[index]
                    ? "✕ Svuota questo slot"
                    : "➕ Seleziona giocatore"}
                </option>

                {opzioniDisponibili(ruolo, titolari[index]).map((g) => (
                  <option key={g.id} value={g.id}>
                    {labelGiocatore(g)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-2 text-xl font-bold">Panchina</h2>
        <p className="mb-3 text-sm text-slate-400">Ordine sostituzioni.</p>

        <div className="grid gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="grid gap-1">
              <label className="text-sm font-semibold">P{index + 1}</label>

              <select
                value={panchina[index]}
                onChange={(e) => cambiaPanchinaro(index, e.target.value)}
                className="w-full rounded-xl bg-slate-800 p-2.5 text-sm"
              >
                <option value="">
                  {panchina[index]
                    ? "✕ Svuota questo slot"
                    : "➕ Seleziona giocatore"}
                </option>

                {opzioniPanchina(panchina[index]).map((g) => (
                  <option key={g.id} value={g.id}>
                    {labelGiocatoreConRuolo(g)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-3 text-xl font-bold">Capitano e vice</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold">Capitano</label>
            <select
              value={capitano}
              onChange={(e) => setCapitano(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-800 p-2.5 text-sm"
            >
              <option value="">Seleziona capitano</option>
              {titolariScelti
                .filter((g) => g.id !== vice)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {labelGiocatore(g)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold">Vicecapitano</label>
            <select
              value={vice}
              onChange={(e) => setVice(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-800 p-2.5 text-sm"
            >
              <option value="">Seleziona vice</option>
              {titolariScelti
                .filter((g) => g.id !== capitano)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {labelGiocatore(g)}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-3 text-xl font-bold">Riepilogo</h2>

        <p className="font-bold">Formazione schierata</p>

        <div className="mt-2 space-y-2 text-sm">
          {titolariScelti.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-5 text-center font-black text-amber-300">
                  {g.ruolo}
                </span>

                <img
                  src={bandieraNazionale(g.nazionale)}
                  alt={siglaNazionale(g.nazionale)}
                  className="h-4 w-6 rounded object-cover"
                />

                <div className="min-w-0">
                  <div className="truncate font-bold text-white">{g.nome}</div>
                  <div className="text-xs text-slate-400">
                    {labelAvversaria(g)}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {capitano === g.id && (
                  <span className="rounded bg-purple-700 px-2 py-0.5 text-xs font-bold">
                    CAP
                  </span>
                )}

                {vice === g.id && (
                  <span className="rounded bg-sky-700 px-2 py-0.5 text-xs font-bold">
                    VICE
                  </span>
                )}

                <span className="text-xs font-bold text-slate-400">
                  Q{g.costo}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 font-bold">Panchina</p>

        <div className="mt-2 space-y-2 text-sm text-slate-300">
          {panchinaScelta.map((g, index) => (
            <div
              key={g.id}
              className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-7 text-xs font-black text-slate-400">
                  P{index + 1}
                </span>

                <span className="w-5 text-center font-black text-amber-300">
                  {g.ruolo}
                </span>

                <img
                  src={bandieraNazionale(g.nazionale)}
                  alt={siglaNazionale(g.nazionale)}
                  className="h-4 w-6 rounded object-cover"
                />

                <div className="min-w-0">
                  <div className="truncate font-bold text-white">{g.nome}</div>
                  <div className="text-xs text-slate-400">
                    {labelAvversaria(g)}
                  </div>
                </div>
              </div>

              <span className="text-xs font-bold text-slate-400">
                Q{g.costo}
              </span>
            </div>
          ))}
        </div>
      </section>

      {new Set([...titolari, ...panchina].filter(Boolean)).size !==
        [...titolari, ...panchina].filter(Boolean).length && (
        <div className="mt-3 rounded-xl bg-red-950 p-3 text-sm font-bold text-red-200">
          Ci sono giocatori duplicati nella formazione.
        </div>
      )}

      <div className="mt-4 grid gap-3">
        <button
          type="button"
          onClick={ripristinaFormazioneSalvata}
          className="w-full rounded-2xl bg-slate-700 py-3 text-base font-bold"
        >
          ↩ Ripristina formazione salvata
        </button>

        <button
          type="button"
          onClick={handleSalvaFormazione}
          disabled={salvataggio || !formazioneCompleta}
          className="w-full rounded-2xl bg-emerald-600 py-3 text-base font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvataggio ? "Salvataggio..." : "Salva formazione"}
        </button>

        {messaggio && (
          <div className="rounded-xl bg-slate-900 p-3 text-sm font-bold">
            {messaggio}{" "}
            {messaggio === "Formazione salvata." && (
              <a href="/" className="text-emerald-300 underline">
                Torna alla home
              </a>
            )}
          </div>
        )}
      </div>
    </main>
  );
}