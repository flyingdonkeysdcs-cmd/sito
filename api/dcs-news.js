export default async function handler(req, res) {

        const introText = introMatch
          ? introMatch[1].trim()
          : cleanText.slice(0, 2000);

        let summary = "Riassunto non disponibile.";

        try {
          const aiResponse = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
              input:
                `Data di rilascio della newsletter: ${releaseDate}.

` +
                "Traduci e riassumi in italiano questa newsletter DCS/Eagle Dynamics in massimo 2 frasi. " +
                "Includi la data di rilascio nel testo finale. " +
                "Mantieni nomi tecnici, moduli e velivoli originali. Non inventare nulla.\n\n" +
                introText.slice(0, 2500)
            })
          });

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