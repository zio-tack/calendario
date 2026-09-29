import { useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import itLocale from '@fullcalendar/core/locales/it';
import { db, saveEvent, deleteEvent, exportData, importData } from './db';
import { expandEvent, toDateStr, pad } from './recurrence';
import EventDialog from './EventDialog';
import Report from './Report';

const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Luminosita' relativa del colore (formula WCAG): 0 = nero, 1 = bianco
const luminance = hex => {
  const [r, g, b] = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const isLight = hex => luminance(hex) > 0.179;   // sopra la soglia il testo scuro contrasta meglio
const textOn = hex => (isLight(hex) ? '#000000' : '#ffffff');

export default function App({ config }) {
  const cal = useRef(null);
  const [tab, setTab] = useState('calendar');   // 'calendar' | 'report'
  const [dialog, setDialog] = useState(null);   // { occ, initial } quando la finestra e' aperta
  const refresh = () => cal.current?.getApi().refetchEvents();

  // FullCalendar chiama questa funzione ogni volta che cambia l'intervallo visibile.
  // Noi leggiamo gli eventi dal DB e li espandiamo in occorrenze per quell'intervallo.
  const loadEvents = async (info, ok, fail) => {
    try {
      const all = await db.events.toArray();
      const occ = all.flatMap(e => expandEvent(e, info.start, info.end));
      ok(occ.map(o => ({
        id: `${o.eventId}|${o.origDate}`, title: o.title,
        start: `${o.date}T${o.startTime}`, end: `${o.date}T${o.endTime}`,
        backgroundColor: o.color, borderColor: o.color,
        textColor: textOn(o.color),
        borderColor: o.color,
        classNames: isLight(o.color) ? ['evento-chiaro'] : [],
        extendedProps: { occ: o },               // teniamo l'occorrenza per click/drag
      })));
    } catch (e) { fail(e); }
  };

  // Click o trascinamento su celle vuote -> nuovo evento precompilato
  const onSelect = info => {
    const monthView = info.allDay;              // in vista mese non ci sono orari
    setDialog({ occ: null, initial: {
      title: '', color: config.defaultColor, date: toDateStr(info.start),
      startTime: monthView ? '09:00' : hhmm(info.start),
      endTime: monthView ? '10:00' : hhmm(info.end), rule: null,
    } });
    cal.current.getApi().unselect();
  };

  // Click su un evento esistente -> modifica
  const onEventClick = info => {
    const occ = info.event.extendedProps.occ;
    setDialog({ occ, initial: { title: occ.title, color: occ.color, date: occ.date,
      startTime: occ.startTime, endTime: occ.endTime, rule: occ.rule } });
  };

  // Trascinamento / ridimensionamento di un evento.
  // Per le serie modifichiamo solo QUELL'occorrenza (per la serie intera si usa la finestra).
  const onMove = async info => {
    const occ = info.event.extendedProps.occ;
    if (occ.recurring && !window.confirm('Modificare solo questa occorrenza?\n(Per cambiare tutta la serie apri l\'evento.)'))
      return info.revert();
    await saveEvent({ title: occ.title, color: occ.color, rule: occ.rule,
      date: toDateStr(info.event.start), startTime: hhmm(info.event.start), endTime: hhmm(info.event.end) },
      occ, 'one');
    refresh();
  };

  const onImport = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !window.confirm('L\'importazione sostituisce tutti i dati attuali. Continuare?')) return;
    try { await importData(file); refresh(); } catch (err) { alert('Importazione non riuscita: ' + err.message); }
  };

  return (
    <div className="app">
      <header>
        <h1>Calendario</h1>
        <nav>
          <button className={tab === 'calendar' ? 'on' : ''} onClick={() => setTab('calendar')}>Calendario</button>
          <button className={tab === 'report' ? 'on' : ''} onClick={() => setTab('report')}>Report</button>
        </nav>
        <div className="spacer" />
        <button onClick={exportData}>Esporta</button>
        <label className="btn">Importa<input type="file" accept="application/json" hidden onChange={onImport} /></label>
      </header>

      {tab === 'calendar' ? (
        <FullCalendar
          ref={cal}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={itLocale}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          firstDay={config.firstDay}
          slotDuration={config.slotDuration}     // dimensione degli slot (da config.json)
          snapDuration={config.slotDuration}     // il trascinamento "scatta" sugli slot
          slotMinTime={config.slotMinTime}
          slotMaxTime={config.slotMaxTime}
          nowIndicator
          views={{ dayGridMonth: { eventDisplay: 'block' } }}
          height="calc(100vh - 64px)"
          selectable editable                    // selectable = crea, editable = sposta/ridimensiona
          selectLongPressDelay={250}             // su touch: pressione lunga per selezionare
          eventLongPressDelay={250}              // su touch: pressione lunga per trascinare
          events={loadEvents}
          select={onSelect}
          eventClick={onEventClick}
          eventDrop={onMove}
          eventResize={onMove}
        />
      ) : <Report />}

      {dialog && (
        <EventDialog
          key={dialog.n}
          {...dialog}
          onClose={() => setDialog(null)}
          onDuplicate={form => setDialog({ occ: null, initial: form, n: Date.now() })}
          onSave={async (form, scope) => { await saveEvent(form, dialog.occ, scope); setDialog(null); refresh(); }}
          onDelete={async scope => { await deleteEvent(dialog.occ, scope); setDialog(null); refresh(); }}
        />
      )}
    </div>
  );
}
