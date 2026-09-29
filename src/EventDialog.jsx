import { useState } from 'react';
import { parseDate, toMin } from './recurrence';

const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

// Finestra di creazione/modifica.
// occ = occorrenza esistente (null se nuovo). Se fa parte di una serie si sceglie l'ambito:
//   'one' = solo questa occorrenza (eccezione), 'all' = tutta la serie.
export default function EventDialog({ initial, occ, onSave, onDelete, onDuplicate, onClose }) {
  const [f, setF] = useState(initial);
  const [scope, setScope] = useState('one');
  const [freq, setFreq] = useState(initial.rule?.freq || 'none');
  const [every, setEvery] = useState(initial.rule?.interval || 1);
  const [until, setUntil] = useState(initial.rule?.until || '');
  const [byDay, setByDay] = useState(initial.rule?.byDay || [parseDate(initial.date).getDay()]);

  const inSeries = !!occ?.recurring;
  const editRule = !inSeries || scope === 'all';       // la regola si cambia solo su tutta la serie
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const toggleDay = d => setByDay(byDay.includes(d) ? byDay.filter(x => x !== d) : [...byDay, d]);

  const submit = e => {
    e.preventDefault();
    if (toMin(f.endTime) <= toMin(f.startTime)) return alert('L\'orario di fine deve seguire quello di inizio.');
    const rule = freq === 'none' ? null : {
      freq, interval: Number(every) || 1, until: until || null,
      byDay: freq === 'weekly' ? byDay : undefined,
    };
    // Per un evento non in serie l'ambito e' sempre 'all'
    onSave({ ...f, title: f.title.trim() || '(senza titolo)', rule: editRule ? rule : occ.rule }, inSeries ? scope : 'all');
  };

  const del = () => {
    if (window.confirm('Eliminare?')) onDelete(inSeries ? scope : 'all');
  };

  return (
    <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="dialog" onSubmit={submit}>
        <h2>{occ ? 'Modifica evento' : 'Nuovo evento'}</h2>

        {inSeries && (
          <fieldset>
            <legend>Si applica a</legend>
            <label><input type="radio" checked={scope === 'one'} onChange={() => setScope('one')} /> Solo questa occorrenza</label>
            <label><input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} /> Tutta la serie</label>
          </fieldset>
        )}

        <label>Titolo <input value={f.title} onChange={set('title')} autoFocus /></label>
        <label>Colore <input type="color" value={f.color} onChange={set('color')} /></label>
        <label>Data <input type="date" required value={f.date} onChange={set('date')} disabled={inSeries && scope === 'all'} /></label>
        <div className="row">
          <label>Inizio <input type="time" required value={f.startTime} onChange={set('startTime')} /></label>
          <label>Fine <input type="time" required value={f.endTime} onChange={set('endTime')} /></label>
        </div>

        {editRule && (
          <>
            <label>Ripetizione
              <select value={freq} onChange={e => setFreq(e.target.value)}>
                <option value="none">Nessuna</option>
                <option value="daily">Ogni giorno</option>
                <option value="weekly">Ogni settimana</option>
                <option value="monthly">Ogni mese</option>
              </select>
            </label>
            {freq !== 'none' && (
              <>
                <div className="row">
                  <label>Ogni <input type="number" min="1" value={every} onChange={e => setEvery(e.target.value)} /></label>
                  <label>Fino al <input type="date" value={until} onChange={e => setUntil(e.target.value)} /></label>
                </div>
                {freq === 'weekly' && (
                  <div className="days">
                    {GIORNI.map((g, i) => (
                      <label key={i}><input type="checkbox" checked={byDay.includes(i)} onChange={() => toggleDay(i)} />{g}</label>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        <div className="actions">
          {occ && <button type="button" className="danger" onClick={del}>Elimina</button>}
          {occ && <button type="button" onClick={() => onDuplicate({ ...f, rule: null })}>Duplica</button>}
          <div className="spacer" />
          <button type="button" onClick={onClose}>Annulla</button>
          <button type="submit" className="primary">Salva</button>
        </div>
      </form>
    </div>
  );
}
