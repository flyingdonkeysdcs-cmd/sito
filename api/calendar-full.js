/* Dati per la pagina Calendario: eventi di "Flying Donkeys Events"
   (Google Calendar, stessa fonte gia' usata per la card "Prossimo
   evento" in home) e di "JATF Events" (un feed ICS pubblicato da uno
   script Google, non un calendario Google interrogabile con l'API).
   Endpoint separato da /api/calendar-events per non toccarlo (da cui
   dipende la card "Prossimo evento" in home, che si aspetta solo
   eventi futuri in un elenco corto). */

const GOOGLE_CALENDAR_SOURCE = {
  name: "Flying Donkeys Events",
  id: "flyingdonkeysdcs@gmail.com",
  label: "Evento Flying Donkeys",
  server: "Server Flying Donkeys"
};

const JATF_ICS_URL =
  "https://script.google.com/macros/s/AKfycbzTI3mC7yHBmLbHRVCEqlwhKm7PWls_rTqBuWteNSK3JM5VnN9ram8RHmo-WEFlkkXo6g/exec?ics=all";

const JATF_SOURCE = {
  name: "JATF Events",
  label: "Evento JATF",
  server: "Server JATF"
};


/* ----------------------------------------------------------
   Parser ICS minimale (RFC 5545): quanto basta per SUMMARY,
   DESCRIPTION, DTSTART, DTEND. Nessuna libreria esterna.
   ---------------------------------------------------------- */

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

function parseICS(text) {
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


async function fetchJatfEvents(timeMinMs, timeMaxMs) {
  const response = await fetch(JATF_ICS_URL, {
    headers: { 'Accept': 'text/calendar, text/plain, */*' }
  });

  if (!response.ok) {
    console.error('Errore feed ICS JATF Events:', response.status);
    return [];
  }

  const text = await response.text();
  const parsed = parseICS(text);

  return parsed
    .filter(event => event.dtstart)
    .map(event => ({
      summary: event.summary || JATF_SOURCE.label,
      description: event.description || '',
      startValue: event.dtstart.iso,
      endValue: event.dtend ? event.dtend.iso : event.dtstart.iso,
      allDay: event.dtstart.allDay,
      calendarLabel: JATF_SOURCE.label,
      serverName: JATF_SOURCE.server,
      calendarName: JATF_SOURCE.name
    }))
    .filter(event => {
      const t = new Date(event.startValue).getTime();
      return t >= timeMinMs && t <= timeMaxMs;
    });
}


async function fetchGoogleCalendarEvents(timeMin, timeMax) {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_CALENDAR_API_KEY mancante');

  const params = new URLSearchParams({
    key: apiKey,
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250'
  });

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/` +
    `${encodeURIComponent(GOOGLE_CALENDAR_SOURCE.id)}/events?${params.toString()}`;

  const response = await fetch(url, { headers: { 'Accept': 'application/json' } });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Errore Google Calendar ${GOOGLE_CALENDAR_SOURCE.name}:`, response.status, errorText);
    return [];
  }

  const data = await response.json();

  return (data.items || [])
    .map(event => {
      const startValue = event.start?.dateTime || event.start?.date || '';
      const endValue = event.end?.dateTime || event.end?.date || '';

      return {
        summary: String(event.summary || GOOGLE_CALENDAR_SOURCE.label),
        description: String(event.description || ''),
        startValue,
        endValue,
        allDay: !event.start?.dateTime,
        calendarLabel: GOOGLE_CALENDAR_SOURCE.label,
        serverName: GOOGLE_CALENDAR_SOURCE.server,
        calendarName: GOOGLE_CALENDAR_SOURCE.name
      };
    })
    .filter(event => event.startValue);
}


export default async function handler(req, res) {

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    const now = Date.now();
    const timeMinMs = now - 60 * 24 * 60 * 60 * 1000;  // 60 giorni fa
    const timeMaxMs = now + 240 * 24 * 60 * 60 * 1000; // 240 giorni avanti

    const timeMin = new Date(timeMinMs).toISOString();
    const timeMax = new Date(timeMaxMs).toISOString();

    const [googleEvents, jatfEvents] = await Promise.all([
      fetchGoogleCalendarEvents(timeMin, timeMax).catch(error => {
        console.error('Errore calendario Flying Donkeys Events:', error);
        return [];
      }),
      fetchJatfEvents(timeMinMs, timeMaxMs).catch(error => {
        console.error('Errore calendario JATF Events:', error);
        return [];
      })
    ]);

    const events = [...googleEvents, ...jatfEvents]
      .sort((a, b) => new Date(a.startValue) - new Date(b.startValue));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');

    return res.status(200).json(events);

  } catch (error) {
    console.error('CALENDAR FULL ERROR:', error);
    return res.status(500).json({ error: 'Errore caricamento calendario' });
  }
}
