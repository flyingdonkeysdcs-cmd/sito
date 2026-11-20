/* ==========================================================
   /api/social-image?file=3.webp

   Restituisce una foto della galleria (images/gallery) convertita
   in JPEG, pronta per Instagram e Facebook.

   Serve perche' l'API di Instagram accetta solo JPEG, mentre la
   galleria del sito e' in .webp. La usa la pubblicazione automatica
   dei post (admin/AppsScript.gs, sezione "SOCIAL").

   Oltre al formato, sistema anche le proporzioni: Instagram rifiuta
   le foto piu' larghe di 1.91:1 o piu' strette di 4:5, quindi in
   quei casi la foto viene ritagliata al centro.
   ========================================================== */

const sharp = require('sharp');

const MAX_WIDTH = 1440;      // larghezza massima consigliata da Instagram
const MIN_RATIO = 4 / 5;     // verticale massimo
const MAX_RATIO = 1.91;      // orizzontale massimo

module.exports = async function handler(req, res) {
  const file = String((req.query && req.query.file) || '');

  // Solo nomi di file semplici dentro images/gallery: niente percorsi.
  if (!/^[\w.-]+\.(webp|jpe?g|png)$/i.test(file) || file.includes('..')) {
    res.status(400).json({ error: 'Parametro "file" non valido.' });
    return;
  }

  try {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const sourceUrl = `${proto}://${req.headers.host}/images/gallery/${encodeURIComponent(file)}`;

    const sourceResponse = await fetch(sourceUrl);
    if (!sourceResponse.ok) {
      res.status(404).json({ error: 'Foto non trovata: ' + file });
      return;
    }

    const input = Buffer.from(await sourceResponse.arrayBuffer());
    const meta = await sharp(input).metadata();

    let width = meta.width;
    let height = meta.height;
    const ratio = width / height;

    if (ratio > MAX_RATIO) width = Math.round(height * MAX_RATIO);
    if (ratio < MIN_RATIO) height = Math.round(width / MIN_RATIO);

    // Un solo resize (in sharp un secondo resize sostituisce il primo):
    // "cover" ritaglia al centro sulle nuove proporzioni e ridimensiona.
    if (width > MAX_WIDTH) {
      height = Math.round(height * MAX_WIDTH / width);
      width = MAX_WIDTH;
    }

    const output = await sharp(input)
      .rotate()
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .flatten({ background: '#000000' })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).send(output);

  } catch (error) {
    console.error('social-image error:', error);
    res.status(500).json({ error: 'Conversione della foto non riuscita.' });
  }
};
