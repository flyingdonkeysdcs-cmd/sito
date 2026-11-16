/* ==========================================================
   RADUNI (raduni.html)
   Le card sono generate da data/raduni.json (gestito dal portale
   admin), stessa idea della Galleria. Popup a schermo intero per
   foto e video, con navigazione precedente/successivo (anche da
   tastiera: frecce ← →, Esc per chiudere).
   ========================================================== */

document.addEventListener('DOMContentLoaded', async () => {

  const gridEl       = document.getElementById('raduniGrid');
  const emptyStateEl = document.getElementById('raduniEmptyState');

  const mediaModal        = document.getElementById('mediaModal');
  const mediaModalContent = document.getElementById('mediaModalContent');
  const closeMediaModal   = document.getElementById('closeMediaModal');
  const prevMediaModal    = document.getElementById('prevMediaModal');
  const nextMediaModal    = document.getElementById('nextMediaModal');

  if (!gridEl) return;

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function isVideoSrc(src) {
    return /\.(mp4|webm|mov)$/i.test(src);
  }

  function raduniCardHTML(raduno) {
    const mediaHTML = (raduno.foto || []).map((src, mediaIndex) => {
      const safeSrc = escapeHTML(src);
      const alt = `${escapeHTML(raduno.titolo)} - foto ${mediaIndex + 1}`;

      return isVideoSrc(src)
        ? `<video controls width="100%">
             <source src="${safeSrc}" type="video/mp4">
           </video>`
        : `<img src="${safeSrc}" alt="${alt}" loading="lazy" decoding="async">`;
    }).join('');

    return `
      <article class="raduno-card">
        <div class="raduno-gallery">${mediaHTML}</div>
        <div class="raduno-content">
          <p class="muted small">Raduno</p>
          <h3>${escapeHTML(raduno.titolo)}</h3>
          <p>${escapeHTML(raduno.data)}</p>
        </div>
      </article>`;
  }


  /* ----------------------------------------------------------
     Popup fullscreen (stessa logica di sempre, agganciata dopo
     che le card sono state generate)
     ---------------------------------------------------------- */

  let raduniMedia = [];
  let currentMediaIndex = 0;

  function isVideo(element) {
    return element.tagName.toLowerCase() === 'video';
  }

  function getMediaSource(element) {
    if (!element) return '';

    if (isVideo(element)) {
      const source = element.querySelector('source');
      return element.dataset.fullSrc || element.currentSrc || element.src || (source ? source.src : '');
    }

    return element.dataset.fullSrc || element.src;
  }

  function showMedia(index) {
    if (!mediaModal || !mediaModalContent || !raduniMedia.length) return;

    currentMediaIndex = (index + raduniMedia.length) % raduniMedia.length;

    const item = raduniMedia[currentMediaIndex];
    const src = getMediaSource(item);

    mediaModalContent.replaceChildren();

    if (isVideo(item)) {
      const video = document.createElement('video');
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      mediaModalContent.appendChild(video);
    } else {
      const image = document.createElement('img');
      image.src = src;
      image.alt = item.getAttribute('alt') || 'Media raduno';
      mediaModalContent.appendChild(image);
    }
  }

  function openMediaModal(index) {
    if (!mediaModal) return;
    showMedia(index);
    mediaModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeRaduniMediaModal() {
    if (!mediaModal || !mediaModalContent) return;
    mediaModal.hidden = true;
    mediaModalContent.replaceChildren();
    document.body.style.overflow = '';
  }

  function wireLightbox() {
    raduniMedia = Array.from(gridEl.querySelectorAll('.raduno-gallery img, .raduno-gallery video'));

    raduniMedia.forEach((item, index) => {
      item.addEventListener('click', event => {
        event.preventDefault();
        openMediaModal(index);
      });
    });
  }

  if (closeMediaModal) closeMediaModal.addEventListener('click', closeRaduniMediaModal);
  if (prevMediaModal) prevMediaModal.addEventListener('click', e => { e.stopPropagation(); showMedia(currentMediaIndex - 1); });
  if (nextMediaModal) nextMediaModal.addEventListener('click', e => { e.stopPropagation(); showMedia(currentMediaIndex + 1); });

  if (mediaModal) {
    mediaModal.addEventListener('click', event => {
      if (event.target === mediaModal) closeRaduniMediaModal();
    });
  }

  document.addEventListener('keydown', event => {
    if (!mediaModal || mediaModal.hidden) return;
    if (event.key === 'Escape')     closeRaduniMediaModal();
    if (event.key === 'ArrowLeft')  showMedia(currentMediaIndex - 1);
    if (event.key === 'ArrowRight') showMedia(currentMediaIndex + 1);
  });


  /* ----------------------------------------------------------
     Caricamento dati
     ---------------------------------------------------------- */

  try {
    const response = await fetch('/data/raduni.json');
    if (!response.ok) throw new Error(`Errore caricamento raduni: ${response.status}`);

    const raduni = await response.json();
    if (!Array.isArray(raduni) || !raduni.length) throw new Error('Nessun raduno disponibile');

    /* Più recenti per primi */
    const ordered = raduni.slice().reverse();

    gridEl.innerHTML = ordered.map(raduniCardHTML).join('');
    wireLightbox();

  } catch (error) {
    console.error('Errore caricamento raduni:', error);
    if (emptyStateEl) emptyStateEl.hidden = false;
  }
});
