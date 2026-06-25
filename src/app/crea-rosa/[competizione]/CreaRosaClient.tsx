"use client";

import { useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

import RosaHeader from "./components/RosaHeader";
import BudgetBar from "./components/BudgetBar";
import RuoliBar from "./components/RuoliBar";
import ListaGiocatori from "./components/ListaGiocatori";
import RosaPanel from "./components/RosaPanel";

import type {
  Competizione,
  FiltroRuolo,
  Giocatore,
  Partecipante,
  Ruolo,
} from "./lib/types";

import {
  LIMITE_GIOCATORI,
  MIN_RUOLO,
  contaRuoli,
  jollyUsati,
  prezzoGiocatore,
  cognomeGiocatore,
} from "./lib/regoleRosa";

type Props = {
  competizione: Competizione;
  partecipante: Partecipante;
  giocatori: Giocatore[];
  rosaIniziale: Giocatore[];
  campoQuotazione: string;
};

export default function CreaRosaClient({
  competizione,
  partecipante,
  giocatori,
  rosaIniziale,
}: Props) {
  const BUDGET_MAX = competizione.budget;
  const MAX_PER_NAZIONALE = competizione.max_per_nazionale;
  const competizioneChiusa = !competizione.attiva || competizione.conclusa;

  const [ricerca, setRicerca] = useState("");
  const [ruoloFiltro, setRuoloFiltro] = useState<FiltroRuolo>("Tutti");
  const [ordinamento, setOrdinamento] =
    useState<"nome" | "prezzoAsc" | "prezzoDesc">("prezzoDesc");
  const [rosa, setRosa] = useState<Giocatore[]>(rosaIniziale ?? []);
  const [salvataggio, setSalvataggio] = useState(false);
  const [messaggio, setMessaggio] = useState("");

  const budgetUsato = useMemo(
    () => rosa.reduce((totale, g) => totale + prezzoGiocatore(g), 0),
    [rosa]
  );

  const budgetResiduo = BUDGET_MAX - budgetUsato;

  const contatoriRuoli = useMemo(() => contaRuoli(rosa), [rosa]);

  const contatoriNazionali = useMemo(() => {
    return rosa.reduce((acc, g) => {
      acc[g.nazionale] = (acc[g.nazionale] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [rosa]);

  const selezionatiIds = useMemo(
    () => new Set(rosa.map((g) => g.id)),
    [rosa]
  );

  const giocatoriFiltrati = useMemo(() => {
    return [...giocatori]
      .filter((g) => {
        const testo = ricerca.toLowerCase();

        const matchRicerca =
          g.nome.toLowerCase().includes(testo) ||
          g.nazionale.toLowerCase().includes(testo);

        const matchRuolo =
          ruoloFiltro === "Tutti" ||
          g.ruolo === ruoloFiltro ||
          (ruoloFiltro === "J" && ["D", "C", "A"].includes(g.ruolo));

        return matchRicerca && matchRuolo;
      })
      .sort((a, b) => {
        if (ordinamento === "nome") {
          return cognomeGiocatore(a.nome).localeCompare(cognomeGiocatore(b.nome));
        }

        const qa = prezzoGiocatore(a);
        const qb = prezzoGiocatore(b);

        if (ordinamento === "prezzoAsc") return qa - qb;
        return qb - qa;
      });
  }, [giocatori, ricerca, ruoloFiltro, ordinamento]);

  function isInRosa(id: number) {
    return selezionatiIds.has(id);
  }

  function motivoBlocco(g: Giocatore): string | null {
    if (isInRosa(g.id)) return "Già selezionato";
    if (rosa.length >= LIMITE_GIOCATORI) return "Rosa completa";

    if (budgetUsato + prezzoGiocatore(g) > BUDGET_MAX) {
      return "Budget insufficiente";
    }

    if ((contatoriNazionali[g.nazionale] ?? 0) >= MAX_PER_NAZIONALE) {
      return `Massimo ${MAX_PER_NAZIONALE} giocatori per nazionale`;
    }

    if (g.ruolo === "P" && contatoriRuoli.P >= MIN_RUOLO.P) {
      return "Portieri completi";
    }

    const nuoviContatori: Record<Ruolo, number> = {
      ...contatoriRuoli,
      [g.ruolo]: contatoriRuoli[g.ruolo] + 1,
    };

    if (jollyUsati(nuoviContatori) > 1) {
      return "Jolly già utilizzato";
    }

    const postiRimanentiDopoAcquisto = LIMITE_GIOCATORI - (rosa.length + 1);

    const minimiMancantiDopoAcquisto =
      Math.max(0, MIN_RUOLO.P - nuoviContatori.P) +
      Math.max(0, MIN_RUOLO.D - nuoviContatori.D) +
      Math.max(0, MIN_RUOLO.C - nuoviContatori.C) +
      Math.max(0, MIN_RUOLO.A - nuoviContatori.A);

    if (minimiMancantiDopoAcquisto > postiRimanentiDopoAcquisto) {
      return "Devi rispettare i minimi per ruolo";
    }

    return null;
  }

  function aggiungiGiocatore(g: Giocatore) {
    if (motivoBlocco(g)) return;
    setRosa((prev) => [...prev, g]);
    setMessaggio("");
  }

  function rimuoviGiocatore(id: number) {
    setRosa((prev) => prev.filter((g) => g.id !== id));
    setMessaggio("");
  }

  function svuotaRosa() {
    if (!confirm("Vuoi davvero svuotare tutta la rosa?")) return;
    setRosa([]);
    setMessaggio("");
  }

  async function handleConfermaRosa() {
    if (rosa.length !== LIMITE_GIOCATORI) {
      setMessaggio("La rosa deve contenere esattamente 16 giocatori.");
      return;
    }

    if (
      contatoriRuoli.P < MIN_RUOLO.P ||
      contatoriRuoli.D < MIN_RUOLO.D ||
      contatoriRuoli.C < MIN_RUOLO.C ||
      contatoriRuoli.A < MIN_RUOLO.A
    ) {
      setMessaggio("Rosa non valida: servono 2 P, 5 D, 5 C, 3 A e 1 Jolly.");
      return;
    }

    if (jollyUsati(contatoriRuoli) !== 1) {
      setMessaggio("Rosa non valida: devi usare esattamente 1 jolly D/C/A.");
      return;
    }

    try {
      setSalvataggio(true);
      setMessaggio("");

      const righe = rosa.map((g) => ({
        competizione_id: competizione.id,
        partecipante_id: partecipante.id,
        giocatore_id: g.id,
        costo: prezzoGiocatore(g),
      }));

      const { error: deleteError } = await supabase
        .from("rose_competizione")
        .delete()
        .eq("competizione_id", competizione.id)
        .eq("partecipante_id", partecipante.id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("rose_competizione")
        .insert(righe);

      if (insertError) throw insertError;

      setMessaggio("Rosa salvata con successo.");
    } catch (error) {
      console.error(error);
      setMessaggio("Errore durante il salvataggio.");
    } finally {
      setSalvataggio(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#08111d] text-white">
      <div className="mx-auto max-w-7xl px-3 py-4">
        <RosaHeader competizione={competizione} partecipante={partecipante} />

        <BudgetBar
          budgetUsato={budgetUsato}
          budgetMax={BUDGET_MAX}
          budgetResiduo={budgetResiduo}
        />

        <RuoliBar
          contatoriRuoli={contatoriRuoli}
          maxPerNazionale={MAX_PER_NAZIONALE}
          ruoloFiltro={ruoloFiltro}
          setRuoloFiltro={setRuoloFiltro}
        />

        <main className="grid gap-3">
          <RosaPanel
            rosa={rosa}
            competizioneChiusa={competizioneChiusa}
            salvataggio={salvataggio}
            messaggio={messaggio}
            svuotaRosa={svuotaRosa}
            rimuoviGiocatore={rimuoviGiocatore}
            handleConfermaRosa={handleConfermaRosa}
          />

          <ListaGiocatori
            ricerca={ricerca}
            setRicerca={setRicerca}
            ruoloFiltro={ruoloFiltro}
            setRuoloFiltro={setRuoloFiltro}
            ordinamento={ordinamento}
            setOrdinamento={setOrdinamento}
            giocatori={giocatoriFiltrati}
            isInRosa={isInRosa}
            motivoBlocco={motivoBlocco}
            aggiungiGiocatore={aggiungiGiocatore}
            rimuoviGiocatore={rimuoviGiocatore}
          />
        </main>
      </div>
    </div>
  );
}