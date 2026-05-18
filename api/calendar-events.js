const calendars = [
  {
    name: "Flying Donkeys",
    id: "910d7da6fd44cf9672d6f950c3056f3cf87b33512e902113d9fe82e836adf404@group.calendar.google.com",
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
  try {
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

    if (!apiKey) {
      throw new Error("GOOGLE_CALENDAR_API_KEY mancante");
    }

    const now = new Date().toISOString();

    const results = await Promise.all(
      calendars.map(async calendar => {
        const url =
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events` +
          `?key=${apiKey}` +
          `&timeMin=${now}` +
          `&singleEvents=true` +
          `&orderBy=startTime` +
          `&maxResults=10`;

        const response = await fetch(url);

        if (!response.ok) {
          const errorText = await response.text();
			throw new Error(`Errore calendario ${calendar.name}: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        return (data.items || []).map(event => ({
          ...event,
          calendarLabel: calendar.label,
          serverName: calendar.server,
          calendarName: calendar.name
        }));
      })
    );

    const events = results
      .flat()
      .map(event => {
        const startValue = event.start.dateTime || event.start.date;

        return {
          ...event,
          startValue,
          startDate: new Date(startValue)
        };
      })
      .sort((a, b) => a.startDate - b.startDate);

    res.setHeader(
      "Cache-Control",
      "s-maxage=300, stale-while-revalidate=900"
    );

    res.status(200).json(events);
  } catch (error) {
    console.error("CALENDAR ERROR:", error);

    res.status(500).json({
      error: "Errore caricamento calendario",
      details: error.message
    });
  }
}