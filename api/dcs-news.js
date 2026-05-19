export default async function handler(req, res) {
  try {
    // Recupera lista newsletter
    const response = await fetch(
      "https://www.digitalcombatsimulator.com/en/news/newsletters/"
    );

    if (!response.ok) {
      throw new Error(`Errore pagina principale DCS: ${response.status}`);
    }

    const html = await response.text();

    // Trova link newsletter
    const matches = [
      ...html.matchAll(/href="(\/en\/news\/newsletters\/[^"]+)"/g)
    ];

    const uniqueLinks = [...new Set(matches.map(m => m[1]))].slice(0, 3);

    // Elabora newsletter
    const news = await Promise.all(
      uniqueLinks.map(async (path) => {
        try {
          const url = `https://www.digitalcombatsimulator.com${path}`;

          const pageResponse = await fetch(url);

          if (!pageResponse.ok) {
            throw new Error(`Errore pagina newsletter: ${pageResponse.status}`);
          }

          const pageHtml = await pageResponse.text();

          // Titolo
          const titleMatch = pageHtml.match(/<title>(.*?)<\/title>/i);

          const title =
            titleMatch?.[1]
              ?.replace("Digital Combat Simulator |", "")
              ?.trim() || "DCS Newsletter";

          // Data rilascio
          const dateMatch = pageHtml.match(
            /(\w+\s\d{1,2},\s\d{4})/
          );

          const releaseDate =
            dateMatch?.[1] || "Data non disponibile";

          // Pulizia HTML
          const cleanText = pageHtml
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&rsquo;/g, "'")
            .replace(/&lsquo;/g, "'")
            .replace(/&ndash;/g, "-")
            .replace(/&amp;/g, "&")
            .replace(/\s+/g, " ")
            .trim();

          // Intro newsletter
          const introMatch = cleanText.match(
            /Dear Fighter Pilots, Partners and Friends,(.*?)(Thank you for your passion and support\.|Yours sincerely,)/i
          );

          const introText = introMatch
            ? introMatch[1].trim()
            : cleanText.slice(0, 2000);

          let summary = "Riassunto non disponibile.";

          // OpenAI summary
          try {
            const aiResponse = await fetch(
              "https://api.openai.com/v1/responses",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                  model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
                  input: `Data di rilascio della newsletter: ${releaseDate}.

Traduci e riassumi in italiano questa newsletter DCS/Eagle Dynamics in massimo 2 frasi.
Includi la data di rilascio nel testo finale.
Mantieni nomi tecnici, moduli e velivoli originali. Non inventare nulla.

${introText.slice(0, 2500)}`
                })
              }
            );

            const aiData = await aiResponse.json();

            if (aiResponse.ok) {
              summary =
                aiData.output_text ||
                aiData.output?.[0]?.content?.[0]?.text ||
                aiData.output?.[1]?.content?.[0]?.text ||
                summary;
            } else {
              console.error("OPENAI ERROR:", aiData);

              summary = `Newsletter pubblicata il ${releaseDate}. Riassunto AI non disponibile.`;
            }

          } catch (aiError) {
            console.error("OPENAI FETCH ERROR:", aiError);

            summary = `Newsletter pubblicata il ${releaseDate}. Riassunto AI non disponibile.`;
          }

          return {
            title,
            url,
            releaseDate,
            summary
          };

        } catch (singleError) {
          console.error("NEWSLETTER ERROR:", singleError);

          return {
            title: "Newsletter non disponibile",
            url: "",
            releaseDate: "",
            summary: "Errore caricamento newsletter."
          };
        }
      })
    );

    // Cache
    res.setHeader(
      "Cache-Control",
      "s-maxage=21600, stale-while-revalidate=86400"
    );

    // Output JSON
    res.status(200).json(news);

  } catch (error) {
    console.error("DCS NEWS ERROR:", error);

    res.status(500).json({
      error: "Errore caricamento newsletter",
      details: error.message
    });
  }
}