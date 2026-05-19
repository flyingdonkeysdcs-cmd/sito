import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  const CACHE_KEY = "dcs-news-cache";

  try {
    const response = await fetch(
      "https://www.digitalcombatsimulator.com/en/news/newsletters/"
    );

    if (!response.ok) {
      throw new Error(`Errore pagina principale DCS: ${response.status}`);
    }

    const html = await response.text();

    const matches = [
      ...html.matchAll(/href="(\/en\/news\/newsletters\/[^"]+)"/g)
    ];

    const uniqueLinks = [...new Set(matches.map((m) => m[1]))].slice(0, 3);

    if (!uniqueLinks.length) {
      throw new Error("Nessuna newsletter trovata.");
    }

    const latestUrl = `https://www.digitalcombatsimulator.com${uniqueLinks[0]}`;

    const cached = await kv.get(CACHE_KEY);

    if (cached?.latestUrl === latestUrl && cached?.news?.length) {
      res.setHeader(
        "Cache-Control",
        "s-maxage=21600, stale-while-revalidate=86400"
      );

      return res.status(200).json(cached.news);
    }

    const news = await Promise.all(
      uniqueLinks.map(async (path) => {
        const url = `https://www.digitalcombatsimulator.com${path}`;

        const cachedItem = cached?.news?.find((item) => item.url === url);

        if (cachedItem) {
          return cachedItem;
        }

        try {
          const pageResponse = await fetch(url);

          if (!pageResponse.ok) {
            throw new Error(`Errore pagina newsletter: ${pageResponse.status}`);
          }

          const pageHtml = await pageResponse.text();

          const titleMatch = pageHtml.match(/<title>(.*?)<\/title>/i);

          const title =
            titleMatch?.[1]
              ?.replace("Digital Combat Simulator |", "")
              ?.trim() || "DCS Newsletter";

          const dateMatch =
			pageHtml.match(/<time[^>]*datetime="([^"]+)"/i) ||
			pageHtml.match(/datetime="([^"]+)"/i) ||
			pageHtml.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i) ||
			pageHtml.match(/([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);

			let releaseDate = "Data non disponibile";

			if (dateMatch?.[1]) {
				const rawDate = dateMatch[1];

				const parsedDate = new Date(rawDate);

				if (!Number.isNaN(parsedDate.getTime())) {
					releaseDate = parsedDate.toLocaleDateString("it-IT", {
					day: "2-digit",
					month: "long",
					year: "numeric"
				});
			} else {
			releaseDate = rawDate;
			}
		}

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

          const introMatch = cleanText.match(
            /Dear Fighter Pilots, Partners and Friends,(.*?)(Thank you for your passion and support\.|Yours sincerely,)/i
          );

          const introText = introMatch
            ? introMatch[1].trim()
            : cleanText.slice(0, 2000);

          let summary = `Newsletter pubblicata il ${releaseDate}. Riassunto non disponibile.`;

          if (process.env.OPENAI_API_KEY) {
            const aiResponse = await fetch("https://api.openai.com/v1/responses", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + process.env.OPENAI_API_KEY
              },
              body: JSON.stringify({
                model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
                input:
                  "Data di rilascio della newsletter: " + releaseDate + ".\n\n" +
                  "Traduci e riassumi in italiano questa newsletter DCS/Eagle Dynamics in massimo 2 frasi.\n" +
                  "Includi la data di rilascio nel testo finale.\n" +
                  "Mantieni nomi tecnici, moduli e velivoli originali. Non inventare nulla.\n\n" +
                  introText.slice(0, 2500)
              })
            });

            let aiData = {};

            try {
              aiData = await aiResponse.json();
            } catch (jsonError) {
              console.error("OPENAI JSON ERROR:", jsonError);
            }

            if (aiResponse.ok) {
              summary =
                aiData.output_text ||
                aiData.output?.[0]?.content?.[0]?.text ||
                aiData.output?.[1]?.content?.[0]?.text ||
                summary;
            } else {
              console.error("OPENAI ERROR:", aiData);
            }
          } else {
            console.error("OPENAI_API_KEY mancante.");
          }

          return {
            title,
            url,
            releaseDate,
            summary
          };
        } catch (singleError) {
          console.error("SINGLE NEWSLETTER ERROR:", singleError);

          return {
            title: "Newsletter non disponibile",
            url,
            releaseDate: "",
            summary: "Errore caricamento newsletter."
          };
        }
      })
    );

    await kv.set(CACHE_KEY, {
      latestUrl,
      updatedAt: new Date().toISOString(),
      news
    });

    res.setHeader(
      "Cache-Control",
      "s-maxage=21600, stale-while-revalidate=86400"
    );

    return res.status(200).json(news);
  } catch (error) {
    console.error("DCS NEWS ERROR:", error);

    return res.status(500).json({
      error: "Errore caricamento newsletter",
      details: error.message
    });
  }
}