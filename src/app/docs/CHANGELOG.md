# Changelog

## 2026-06-23

### Documentazione

* Creata cartella docs
* Creato ARCHITETTURA.md
* Creato OPERATIVITA.md
* Creato CHANGELOG.md

---

### Gol decisivi

* Creata tabella gol_decisivi
* Aggiunta colonna punti
* Creato file gol_decisivi.xlsx
* Creato script import-gol-decisivi.ts
* Definito bonus ufficiale pari a +1

---

### View live

Aggiornata:

```txt
v_formazioni_dettaglio_live
```

Aggiunte colonne:

```txt
bonus_gol_decisivo
fantapunti_live
```

Regola:

```txt
fantapunti_live =
fantapunti +
bonus_gol_decisivo
```

---

### Motore di calcolo

Aggiornato:

```txt
src/lib/calcoloFormazione.ts
```

Il calcolo utilizza:

```txt
fantapunti_live ?? fantapunti
```

in modo da includere automaticamente il bonus gol decisivo.

---

### Formazioni competizione

Completata la prima versione di:

```txt
src/app/formazioni-competizione/[competizione]
```

Funzionalità:

* caricamento rosa
* caricamento formazione salvata
* titolari
* panchina
* capitano
* vice
* modulo
* salvataggio formazione

---

## Prossime attività

* Audit homepage
* Audit classifiche
* Verifica completa del flusso punteggi
* Consolidamento documentazione tecnica
* Revisione architettura generale
