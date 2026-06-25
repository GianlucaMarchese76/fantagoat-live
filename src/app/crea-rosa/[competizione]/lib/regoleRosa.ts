import type { Giocatore, Ruolo } from "./types";

export const RUOLI: Ruolo[] = ["P", "D", "C", "A"];

export const MIN_RUOLO: Record<Ruolo, number> = {
  P: 2,
  D: 5,
  C: 5,
  A: 3,
};

export const LIMITE_GIOCATORI = 16;

export function prezzoGiocatore(g: Giocatore) {
  return g.quotazione_sedicesimi ?? 0;
}

export function contaRuoli(rosa: Giocatore[]) {
  return RUOLI.reduce((acc, ruolo) => {
    acc[ruolo] = rosa.filter((g) => g.ruolo === ruolo).length;
    return acc;
  }, {} as Record<Ruolo, number>);
}

export function jollyUsati(counts: Record<Ruolo, number>) {
  return (
    Math.max(0, counts.D - MIN_RUOLO.D) +
    Math.max(0, counts.C - MIN_RUOLO.C) +
    Math.max(0, counts.A - MIN_RUOLO.A)
  );
}

export function cognomeGiocatore(nome: string) {
  const parti = nome.trim().split(/\s+/);
  if (parti.length <= 1) return nome;
  return parti.slice(1).join(" ");
}

export function ordinaRosa(a: Giocatore, b: Giocatore) {
  const ordineRuolo: Record<Ruolo, number> = { P: 1, D: 2, C: 3, A: 4 };

  if (ordineRuolo[a.ruolo] !== ordineRuolo[b.ruolo]) {
    return ordineRuolo[a.ruolo] - ordineRuolo[b.ruolo];
  }

  return prezzoGiocatore(b) - prezzoGiocatore(a);
}