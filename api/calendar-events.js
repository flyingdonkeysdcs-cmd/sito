const calendars = [
  {
    name: "Flying Donkeys",
    id: "910d7da6fd44cf9672d6f950c3056f3cf87b33512e902113d9fe82e836adf404@group.calendar.google.com",
    label: "Evento Flying Donkeys",
    server: "Server Flying Donkeys"
  },
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

  // L'endpoint serve soltanto lettura dati.
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      error: 'Metodo non consentito'
    });
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {

    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

    if (!apiKey) {
      throw new Error('GOOGLE_CALENDAR_API_KEY mancante');
    }

    const now = new Date().toISOString();

    const results = await Promise.all(
      calendars.map(async calendar => {

        try {

          const params = new URLSearchParams({
            key: apiKey,
            timeMin: now,
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '10'
          });

          const url =
            `https://www.googleapis.com/calendar/v3/calendars/` +
            `${encodeURIComponent(calendar.id)}/events?${params.toString()}`;

          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json'
            }
          });

          if (!response.ok) {

            const errorText = await response.text();

            // Dettagli disponibili soltanto nei log Vercel
            console.error(
              `Errore Google Calendar ${calendar.name}:`,
              response.status,
              errorText
            );

            return [];
          }

          const data = await response.json();

          return (data.items || [])
            .map(event => {

              const startValue =
                event.start?.dateTime ||
                event.start?.date ||
                '';

              // Mandiamo al browser SOLO i dati necessari
              return {
                summary:
                  String(event.summary || calendar.label),

                description:
                  String(event.description || ''),

                startValue,

                calendarLabel:
                  calendar.label,

                serverName:
                  calendar.server,

                calendarName:
                  calendar.name
              };

            })
            .filter(event => event.startValue);

        } catch (calendarError) {

          console.error(
            `Errore calendario ${calendar.name}:`,
            calendarError
          );

          // Un calendario guasto non blocca gli altri
          return [];
        }

      })
    );

    const events = results
      .flat()
      .sort(
        (a, b) =>
          new Date(a.startValue) -
          new Date(b.startValue)
      );

    res.setHeader(
      'Cache-Control',
      's-maxage=300, stale-while-revalidate=900'
    );

    return res.status(200).json(events);

  } catch (error) {

    console.error(
      'CALENDAR ERROR:',
      error
    );

    // Nessun dettaglio interno inviato al browser
    return res.status(500).json({
      error: 'Errore caricamento calendario'
    });

  }
}
