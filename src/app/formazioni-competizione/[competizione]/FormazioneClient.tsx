"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

const MODULI = {
  "3-4-3": { P: 1, D: 3, C: 4, A: 3 },
  "3-5-2": { P: 1, D: 3, C: 5, A: 2 },
  "4-3-3": { P: 1, D: 4, C: 3, A: 3 },
  "4-4-2": { P: 1, D: 4, C: 4, A: 2 },
  "4-5-1": { P: 1, D: 4, C: 5, A: 1 },
  "5-3-2": { P: 1, D: 5, C: 3, A: 2 },
  "5-4-1": { P: 1, D: 5, C: 4, A: 1 },
} as const;

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
  const [titolari, setTitolari] = useState<string[]>(titolariIniziali ?? []);
  const [panchina, setPanchina] = useState<string[]>(panchinaIniziale ?? []);
  const [capitano, setCapitano] = useState<string | null>(capitanoIniziale ?? null);
  const [vice, setVice] = useState<string | null>(viceIniziale ?? null);

  const [modulo, setModulo] = useState(moduloIniziale ?? "4-4-2");
  console.log("MODULO INIZIALE", moduloIniziale);
console.log("MODULO STATE", modulo);
  const [salvataggio, setSalvataggio] = useState(false);
  const [messaggio, setMessaggio] = useState("");

  const moduloScelto = MODULI[modulo as keyof typeof MODULI];

  const giocatoriTitolari = giocatoriRosa.filter((g) =>
    titolari.includes(g.id)
  );

  const conteggioRuoli = {
    P: giocatoriTitolari.filter((g) => g.ruolo === "P").length,
    D: giocatoriTitolari.filter((g) => g.ruolo === "D").length,
    C: giocatoriTitolari.filter((g) => g.ruolo === "C").length,
    A: giocatoriTitolari.filter((g) => g.ruolo === "A").length,
  };

  const titolariCompletiPerModulo =
    conteggioRuoli.P === moduloScelto.P &&
    conteggioRuoli.D === moduloScelto.D &&
    conteggioRuoli.C === moduloScelto.C &&
    conteggioRuoli.A === moduloScelto.A;

  const formazioneCompleta =
    titolari.length === 11 &&
    panchina.length === 5 &&
    capitano !== null &&
    vice !== null &&
    titolariCompletiPerModulo;

  function aggiungiTitolare(id: string) {
    if (titolari.includes(id)) return;

    if (!panchina.includes(id) && titolari.length >= 11) {
      return;
    }

    setPanchina((prev) => prev.filter((x) => x !== id));

    setTitolari((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }

  function aggiungiPanchina(id: string) {
    if (panchina.includes(id)) return;

    if (!titolari.includes(id) && panchina.length >= 5) {
      return;
    }

    setTitolari((prev) => prev.filter((x) => x !== id));

    if (capitano === id) setCapitano(null);
    if (vice === id) setVice(null);

    setPanchina((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }

  function rimuoviDaFormazione(id: string) {
    setTitolari((prev) => prev.filter((x) => x !== id));
    setPanchina((prev) => prev.filter((x) => x !== id));

    if (capitano === id) setCapitano(null);
    if (vice === id) setVice(null);
  }

  function scegliCapitano(id: string) {
    if (!titolari.includes(id)) return;

    setCapitano(id);

    if (vice === id) {
      setVice(null);
    }
  }

  function scegliVice(id: string) {
    if (!titolari.includes(id)) return;

    setVice(id);

    if (capitano === id) {
      setCapitano(null);
    }
  }

  async function handleSalvaFormazione() {
    if (!formazioneCompleta) {
      setMessaggio(
        "Formazione non valida. Controlla modulo, titolari, panchina, capitano e vice."
      );
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
        modulo,
        bonus_malus_modulo: 0,
      }));

      const righePanchina = panchina.map((id, index) => ({
        competizione_id: competizione.id,
        partecipante_id: partecipante.id,
        giocatore_id: id,
        tipo: "panchina",
        ordine: index + 1,
        is_capitano: false,
        is_vice: false,
        modulo,
        bonus_malus_modulo: 0,
      }));

      const righe = [...righeTitolari, ...righePanchina];

      const { error: deleteError } = await supabase
        .from("formazioni_competizione")
        .delete()
        .eq("competizione_id", competizione.id)
        .eq("partecipante_id", partecipante.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("formazioni_competizione")
        .insert(righe);

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
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <h1 className="text-4xl font-black">
        Formazione {competizione.nome}
      </h1>

      <p className="mt-2 text-slate-300">
        Partecipante: {partecipante.nome}
      </p>

      <div className="mt-6 rounded-xl bg-slate-900 p-4">
        <label className="mb-2 block text-sm font-bold">Modulo</label>

        <select
          value={modulo}
          onChange={(e) => setModulo(e.target.value)}
          className="w-full rounded-lg bg-slate-800 p-3"
        >
          <option value="3-4-3">3-4-3</option>
          <option value="3-5-2">3-5-2</option>
          <option value="4-3-3">4-3-3</option>
          <option value="4-4-2">4-4-2</option>
          <option value="4-5-1">4-5-1</option>
          <option value="5-3-2">5-3-2</option>
          <option value="5-4-1">5-4-1</option>
        </select>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Titolari</p>
          <p className="text-3xl font-black">{titolari.length}/11</p>
        </div>

        <div className="rounded-xl bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Panchina</p>
          <p className="text-3xl font-black">{panchina.length}/5</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-900 p-4">
        <p className="font-bold">Stato formazione</p>

        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          <li>• Titolari: {titolari.length}/11</li>
          <li>• Panchina: {panchina.length}/5</li>
          <li>• Capitano: {capitano ? "✓" : "✕"}</li>
          <li>• Vice: {vice ? "✓" : "✕"}</li>
          <li>
  {conteggioRuoli.P === moduloScelto.P ? "✅" : "❌"} Portieri:{" "}
  {conteggioRuoli.P}/{moduloScelto.P}
</li>

<li>
  {conteggioRuoli.D === moduloScelto.D ? "✅" : "❌"} Difensori:{" "}
  {conteggioRuoli.D}/{moduloScelto.D}
</li>

<li>
  {conteggioRuoli.C === moduloScelto.C ? "✅" : "❌"} Centrocampisti:{" "}
  {conteggioRuoli.C}/{moduloScelto.C}
</li>

<li>
  {conteggioRuoli.A === moduloScelto.A ? "✅" : "❌"} Attaccanti:{" "}
  {conteggioRuoli.A}/{moduloScelto.A}
</li>
        </ul>

        <p className="mt-3 font-bold">
          {formazioneCompleta
            ? "✅ Formazione completa"
            : "⚠️ Formazione incompleta"}
        </p>

        <div className="mt-4 space-y-3">
          <button
            onClick={handleSalvaFormazione}
            disabled={salvataggio || !formazioneCompleta}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvataggio ? "Salvataggio..." : "Salva Formazione"}
          </button>

          {messaggio && (
            <div className="rounded-xl bg-slate-800 p-3 text-sm">
              {messaggio}
            </div>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-2xl font-bold">
          Rosa salvata ({(giocatoriRosa ?? []).length}/16)
        </h2>

        <div className="mt-4 grid gap-3">
          {(giocatoriRosa ?? []).map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="font-bold">{g.nome}</div>

              <div className="text-sm text-slate-400">
                {g.ruolo} · {g.nazionale} · Costo {g.costo}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => aggiungiTitolare(g.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-bold"
                >
                  Titolare
                </button>

                <button
                  onClick={() => aggiungiPanchina(g.id)}
                  className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-bold"
                >
                  Panchina
                </button>

                <button
                  onClick={() => rimuoviDaFormazione(g.id)}
                  className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold"
                >
                  Rimuovi
                </button>

                <button
                  onClick={() => scegliCapitano(g.id)}
                  disabled={!titolari.includes(g.id)}
                  className="rounded-lg bg-purple-700 px-3 py-1 text-sm font-bold disabled:opacity-40"
                >
                  Capitano
                </button>

                <button
                  onClick={() => scegliVice(g.id)}
                  disabled={!titolari.includes(g.id)}
                  className="rounded-lg bg-sky-700 px-3 py-1 text-sm font-bold disabled:opacity-40"
                >
                  Vice
                </button>
              </div>

              <div className="mt-2 text-xs font-bold">
                {titolari.includes(g.id) && (
                  <span className="text-emerald-400">TITOLARE</span>
                )}

                {panchina.includes(g.id) && (
                  <span className="ml-2 text-amber-400">PANCHINA</span>
                )}

                {capitano === g.id && (
                  <span className="ml-2 text-purple-400">CAPITANO</span>
                )}

                {vice === g.id && (
                  <span className="ml-2 text-sky-400">VICE</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}