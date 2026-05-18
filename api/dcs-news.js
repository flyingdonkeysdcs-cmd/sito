import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  try {

    // Pagina newsletter DCS
    const response = await fetch(
      'https://www.digitalcombatsimulator.com/en/news/newsletters/'
    );

    const html = await response.text();

    // Estrae i link newsletter
    const matches = [
      ...html.matchAll(/href="(\/en\/news\/newsletters\/[^"]+)"/g)
    ];

    const uniqueLinks = [
      ...new Set(matches.map(m => m[1]))
    ].slice(0, 3);

    const news = await Promise.all(

      uniqueLinks.map(async (path) => {

        const url =
          `https://www.digitalcombatsimulator.com${path}`;

        const pageResponse = await fetch(url);

        const pageHtml = await pageResponse.text();

        // Titolo pagina
        const titleMatch =
          pageHtml.match(/<title>(.*?)<\/title>/i);

        const title =
          titleMatch?.[1]
            ?.replace('Digital Combat Simulator |', '')
            ?.trim() || 'DCS Newsletter';

        // Pulisce HTML
        const cleanText = pageHtml
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&rsquo;/g, "'")
          .replace(/&lsquo;/g, "'")
          .replace(/&ndash;/g, '-')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();

        // Cerca intro newsletter
        const introMatch = cleanText.match(
          /Dear Fighter Pilots, Partners and Friends,(.*?)(Thank you for your passion and support\.|Yours sincerely,)/i
        );

        const introText = introMatch
          ? introMatch[1].trim()
          : cleanText.slice(0, 2000);

        // Limite sicurezza token
        const limitedText =
          introText.slice(0, 2500);

        // ===== OPENAI =====

        const completion =
          await openai.chat.completions.create({

            model:
              process.env.OPENAI_MODEL || "gpt-5.5",

            messages: [

              {
                role: "system",
                content: `
Sei il redattore del sito Flying Donkeys Virtual Squadron.

Genera un RIASSUNTO BREVE in italiano della newsletter Eagle Dynamics.

Regole:
- massimo 2 frasi
- tono naturale
- niente elenco puntato
- mantieni i nomi tecnici DCS
- non tradurre i nomi dei moduli
- non inventare nulla
                `
              },

              {
                role: "user",
                content: limitedText
              }

            ],

            temperature: 0.5,
            max_tokens: 120

          });

        const translatedSummary =
          completion.choices?.[0]?.message?.content?.trim()
          || "Riassunto non disponibile.";

        return {

          title,
          url,

          summary: translatedSummary

        };

      })

    );

    // Cache Vercel CDN
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