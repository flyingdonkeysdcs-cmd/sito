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

        const introMatch = cleanText.match(
          /Dear Fighter Pilots, Partners and Friends,(.*?)(Thank you for your passion and support\.|Yours sincerely,)/i
        );

        const introText = introMatch
          ? introMatch[1].trim()
          : cleanText.slice(0, 1200);

        let shortEnglish = introText
			.split(/(?<=[.!?])\s+/)
			.filter(Boolean)
			.slice(0, 3)
			.join(' ');

			if (shortEnglish.length > 480) {
				shortEnglish = shortEnglish.slice(0, 477).trim() + '...';
		}

        const translateUrl =
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(shortEnglish)}&langpair=en|it`;

        const translateResponse = await fetch(translateUrl);
        const translateData = await translateResponse.json();

        const translatedText =
          translateData.responseData?.translatedText || shortEnglish;

        return {
          title,
          url,
          summary: translatedText
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