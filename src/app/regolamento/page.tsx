export default function RegolamentoPage() {
  return (
    <main className="min-h-screen p-4 bg-slate-100">
      <a href="/" className="text-blue-600 text-sm">
        ← Home
      </a>

      <h1 className="text-4xl font-bold mt-5 mb-3">
        Regolamento FantaGOAT2026
      </h1>

      <section className="bg-white rounded-2xl shadow p-4 space-y-5">
        <p>
          Per quanto non espressamente previsto dal presente regolamento,
          si applica il regolamento Fantacampionato Gazzetta.
        </p>

        <a
          href="/regolamento-gazzetta-mondiale-2026.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 font-semibold block"
        >
          → Regolamento Fantacampionato Gazzetta
        </a>

        <h2 className="text-2xl font-bold">1. Fase a gironi</h2>
        <p>
          Ogni partecipante dispone di una rosa AF e di una rosa GL. Ogni
          rosa è composta da 26 giocatori, con budget massimo 520 crediti
          e massimo 3 giocatori per nazionale. Le rose restano invariate
          per tutta la fase a gironi.
        </p>

        <h2 className="text-2xl font-bold">2. Formazioni</h2>
        <p>
          Le formazioni, composte da 11 titolari e 15 panchinari, devono
          essere salvate entro cinque minuti prima dell’inizio della prima
          partita di ciascun turno di gioco.
        </p>

        <h2 className="text-2xl font-bold">3. Sostituzioni</h2>
        <p>
          Sono consentite fino a 5 sostituzioni automatiche. Le
          sostituzioni seguono l’ordine delle riserve indicato dal
          partecipante. Entra il primo giocatore con voto che consente di
          schierare un modulo valido. Se non è possibile schierare 11
          giocatori in un modulo valido, ogni posto residuo viene coperto
          con un 4 d’ufficio.
        </p>

        <h2 className="text-2xl font-bold">4. Capitano e Vicecapitano</h2>
        <p>
          Il voto in pagella del Capitano viene modificato raddoppiando il
          suo scostamento dal 6. La regola si applica solo al voto in
          pagella, non ai bonus o malus. Esempi: 8→10, 7→8, 6→6, 5→4,
          4,5→3. Il Vicecapitano subentra se il Capitano non ottiene voto
          o non entra nella formazione finale.
        </p>

        <h2 className="text-2xl font-bold">5. Gol decisivi</h2>
        <p>
          Gol decisivo: +1. Il bonus viene assegnato, per ogni partita,
          all’eventuale gol che dirime l’ultima situazione di parità del
          match. Esempio: da 1-1 a 2-1, poi 4-1 e infine 4-3, il gol
          decisivo è il 2-1.
        </p>

        <h2 className="text-2xl font-bold">6. Modulo</h2>
        <p>
          I moduli con 5 difensori o 5 centrocampisti assegnano un +2
          d’ufficio. I moduli con 3 attaccanti assegnano un -1 d’ufficio.
        </p>

        <h2 className="text-2xl font-bold">7. Modificatore Difesa</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Media &lt; 6,00: 0</li>
          <li>6,00 - 6,24: +1</li>
          <li>6,25 - 6,49: +2</li>
          <li>6,50 - 6,74: +3</li>
          <li>6,75 - 6,99: +4</li>
          <li>Media ≥ 7,00: +5</li>
        </ul>

        <h2 className="text-2xl font-bold">8. Modificatore Centrocampo</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Media &lt; 6,25: 0</li>
          <li>6,25 - 6,49: +1</li>
          <li>6,50 - 6,74: +2</li>
          <li>Media ≥ 6,75: +3</li>
        </ul>

        <h2 className="text-2xl font-bold">
          9. Fase a eliminazione diretta
        </h2>
        <p>
          Al termine dei gironi le rose vengono azzerate e ricostruite
          sulla base di istruzioni comunicate in seguito. I punti della
          fase a gironi restano acquisiti.
        </p>

        <ul className="list-disc pl-5 space-y-1">
          <li>Sedicesimi AF e GL: x1,2</li>
          <li>Ottavi: x1,4</li>
          <li>Quarti: x1,6</li>
          <li>Semifinali: x1,8</li>
          <li>Terzo posto: x1,2</li>
          <li>Finale: x2</li>
        </ul>
      </section>
    </main>
  );
}