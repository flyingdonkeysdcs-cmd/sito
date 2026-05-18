export default async function handler(req, res) {

        const releaseDate = dateMatch
          ? dateMatch[0]
          : "Data non disponibile";

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

        const aiResponse = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
            input:
              `La newsletter DCS è stata pubblicata il ${releaseDate}. ` +
              "Riassumi in italiano questa newsletter DCS/Eagle Dynamics in massimo 2 frasi. " +
              "Mantieni nomi tecnici, moduli e velivoli originali. Non inventare nulla.\n\n" +
              introText.slice(0, 2500)
          })
        });

        const aiData = await aiResponse.json();

        if (!aiResponse.ok) {
          throw new Error(aiData.error?.message || "Errore OpenAI");
        }

        const summary =
          aiData.output_text ||
          aiData.output?.[0]?.content?.[0]?.text ||
          aiData.output?.[1]?.content?.[0]?.text ||
          "Riassunto non disponibile.";

        return {
          title,
          url,
          releaseDate,
          summary
        };
      })
    );

    res.setHeader(
      "Cache-Control",
      "s-maxage=86400, stale-while-revalidate=172800"
    );

    res.status(200).json(news);
  } catch (error) {
    console.error("DCS NEWS ERROR:", error);

    res.status(500).json({
      error: "Errore caricamento newsletter",
      details: error.message
    });
  }
}