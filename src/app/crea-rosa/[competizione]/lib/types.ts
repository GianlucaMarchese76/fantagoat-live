export type Ruolo = "P" | "D" | "C" | "A";
export type FiltroRuolo = "Tutti" | Ruolo | "J";

export type Giocatore = {
  id: number;
  nome: string;
  ruolo: Ruolo;
  nazionale: string;
  avversaria?: string;
  quotazione_sedicesimi: number | null;
};

export type Competizione = {
  id: number;
  codice: string;
  nome: string;
  budget: number;
  max_per_nazionale: number;
  attiva: boolean;
  conclusa: boolean;
};

export type Partecipante = {
  id: string;
  nome: string;
  slug: string;
};
export type FormazioneCompetizioneSalvata = {
  giocatore_id: number;
  tipo: "titolare" | "panchina";
  ordine: number;
  is_capitano: boolean;
  is_vice: boolean;
  modulo: string;
};