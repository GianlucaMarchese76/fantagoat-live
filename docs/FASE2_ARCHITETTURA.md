# FantaGOAT 2.0 – Architettura Funzionale

## Obiettivo

Evolvere FantaGOAT da un modello basato su una singola rosa e una singola fase a un sistema multi-competizione con rose indipendenti, regole configurabili e accesso personale dei partecipanti.

---

# Competizioni

## Elenco competizioni

| Codice     | Nome           |
| ---------- | -------------- |
| 16ALTA     | 1/16 Gare 1-8  |
| 16BASSA    | 1/16 Gare 9-16 |
| 8ALTA      | 1/8 Gare 1-4   |
| 8BASSA     | 1/8 Gare 5-8   |
| QUARTI     | Quarti         |
| SEMIFINALI | Semifinali     |
| TERZOPOSTO | 3°-4° Posto    |
| FINALE     | Finale         |

Tutti i partecipanti partecipano a tutte le competizioni.

Ogni partecipante costruisce una rosa dedicata per ciascuna competizione.

Numero totale di rose per partecipante:

```text
8
```

---

# Budget

| Competizione | Budget |
| ------------ | -----: |
| 16ALTA       |    450 |
| 16BASSA      |    450 |
| 8ALTA        |    475 |
| 8BASSA       |    475 |
| QUARTI       |    475 |
| SEMIFINALI   |    500 |
| TERZOPOSTO   |    500 |
| FINALE       |    500 |

---

# Moltiplicatori

| Competizione | Moltiplicatore |
| ------------ | -------------: |
| 16ALTA       |            1.0 |
| 16BASSA      |            1.0 |
| 8ALTA        |            1.2 |
| 8BASSA       |            1.2 |
| QUARTI       |            1.4 |
| SEMIFINALI   |            1.6 |
| TERZOPOSTO   |            1.0 |
| FINALE       |            2.0 |

Formula:

```text
Punteggio competizione =
Punteggio formazione × Moltiplicatore
```

---

# Rosa

## Dimensione

```text
16 giocatori
```

## Composizione minima

| Ruolo          | Quantità |
| -------------- | -------: |
| Portieri       |        2 |
| Difensori      |        5 |
| Centrocampisti |        5 |
| Attaccanti     |        3 |
| Jolly          |        1 |

## Jolly

Lo slot jolly può appartenere a qualsiasi ruolo:

```text
P
D
C
A
```

Composizioni valide:

```text
3P 5D 5C 3A
2P 6D 5C 3A
2P 5D 6C 3A
2P 5D 5C 4A
```

---

# Limite per Nazionale

| Competizione | Max giocatori per nazionale |
| ------------ | --------------------------: |
| 16ALTA       |                           3 |
| 16BASSA      |                           3 |
| 8ALTA        |                           4 |
| 8BASSA       |                           4 |
| QUARTI       |                           4 |
| SEMIFINALI   |                           6 |
| TERZOPOSTO   |                           9 |
| FINALE       |                           9 |

---

# Formazione

Ogni formazione è composta da:

```text
11 titolari
5 panchinari
1 capitano
1 vicecapitano
```

La formazione può utilizzare esclusivamente giocatori presenti nella rosa della relativa competizione.

---

# Filosofia delle Rose

Ogni competizione genera una nuova rosa.

Non esiste alcuna ereditarietà tra competizioni.

Esempio:

```text
16ALTA      → nuova rosa
16BASSA     → nuova rosa
8ALTA       → nuova rosa
8BASSA      → nuova rosa
QUARTI      → nuova rosa
SEMIFINALI  → nuova rosa
TERZOPOSTO  → nuova rosa
FINALE      → nuova rosa
```

---

# Classifiche

## Classifica Prima Fase

Somma delle competizioni della fase a gironi.

Esempio attuale:

```text
G1AF
G1GL
G2AF
G2GL
G3AF
G3GL
```

---

## Classifica Seconda Fase

Somma delle competizioni:

```text
16ALTA
16BASSA
8ALTA
8BASSA
QUARTI
SEMIFINALI
TERZOPOSTO
FINALE
```

con applicazione dei relativi moltiplicatori.

---

## Classifica Generale

Formula:

```text
Classifica Generale =
Classifica Prima Fase +
Classifica Seconda Fase
```

---

# Regola Capitano – Fase 2

La gestione del capitano genera due malus indipendenti e cumulabili.

## 1. Malus Capitano Assente

Se nella competizione corrente:

* il capitano non ottiene voto/fantapunti;
* il vice non ottiene voto/fantapunti;

si applica:

```text
-2
```

Questo malus è sempre attivo.

---

## 2. Malus Continuità Capitano

### Relazioni

```text
8ALTA       ← 16ALTA
8BASSA      ← 16BASSA

QUARTI      ← 8ALTA + 8BASSA

SEMIFINALI  ← QUARTI

FINALE      ← SEMIFINALI

TERZOPOSTO  ← nessuna continuità
```

### Capitano effettivo

Il capitano effettivo è:

```text
Capitano se ottiene voto/fantapunti

altrimenti

Vice se ottiene voto/fantapunti

altrimenti

Nessuno
```

### Calcolo del malus

Confronto del capitano effettivo corrente con i capitani e vice designati nelle competizioni di riferimento.

| Caso                                              | Malus |
| ------------------------------------------------- | ----: |
| Coincide con un capitano designato di riferimento |     0 |
| Coincide con un vice designato di riferimento     |    -1 |
| Diverso da tutti i riferimenti                    |    -2 |
| Nessun capitano effettivo                         |    -2 |

---

## Cumulabilità

I due malus sono indipendenti.

Esempio:

```text
Capitano senza voto
Vice senza voto

→ Malus Capitano Assente = -2

→ Malus Continuità = -2

Totale = -4
```

---

# Partecipanti

I partecipanti non sono hardcoded.

Devono essere gestiti tramite tabella dedicata.

Nuovi partecipanti possono essere aggiunti in qualsiasi momento.

---

# Accesso Utente

Versione iniziale:

```text
Partecipante
+
Codice personale
```

Senza email.

Senza autenticazione Supabase.

Obiettivi:

* accesso semplice;
* gestione della propria rosa;
* gestione delle proprie formazioni;
* area personale.

---

# Struttura Database Prevista

## Tabelle esistenti

```text
partecipanti
rose
formazioni
```

Le tabelle della Prima Fase restano inalterate.

---

## Nuove tabelle

```text
competizioni
rose_competizione
formazioni_competizione
```

Eventuali tabelle di supporto:

```text
continuita_capitano
```

---

# Roadmap Tecnica

## Fase 2.1

Creazione struttura database.

## Fase 2.2

Pagina:

```text
Crea Rosa
```

con validazione:

* budget;
* ruoli;
* jolly;
* limite per nazionale.

## Fase 2.3

Inserimento formazione basato sulla rosa della competizione.

## Fase 2.4

Login semplice.

## Fase 2.5

Classifiche:

```text
Prima Fase
Seconda Fase
Generale
```
