"use client";

import { useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type GiocatoreRosa = {
  id: string;
  nome: string;
  ruolo: string;
  nazionale: string;
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

const MODULI: Record<string, { label: string; bonus: number; ruoli: string[] }> = {
  M_343: { label: "3-4-3", bonus: -1, ruoli: ["P", "D", "D", "D", "C", "C", "C", "C", "A", "A", "A"] },
  M_352: { label: "3-5-2", bonus: 2, ruoli: ["P", "D", "D", "D", "C", "C", "C", "C", "C", "A", "A"] },
  M_433: { label: "4-3-3", bonus: 1, ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "A", "A", "A"] },
  M_442: { label: "4-4-2", bonus: 0, ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "C", "A", "A"] },
  M_451: { label: "4-5-1", bonus: 1, ruoli: ["P", "D", "D", "D", "D", "C", "C", "C", "C", "C", "A"] },
  M_532: { label: "5-3-2", bonus: 2, ruoli: ["P", "D", "D", "D", "D", "D", "C", "C", "C", "A", "A"] },
  M_541: { label: "5-4-1", bonus: 3, ruoli: ["P", "D", "D", "D", "D", "D", "C", "C", "C", "C", "A"] },
};

function normalizzaModulo(modulo: string | null | undefined) {
  if (!modulo) return "M_352";
  if (MODULI[modulo]) return modulo;

  const trovato = Object.entries(MODULI).find(([, value]) => value.label === modulo);
  return trovato?.[0] ?? "M_352";
}

function ordinaRosa(a: GiocatoreRosa, b: GiocatoreRosa) {
  const ordine: Record<string, number> = { P: 1, D: 2, C: 3, A: 4 };

  if (ordine[a.ruolo] !== ordine[b.ruolo]) {
    return ordine[a.ruolo] - ordine[b.ruolo];
  }

  return b.costo - a.costo;
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

  const titolariScelti = rosaOrdinata.filter((g) => titolari.includes(g.id));
  const panchinaScelta = rosaOrdinata.filter((g) => panchina.includes(g.id));

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
      .filter((g) => g.id === valoreCorrente || !selezionati.includes(g.id));
  }

  function opzioniPanchina(valoreCorrente: string) {
    return rosaOrdinata.filter(
      (g) => g.id === valoreCorrente || !selezionati.includes(g.id)
    );
  }

  function cambiaTitolare(index: number, nuovoId: string) {
    const copia = [...titolari];
    copia[index] = nuovoId;
    setTitolari(copia);

    if (capitano && !copia.includes(capitano)) setCapitano("");
    if (vice && !copia.includes(vice)) setVice("");
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
    if (!formazioneCompleta) {
      setMessaggio("Formazione non valida: servono 11 titolari, 5 panchinari, capitano e vice senza duplicati.");
      return;
    }

    try {
      setSalvataggio(true);
      setMessaggio("");

      const righeTitolari = titolari.map((id, index) => ({
        competizione_id: competizione.id,
        partecipante_id: partecipante.id,
        giocatore_id: id,
        tipo: "titolare",
        ordine: index + 1,
        is_capitano: capitano === id,
        is_vice: vice === id,
        modulo: MODULI[modulo].label,
        bonus_malus_modulo: MODULI[modulo].bonus,
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
        bonus_malus_modulo: MODULI[modulo].bonus,
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

      setMessaggio("Formazione salvata con successo.");
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
      <p className="mt-1 text-sm text-slate-300">Partecipante: {partecipante.nome}</p>

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
            {MODULI[modulo].bonus > 0 ? "+" : ""}
            {MODULI[modulo].bonus}
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
                <option value="">✕ Svuota questo slot</option>

                {opzioniDisponibili(ruolo, titolari[index]).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome} · {g.nazionale} · Q{g.costo}
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
                <option value="">✕ Svuota questo slot</option>

                {opzioniPanchina(panchina[index]).map((g) => (
                  <option key={g.id} value={g.id}>
                    [{g.ruolo}] {g.nome} · {g.nazionale} · Q{g.costo}
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
                    {g.nome}
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
                    {g.nome}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-slate-900 p-4">
        <h2 className="mb-3 text-xl font-bold">Riepilogo</h2>

        <p className="font-bold">Formazione schierata</p>

        <div className="mt-2 space-y-1 text-sm">
          {titolariScelti.map((g) => (
            <div key={g.id} className="flex items-center gap-2">
              <span>{g.ruolo}</span>
              <span>{g.nome}</span>

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
            </div>
          ))}
        </div>

        <p className="mt-4 font-bold">Panchina</p>

        <div className="mt-2 space-y-1 text-sm text-slate-300">
          {panchinaScelta.map((g) => (
            <div key={g.id}>
              {g.ruolo} · {g.nome}
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
            {messaggio}
          </div>
        )}
      </div>
    </main>
  );
}