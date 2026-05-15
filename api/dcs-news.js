export default async function handler(req, res) {
  try {
    const response = await fetch(
      'https://www.digitalcombatsimulator.com/en/news/newsletters/'
    );

    const html = await response.text();

    const matches = [
      ...html.matchAll(/href="(\/en\/news\/newsletters\/[^"]+)"/g)
    ];

    const uniqueLinks = [...new Set(matches.map(m => m[1]))].slice(0, 3);

    const news = await Promise.all(
      uniqueLinks.map(async (path) => {
        const url = `https://www.digitalcombatsimulator.com${path}`;

        const pageResponse = await fetch(url);
        const pageHtml = await pageResponse.text();

        const titleMatch = pageHtml.match(/<title>(.*?)<\/title>/i);

        const title =
          titleMatch?.[1]
            ?.replace('Digital Combat Simulator |', '')
            ?.trim() || 'DCS Newsletter';

        const text = pageHtml
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 5000);

        const aiResponse = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            input: `
Riassumi in italiano questa newsletter Eagle Dynamics in massimo 3 righe.
Stile: chiaro, breve, adatto a una community italiana di DCS.
Non aggiungere titoli, emoji o markdown.

NEWSLETTER:
${text}
`
          })
        });

        const aiData = await aiResponse.json();

        const summary =
          aiData.output_text ||
          'Riassunto non disponibile al momento.';

        return {
          title,
          url,
          summary
        };
      })
    );

    res.setHeader(
      'Cache-Control',
      's-maxage=21600, stale-while-revalidate=86400'
    );

    res.status(200).json(news);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Errore caricamento newsletter'
    });
  }
}