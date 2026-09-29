// Valori di default: usati se public/config.json manca o non e' leggibile.
// slotDuration accetta "00:15:00", "00:30:00", "01:00:00"...
export const DEFAULT_CONFIG = {
  slotDuration: '00:05:00',
  slotMinTime: '06:00:00',
  slotMaxTime: '22:00:00',
  firstDay: 1, // 1 = lunedì
  defaultColor: '#1f6f8b',
};
