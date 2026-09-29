import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from './db';
import { expandEvent, parseDate, addDays, toDateStr, durationMin, pad } from './recurrence';

const hm = min => `${Math.floor(min / 60)}h ${pad(min % 60)}m`;   // 135 -> "2h 15m"

// Chiave di raggruppamento: giorno, settimana (lunedi' di riferimento) o mese
function keyOf(date, group) {
  if (group === 'day') return date;
  const d = parseDate(date);
  if (group === 'month') return date.slice(0, 7);
  return 'Sett. dal ' + toDateStr(addDays(d, -((d.getDay() + 6) % 7)));
}

export default function Report() {
  const now = new Date();
  const [from, setFrom] = useState(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  const [group, setGroup] = useState('day');
  const [data, setData] = useState({ byPeriod: [], byTitle: [], total: 0 });

  // Ricalcola ogni volta che cambiano i filtri: espande gli eventi nell'intervallo e somma i minuti
  useEffect(() => {
    (async () => {
      const all = await db.events.toArray();
      const occ = all.flatMap(e => expandEvent(e, parseDate(from), addDays(parseDate(to), 1)));
      const sum = (keyFn) => {
        const m = new Map();
        occ.forEach(o => m.set(keyFn(o), (m.get(keyFn(o)) || 0) + durationMin(o)));
        return [...m].sort((a, b) => a[0].localeCompare(b[0]));
      };
      setData({
        byPeriod: sum(o => keyOf(o.date, group)),
        byTitle: sum(o => o.title),
        total: occ.reduce((s, o) => s + durationMin(o), 0),
      });
    })();
  }, [from, to, group]);

  const pdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Report minutaggio', 14, 18);
    doc.setFontSize(10); doc.text(`Dal ${from} al ${to} - Totale: ${hm(data.total)}`, 14, 25);
    autoTable(doc, { startY: 32, head: [['Periodo', 'Tempo']], body: data.byPeriod.map(([k, m]) => [k, hm(m)]) });
    autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [['Attivita', 'Tempo']], body: data.byTitle.map(([k, m]) => [k, hm(m)]) });
    doc.save(`report-${from}_${to}.pdf`);
  };

  const Table = ({ head, rows }) => (
    <table><thead><tr><th>{head}</th><th>Tempo</th></tr></thead>
      <tbody>{rows.map(([k, m]) => <tr key={k}><td>{k}</td><td>{hm(m)}</td></tr>)}</tbody></table>
  );

  return (
    <div className="report">
      <div className="filters">
        <label>Dal <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>Al <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <label>Raggruppa per
          <select value={group} onChange={e => setGroup(e.target.value)}>
            <option value="day">Giorno</option><option value="week">Settimana</option><option value="month">Mese</option>
          </select>
        </label>
        <button className="primary" onClick={pdf}>Scarica PDF</button>
      </div>
      <p className="total">Totale: <strong>{hm(data.total)}</strong></p>
      <Table head="Periodo" rows={data.byPeriod} />
      <Table head="Attivita" rows={data.byTitle} />
    </div>
  );
}
