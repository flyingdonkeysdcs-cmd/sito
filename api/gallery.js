const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const galleryPath = path.join(
      process.cwd(),
      'images',
      'gallery'
    );

    const files = fs
      .readdirSync(galleryPath)
      .filter(file =>
        /\.(webp|jpg|jpeg|png)$/i.test(file)
      )
      .sort((a, b) =>
        a.localeCompare(b, undefined, {
          numeric: true,
          sensitivity: 'base'
        })
      );

    const images = files.map(file => ({
      src: `/images/gallery/${file}`,
      alt: `Flying Donkeys Gallery - ${file}`
    }));

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );

    res.status(200).json(images);

  } catch (error) {

    console.error('Gallery API error:', error);

    res.status(500).json({
      error: 'Unable to load gallery'
    });

  }
};
