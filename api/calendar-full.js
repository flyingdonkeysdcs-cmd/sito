/* Stessi dati di /api/calendar-events, ma per la pagina Calendario:
   finestra temporale piu' ampia (passato recente + prossimi mesi) e
   solo i calendari "Flying Donkeys Events" e "JATF". Endpoint separato
   per non toccare /api/calendar-events, da cui dipende la card
   "Prossimo evento" in home (che si aspetta solo eventi futuri). */

const calendars = [
  {
    name: "Flying Donkeys Events",
    id: "flyingdonkeysdcs@gmail.com",
    label: "Evento Flying Donkeys",
    server: "Server Flying Donkeys"
  },
  {
    name: "JATF",
    id: "609e54e597d66d5d7ba5605cdde4840b0218a70d2118bcc89b735094d6ff62ba@group.calendar.google.com",
    label: "Evento JATF",
    server: "Server JATF"
  }
];

export default async function handler(req, res) {

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {

    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

    if (!apiKey) {
      throw new Error('GOOGLE_CALENDAR_API_KEY mancante');
    }

    const now = Date.now();
    const timeMin = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();  // 60 giorni fa
    const timeMax = new Date(now + 240 * 24 * 60 * 60 * 1000).toISOString(); // 240 giorni avanti

    const results = await Promise.all(
      calendars.map(async calendar => {

        try {

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
            `${encodeURIComponent(calendar.id)}/events?${params.toString()}`;

          const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Errore Google Calendar ${calendar.name}:`, response.status, errorText);
            return [];
          }

          const data = await response.json();

          return (data.items || [])
            .map(event => {
              const startValue = event.start?.dateTime || event.start?.date || '';
              const endValue = event.end?.dateTime || event.end?.date || '';

              return {
                summary: String(event.summary || calendar.label),
                description: String(event.description || ''),
                startValue,
                endValue,
                allDay: !event.start?.dateTime,
                calendarLabel: calendar.label,
                serverName: calendar.server,
                calendarName: calendar.name
              };
            })
            .filter(event => event.startValue);

        } catch (calendarError) {
          console.error(`Errore calendario ${calendar.name}:`, calendarError);
          return [];
        }

      })
    );

    const events = results
      .flat()
      .sort((a, b) => new Date(a.startValue) - new Date(b.startValue));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');

    return res.status(200).json(events);

  } catch (error) {
    console.error('CALENDAR FULL ERROR:', error);
    return res.status(500).json({ error: 'Errore caricamento calendario' });
  }
}
