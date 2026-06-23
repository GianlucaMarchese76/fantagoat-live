# FantaGOAT Live - Operatività

## Avvio locale

```bash
npm run dev
```

Applicazione disponibile su:

```txt
http://localhost:3000
```

---

# Import punteggi

Cartella:

```txt
data/punteggi/
```

Esempi:

```bash
npm run import-punteggi -- data/punteggi/G1AF.xlsx

npm run import-punteggi -- data/punteggi/G1GL.xlsx

npm run import-punteggi -- data/punteggi/G2AF.xlsx

npm run import-punteggi -- data/punteggi/G2GL.xlsx
```

Lo script:

* identifica giornata e blocco dal nome file
* cancella i dati esistenti
* importa i nuovi dati
* elimina duplicati

---

# Import gol decisivi

File:

```txt
data/punteggi/gol_decisivi.xlsx
```

Comando:

```bash
npm run import-gol-decisivi -- data/punteggi/gol_decisivi.xlsx
```

Formato Excel:

```txt
giornata
blocco
giocatore
nazionale
```

---

# Verifiche post-import

## Controllo punteggi

```sql
select
giornata,
blocco,
count(*)
from punteggi_giocatori
group by giornata, blocco
order by giornata, blocco;
```

---

## Controllo gol decisivi

```sql
select
giornata,
blocco,
count(*)
from gol_decisivi
group by giornata, blocco
order by giornata, blocco;
```

---

## Verifica bonus applicato

```sql
select
giocatore,
giornata,
blocco,
bonus_gol_decisivo
from v_formazioni_dettaglio_live
where bonus_gol_decisivo > 0;
```

---

# Aggiornamento dati standard

Ordine consigliato:

1. Import punteggi Gazzetta
2. Import gol decisivi
3. Verifica tabelle
4. Verifica view live
5. Verifica homepage
6. Verifica classifiche

---

# Git

Controllo modifiche:

```bash
git status
```

Aggiunta modifiche:

```bash
git add .
```

Commit:

```bash
git commit -m "Descrizione modifica"
```

Push:

```bash
git push
```

---

# Deploy

Il deploy viene effettuato tramite GitHub e Vercel.

Flusso:

```txt
Commit
↓
Push
↓
GitHub
↓
Vercel
↓
Produzione
```
