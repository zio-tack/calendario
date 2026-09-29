// Modello evento salvato nel DB:
// { id, title, color, date:'YYYY-MM-DD', startTime:'HH:mm', endTime:'HH:mm',
//   rule: null | { freq:'daily'|'weekly'|'monthly', interval:1, until:'YYYY-MM-DD'|null, byDay:[0..6] },
//   exceptions: { 'YYYY-MM-DD': null | {title,color,date,startTime,endTime} } }
//
// exceptions e' la chiave per le eccezioni: la chiave e' la data ORIGINALE dell'occorrenza.
//   null    -> quell'occorrenza e' cancellata
//   {...}   -> quell'occorrenza e' modificata (anche spostata ad un altro giorno)
// Le altre occorrenze della serie non vengono toccate.

export const pad = n => String(n).padStart(2, '0');
export const toDateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Differenza in giorni (Math.round assorbe le ore legali di 23/25 ore)
const diffDays = (a, b) => Math.round((b - a) / 86400000);

// La data 'd' e' un'occorrenza valida della regola? (start = data del primo evento)
function matches(rule, start, d) {
  const n = diffDays(start, d);
  if (n < 0) return false;
  const every = rule.interval || 1;
  if (rule.freq === 'daily') return n % every === 0;
  if (rule.freq === 'weekly') {
    const offset = (start.getDay() + 6) % 7;           // settimane che iniziano di lunedi'
    const week = Math.floor((n + offset) / 7);
    const days = rule.byDay?.length ? rule.byDay : [start.getDay()];
    return week % every === 0 && days.includes(d.getDay());
  }
  if (rule.freq === 'monthly') {
    const months = (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth();
    return d.getDate() === start.getDate() && months % every === 0;
  }
  return false;
}

// Trasforma un evento in una lista di occorrenze comprese in [from, to) (Date)
export function expandEvent(ev, from, to) {
  const out = [];
  const make = (origDate, o) => out.push({
    eventId: ev.id, origDate, recurring: !!ev.rule, rule: ev.rule,
    title: ev.title, color: ev.color, date: origDate, startTime: ev.startTime, endTime: ev.endTime, ...o,
  });

  if (!ev.rule) {                                    // evento singolo
    const d = parseDate(ev.date);
    if (d >= from && d < to) make(ev.date, {});
    return out;
  }

  const start = parseDate(ev.date);
  let end = to;                                      // fine = fine intervallo o data "until"
  if (ev.rule.until) { const u = addDays(parseDate(ev.rule.until), 1); if (u < end) end = u; }

  for (let d = start > from ? start : from; d < end; d = addDays(d, 1)) {
    if (!matches(ev.rule, start, d)) continue;
    const key = toDateStr(d);
    const ex = ev.exceptions?.[key];
    if (ex === null) continue;                       // occorrenza cancellata
    make(key, ex || {});                             // originale oppure modificata
  }
  return out;
}

export const durationMin = o => toMin(o.endTime) - toMin(o.startTime);
