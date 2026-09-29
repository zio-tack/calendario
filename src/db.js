import Dexie from 'dexie';

// Database locale nel browser (IndexedDB): persistente e senza server.
export const db = new Dexie('calendario');
db.version(1).stores({ events: '++id' }); // solo l'id e' indicizzato, il resto e' libero

// Salva un evento. form = {title,color,date,startTime,endTime,rule}
// occ   = occorrenza modificata (null se nuovo evento)
// scope = 'one' (solo questa occorrenza) | 'all' (tutta la serie)
export async function saveEvent(form, occ, scope) {
  const data = { title: form.title, color: form.color, startTime: form.startTime, endTime: form.endTime };
  if (!occ) return db.events.add({ ...data, date: form.date, rule: form.rule, exceptions: {} });

  const ev = await db.events.get(occ.eventId);
  if (ev.rule && scope === 'one') {
    // eccezione: si memorizza solo cio' che cambia per QUELLA data
    ev.exceptions[occ.origDate] = { ...data, date: form.date };
  } else {
    Object.assign(ev, data, { rule: form.rule });
    if (!occ.recurring) ev.date = form.date;         // la data base di una serie non si sposta
  }
  return db.events.put(ev);
}

export async function deleteEvent(occ, scope) {
  const ev = await db.events.get(occ.eventId);
  if (ev.rule && scope === 'one') {
    ev.exceptions[occ.origDate] = null;              // cancella solo questa occorrenza
    return db.events.put(ev);
  }
  return db.events.delete(ev.id);                    // evento singolo o intera serie
}

// ---- Export / import: un unico file JSON da copiare sull'altro dispositivo
export async function exportData() {
  const events = await db.events.toArray();
  const blob = new Blob([JSON.stringify({ version: 1, events }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `calendario-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Sostituisce TUTTI i dati locali con quelli del file
export async function importData(file) {
  const data = JSON.parse(await file.text());
  if (!Array.isArray(data.events)) throw new Error('File non valido');
  await db.transaction('rw', db.events, async () => {
    await db.events.clear();
    await db.events.bulkPut(data.events);            // mantiene gli id originali
  });
}
