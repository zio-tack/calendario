# Calendario PWA
PWA calendario per tenere traccia delle ore lavorate.

Avvio (Node 18+):

    npm install
    npm run dev        # sviluppo su http://localhost:5173
    npm run build      # produce dist/ da pubblicare

- `public/config.json`: durata slot, orario visibile, primo giorno (modificabile anche dopo la build).
- Dati: IndexedDB del browser. Usa "Esporta"/"Importa" per spostarli su un altro dispositivo.
- Android: pubblica `dist/` su un hosting HTTPS statico (GitHub Pages, Netlify...) e da Chrome scegli
  "Aggiungi a schermata Home". I dati restano sul dispositivo, non sul server.
  Nota: senza HTTPS il service worker non parte (fa eccezione solo localhost).

Struttura: `recurrence.js` (regole + eccezioni), `db.js` (salvataggio, export/import),
`App.jsx` (calendario), `EventDialog.jsx` (modifica), `Report.jsx` (report + PDF).
