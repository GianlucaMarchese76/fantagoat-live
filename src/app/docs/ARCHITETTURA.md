# FantaGOAT Live - Architettura

## Obiettivo del progetto

FantaGOAT Live è una piattaforma fantasy dedicata alle competizioni internazionali.

Il sistema consente di:

* gestire partecipanti e competizioni
* creare rose
* creare formazioni
* importare voti ufficiali
* calcolare punteggi live e definitivi
* generare classifiche

---

# Stack tecnologico

## Excel

Excel rappresenta la fonte operativa dei dati esterni.

Viene utilizzato per:

* voti Gazzetta
* fantapunti Gazzetta
* gol decisivi

I file Excel non costituiscono il database ufficiale ma sono utilizzati come sorgente di import.

---

## TypeScript Scripts

Cartella:

```txt
scripts/
```

Gestiscono l'importazione dei dati da Excel verso Supabase.

Principali script:

```txt
import-punteggi.ts
import-gol-decisivi.ts
```

---

## Supabase

Supabase rappresenta il database ufficiale del progetto.

Contiene:

* giocatori
* partecipanti
* competizioni
* rose
* formazioni
* punteggi
* gol decisivi
* classifiche
* view operative

---

## Next.js

Applicazione web.

Cartella principale:

```txt
src/app/
```

Gestisce:

* homepage
* classifiche
* rose
* formazioni
* amministrazione dati

---

## GitHub

Repository ufficiale del progetto.

Serve a:

* versionare il codice
* mantenere lo storico modifiche
* consentire rollback

---

## Vercel

Piattaforma di deploy.

Flusso:

```txt
Codice locale
↓
GitHub
↓
Vercel
↓
Produzione
```

---

# Flusso generale dei dati

```txt
Excel
↓
Script Import
↓
Supabase
↓
View SQL
↓
Motore di Calcolo
↓
Pagine Web
```

---

# Dati sorgente

## Punteggi ufficiali

Tabella:

```txt
punteggi_giocatori
```

Origine:

```txt
G1AF.xlsx
G1GL.xlsx
G2AF.xlsx
G2GL.xlsx
...
```

Contiene:

* voto
* fantapunti

Regola fondamentale:

I dati devono rimanere identici alla fonte Gazzetta.

Non devono contenere bonus Fantagoat.

---

## Gol decisivi

Tabella:

```txt
gol_decisivi
```

Origine:

```txt
gol_decisivi.xlsx
```

Ogni record vale:

```txt
+1
```

Regola fondamentale:

Il bonus è associato al giocatore e non alla squadra.

---

# Rose

Tabella principale:

```txt
rose_competizione
```

Ogni partecipante possiede:

```txt
16 giocatori
```

Vincoli definiti dal regolamento della competizione.

---

# Formazioni

Tabella principale:

```txt
formazioni_competizione
```

Contiene:

* titolari
* panchina
* capitano
* vice
* modulo

---

# View operative

## v_formazioni_dettaglio_live

È la view centrale del sistema.

Unisce:

* formazioni
* punteggi
* calendario
* gol decisivi

Espone:

* voto_live
* fantapunti_live
* bonus_gol_decisivo
* stato_giocatore

Regola:

```txt
fantapunti_live =
fantapunti +
bonus_gol_decisivo
```

---

# Motore di calcolo

File:

```txt
src/lib/calcoloFormazione.ts
```

Funzione principale:

```ts
calcolaTotaleFormazione()
```

Responsabilità:

* sostituzioni
* modulo finale
* modificatori
* bonus capitano
* totale squadra

---

# Formula ufficiale

```txt
Totale squadra =
Totale giocatori
+
Bonus Capitano
+
Modificatore Difesa
+
Modificatore Centrocampo
+
Bonus/Malus Modulo
```

---

# Principio fondamentale

Fonte ufficiale dei dati:

```txt
Punteggi Gazzetta
+
Gol Decisivi
```

Tutti gli altri risultati devono essere derivati da queste fonti.

Non modificare manualmente i fantapunti Gazzetta.
