/* ==========================================================
   GALLERIA (galleria.html)
   Carica tutti gli screenshot da /api/gallery (stessa fonte
   dello slideshow in home) in una griglia, con popup fullscreen
   e navigazione precedente/successivo (anche da tastiera:
   frecce ← →, Esc per chiudere). Le foto più recenti compaiono
   per prime.
   ========================================================== */

document.addEventListener('DOMContentLoaded', async () => {

  const photoGrid       = document.getElementById('photoGrid');
  const emptyState      = document.getElementById('galleryEmptyState');
  const mediaModal       = document.getElementById('mediaModal');
  const mediaModalContent = document.getElementById('mediaModalContent');
  const closeMediaModal = document.getElementById('closeMediaModal');
  const prevMediaModal  = document.getElementById('prevMediaModal');
  const nextMediaModal  = document.getElementById('nextMediaModal');

  let galleryImages = [];
  let currentIndex = 0;


  function showImage(index) {
    if (!mediaModal || !mediaModalContent || !galleryImages.length) return;

    currentIndex = (index + galleryImages.length) % galleryImages.length;
    const item = galleryImages[currentIndex];

    mediaModalContent.replaceChildren();

    const image = document.createElement('img');
    image.src = item.src;
    image.alt = item.alt || 'Flying Donkeys Gallery';
    mediaModalContent.appendChild(image);
  }


  function openMediaModal(index) {
    if (!mediaModal) return;
    showImage(index);
    mediaModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }


  function closeGalleryModal() {
    if (!mediaModal || !mediaModalContent) return;
    mediaModal.hidden = true;
    mediaModalContent.replaceChildren();
    document.body.style.overflow = '';
  }


  if (closeMediaModal) closeMediaModal.addEventListener('click', closeGalleryModal);
  if (prevMediaModal) prevMediaModal.addEventListener('click', e => { e.stopPropagation(); showImage(currentIndex - 1); });
  if (nextMediaModal) nextMediaModal.addEventListener('click', e => { e.stopPropagation(); showImage(currentIndex + 1); });

  if (mediaModal) {
    mediaModal.addEventListener('click', e => {
      if (e.target === mediaModal) closeGalleryModal();
    });
  }

  document.addEventListener('keydown', e => {
    if (!mediaModal || mediaModal.hidden) return;
    if (e.key === 'Escape')     closeGalleryModal();
    if (e.key === 'ArrowLeft')  showImage(currentIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentIndex + 1);
  });


  try {
    const response = await fetch('/api/gallery');
    if (!response.ok) throw new Error(`Gallery API error: ${response.status}`);

    const images = await response.json();
    if (!Array.isArray(images) || !images.length) throw new Error('Gallery vuota');

    galleryImages = images.slice().reverse(); // più recenti per prime

    const fragment = document.createDocumentFragment();

    galleryImages.forEach((image, index) => {
      const img = document.createElement('img');
      img.src = image.src;
      img.alt = image.alt || 'Flying Donkeys Gallery';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('click', () => openMediaModal(index));
      fragment.appendChild(img);
    });

    photoGrid.appendChild(fragment);

  } catch (error) {
    console.error('Errore caricamento galleria:', error);
    if (emptyState) emptyState.hidden = false;
  }
});
