export default async function handler(req, res) {

  try {

    const response = await fetch(
      'https://www.digitalcombatsimulator.com/en/news/newsletters/'
    );

    const html = await response.text();

    // prende ultimi link newsletter
    const matches = [
      ...html.matchAll(
        /href="(\/en\/news\/newsletters\/[^"]+)"/g
      )
    ];

    const uniqueLinks = [...new Set(
      matches.map(m => m[1])
    )].slice(0, 3);

    const news = await Promise.all(
      uniqueLinks.map(async (path) => {

        const url =
          `https://www.digitalcombatsimulator.com${path}`;

        const pageResponse = await fetch(url);

        const pageHtml = await pageResponse.text();

        // titolo
        const titleMatch =
          pageHtml.match(/<title>(.*?)<\/title>/i);

        const title =
          titleMatch?.[1]
            ?.replace('Digital Combat Simulator |', '')
            ?.trim()
          || 'DCS Newsletter';

        // testo articolo grezzo
        const text =
          pageHtml
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 4000);

        return {
          title,
          url,
          rawText: text
        };

      })
    );

    res.status(200).json(news);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Errore caricamento newsletter'
    });

  }

}