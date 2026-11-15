/* Dati per la pagina Calendario: eventi di "Flying Donkeys Events"
   (Google Calendar, stessa fonte gia' usata per la card "Prossimo
   evento" in home) e di "JATF Events" (un feed ICS pubblicato da uno
   script Google, non un calendario Google interrogabile con l'API).
   Endpoint separato da /api/calendar-events per non toccarlo (da cui
   dipende la card "Prossimo evento" in home, che si aspetta solo
   eventi futuri in un elenco corto). */

import { fetchICSEvents } from './_ics-utils.js';

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
      fetchICSEvents(JATF_ICS_URL, JATF_SOURCE, timeMinMs, timeMaxMs).catch(error => {
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
