/* Utility condivise per leggere un feed ICS (RFC 5545) pubblicato da
   uno script Google — usate sia da calendar-events.js (home) sia da
   calendar-full.js (pagina Calendario) per la fonte "JATF Events".
   Il prefisso "_" esclude questo file dal routing di Vercel: non è
   un endpoint, solo un modulo condiviso. */

function unfoldICS(text) {
  // Le righe continuano se iniziano con uno spazio o un tab.
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function unescapeICSText(value) {
  return String(value || '')
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseICSDate(value) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;

  const [, y, mo, d, hasTime, h, mi, s, isUTC] = m;

  if (!hasTime) {
    return { iso: new Date(Date.UTC(+y, +mo - 1, +d)).toISOString(), allDay: true };
  }

  const date = isUTC
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
    : new Date(+y, +mo - 1, +d, +h, +mi, +s);

  return { iso: date.toISOString(), allDay: false };
}

export function parseICS(text) {
  const lines = unfoldICS(text).split(/\r\n|\n|\r/);

  const events = [];
  let current = null;

  lines.forEach(line => {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      return;
    }

    if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
      return;
    }

    if (!current) return;

    const sep = line.indexOf(':');
    if (sep === -1) return;

    const left = line.slice(0, sep);
    const value = line.slice(sep + 1);
    const key = left.split(';')[0];

    if (key === 'SUMMARY') current.summary = unescapeICSText(value);
    else if (key === 'DESCRIPTION') current.description = unescapeICSText(value);
    else if (key === 'DTSTART') current.dtstart = parseICSDate(value);
    else if (key === 'DTEND') current.dtend = parseICSDate(value);
  });

  return events;
}

/*
 * Scarica e interpreta un feed ICS, restituendo gli eventi nello
 * stesso formato usato per le fonti Google Calendar, filtrati sulla
 * finestra temporale richiesta (timeMinMs/timeMaxMs in millisecondi).
 */
export async function fetchICSEvents(url, source, timeMinMs, timeMaxMs) {
  const response = await fetch(url, {
    headers: { 'Accept': 'text/calendar, text/plain, */*' }
  });

  if (!response.ok) {
    console.error(`Errore feed ICS ${source.name}:`, response.status);
    return [];
  }

  const text = await response.text();
  const parsed = parseICS(text);

  return parsed
    .filter(event => event.dtstart)
    .map(event => ({
      summary: event.summary || source.label,
      description: event.description || '',
      startValue: event.dtstart.iso,
      endValue: event.dtend ? event.dtend.iso : event.dtstart.iso,
      allDay: event.dtstart.allDay,
      calendarLabel: source.label,
      serverName: source.server,
      calendarName: source.name
    }))
    .filter(event => {
      const t = new Date(event.startValue).getTime();
      return t >= timeMinMs && t <= timeMaxMs;
    });
}
