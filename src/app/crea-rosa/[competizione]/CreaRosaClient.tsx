"use client";

import { useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

import RosaHeader from "./components/RosaHeader";
import BudgetBar from "./components/BudgetBar";
import RuoliBar from "./components/RuoliBar";
import ListaGiocatori from "./components/ListaGiocatori";
import RosaPanel from "./components/RosaPanel";
import PartiteFase from "./components/PartiteFase";
import { generaFormazioneAutomatica } from "./lib/generaFormazione";
import { aggiornaFormazioneEsistente } from "./lib/aggiornaFormazioneEsistente";
import { useRouter } from "next/navigation";

import type {
  Competizione,
  FiltroRuolo,
  FormazioneCompetizioneSalvata,
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

type PartitaFase = {
  partita: string;
  kickoff: string;
};

type Props = {
  competizione: Competizione;
  partecipante: Partecipante;
  giocatori: Giocatore[];
  rosaIniziale: Giocatore[];
  formazioneEsistente: FormazioneCompetizioneSalvata[];
  campoQuotazione: string;
  partite: PartitaFase[];
  rosaBloccata: boolean;
};

export default function CreaRosaClient({
  competizione,
  partecipante,
  giocatori,
  rosaIniziale,
  formazioneEsistente,
  partite,
  rosaBloccata,
}: Props) {
  const router = useRouter();
  const BUDGET_MAX = competizione.budget;
  const MAX_PER_NAZIONALE = competizione.max_per_nazionale;

  const avversariByNazionale = useMemo(() => {
  const map = new Map<string, string>();

  for (const p of partite) {
    const [a, b] = p.partita.split("-").map((x) => x.trim());

    if (a && b) {
      map.set(a, b);
      map.set(b, a);
    }
  }

  return map;
}, [partite]);

  const [ricerca, setRicerca] = useState("");
  const [ruoloFiltro, setRuoloFiltro] = useState<FiltroRuolo>("P");
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
    return [...giocatori].map((g) => ({
  ...g,
  avversaria:
    g.avversaria ??
    avversariByNazionale.get(String(g.nazionale ?? "").trim().toUpperCase()),
}))
      .filter((g) => {
        const testo = ricerca.toLowerCase();

        const matchRicerca =
          g.nome.toLowerCase().includes(testo) ||
          g.nazionale.toLowerCase().includes(testo);

        let matchRuolo = false;

        if (ruoloFiltro === "Tutti") {
          matchRuolo = ["P", "D", "C", "A"].includes(g.ruolo);
        } else if (ruoloFiltro === "J") {
          matchRuolo = ["D", "C", "A"].includes(g.ruolo);
        } else {
          matchRuolo = g.ruolo === ruoloFiltro;
        }

        return matchRicerca && matchRuolo;
      })
      .sort((a, b) => {
        if (ordinamento === "nome") {
          return cognomeGiocatore(a.nome).localeCompare(
            cognomeGiocatore(b.nome)
          );
        }

        const qa = prezzoGiocatore(a);
        const qb = prezzoGiocatore(b);

        if (ordinamento === "prezzoAsc") return qa - qb;
        return qb - qa;
      });
  }, [giocatori, ricerca, ruoloFiltro, ordinamento, avversariByNazionale]);

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
    if (rosaBloccata) return;
    if (motivoBlocco(g)) return;
    setRosa((prev) => [...prev, g]);
    setMessaggio("");
  }

  function rimuoviGiocatore(id: number) {
    if (rosaBloccata) return;
    setRosa((prev) => prev.filter((g) => g.id !== id));
    setMessaggio("");
  }

  function svuotaRosa() {
    if (rosaBloccata) return;
    if (!confirm("Vuoi davvero svuotare tutta la rosa?")) return;
    setRosa([]);
    setMessaggio("");
  }

  async function handleConfermaRosa() {
    if (rosaBloccata) {
  setMessaggio("La rosa non può essere modificata.");
  return;
}
  if (rosa.length !== LIMITE_GIOCATORI) {
    setMessaggio("La rosa deve contenere 16 giocatori.");
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
    setMessaggio("Rosa non valida: devi usare 1 jolly D/C/A.");
    return;
  }

  try {
    setSalvataggio(true);
    setMessaggio("");

    const righeRosa = rosa.map((g) => ({
      competizione_id: competizione.id,
      partecipante_id: partecipante.id,
      giocatore_id: g.id,
      costo: prezzoGiocatore(g),
    }));

if (righeRosa.length !== LIMITE_GIOCATORI) {
  throw new Error("Salvataggio bloccato: rosa incompleta.");
}

if (new Set(righeRosa.map((r) => r.giocatore_id)).size !== LIMITE_GIOCATORI) {
  throw new Error("Salvataggio bloccato: rosa con giocatori duplicati.");
}

    const rosaConCosto = rosa.map((g) => ({
      ...g,
      costo: prezzoGiocatore(g),
    }));

    const formazione =
  formazioneEsistente.length > 0
    ? aggiornaFormazioneEsistente(rosaConCosto, formazioneEsistente)
    : generaFormazioneAutomatica(rosaConCosto);

    const { error: deleteRosaError } = await supabase
      .from("rose_competizione")
      .delete()
      .eq("competizione_id", competizione.id)
      .eq("partecipante_id", partecipante.id);

    if (deleteRosaError) throw deleteRosaError;

    const { error: insertRosaError } = await supabase
      .from("rose_competizione")
      .insert(righeRosa);

    if (insertRosaError) throw insertRosaError;

    const { error: deleteFormazioneError } = await supabase
      .from("formazioni_competizione")
      .delete()
      .eq("competizione_id", competizione.id)
      .eq("partecipante_id", partecipante.id);

    if (deleteFormazioneError) throw deleteFormazioneError;

    const righeFormazione = [
      ...formazione.titolari.map((g, index) => ({
        competizione_id: competizione.id,
        partecipante_id: partecipante.id,
        giocatore_id: g.id,
        tipo: "titolare",
        ordine: index + 1,
        modulo: formazione.modulo,
        is_capitano: g.id === formazione.capitano.id,
        is_vice: g.id === formazione.vice.id,
      })),
      ...formazione.panchina.map((g, index) => ({
        competizione_id: competizione.id,
        partecipante_id: partecipante.id,
        giocatore_id: g.id,
        tipo: "panchina",
        ordine: index + 1,
        modulo: formazione.modulo,
        is_capitano: g.id === formazione.capitano.id,
        is_vice: g.id === formazione.vice.id,
      })),
    ];

if (righeFormazione.length !== LIMITE_GIOCATORI) {
  throw new Error("Salvataggio bloccato: formazione incompleta.");
}

if (
  new Set(righeFormazione.map((r) => r.giocatore_id)).size !==
  LIMITE_GIOCATORI
) {
  throw new Error("Salvataggio bloccato: formazione con giocatori duplicati.");
}

if (!righeFormazione.some((r) => r.is_capitano)) {
  throw new Error("Salvataggio bloccato: capitano mancante.");
}

if (!righeFormazione.some((r) => r.is_vice)) {
  throw new Error("Salvataggio bloccato: vicecapitano mancante.");
}

    const { error: insertFormazioneError } = await supabase
      .from("formazioni_competizione")
      .insert(righeFormazione);

    if (insertFormazioneError) throw insertFormazioneError;

    router.push(
  `/formazioni-competizione/${competizione.codice}?partecipante=${encodeURIComponent(
    partecipante.slug
  )}`
);
  } catch (error) {
    console.error(error);
    setMessaggio("Errore durante il salvataggio.");
  } finally {
    setSalvataggio(false);
  }
}

  return (
    <div className="min-h-screen bg-[#08111d] text-white">
      <div className="mx-auto w-full max-w-7xl overflow-hidden px-3 py-4">
        <a href="/" className="mb-3 inline-block text-sm text-slate-300">
  ← Home
</a>
        <RosaHeader competizione={competizione} partecipante={partecipante} />

        {rosaBloccata && (
  <div className="mt-3 rounded-xl border border-amber-600 bg-amber-950/40 p-3 text-amber-200">
    La rosa non può essere modificata.
  </div>
)}

<main className="grid w-full max-w-full gap-3 overflow-hidden">
          <RosaPanel
  rosa={rosa}
  rosaBloccata={rosaBloccata}
  salvataggio={salvataggio}
  messaggio={messaggio}
  svuotaRosa={svuotaRosa}
  rimuoviGiocatore={rimuoviGiocatore}
  handleConfermaRosa={handleConfermaRosa}
/>

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

<PartiteFase partite={partite} />

        </main>
      </div>
    </div>
  );
}