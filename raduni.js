document.addEventListener('DOMContentLoaded', () => {

  const mediaModal =
    document.getElementById('mediaModal');

  const mediaModalContent =
    document.getElementById('mediaModalContent');

  const closeMediaModal =
    document.getElementById('closeMediaModal');

  const prevMediaModal =
    document.getElementById('prevMediaModal');

  const nextMediaModal =
    document.getElementById('nextMediaModal');

  const raduniMedia = Array.from(
    document.querySelectorAll(
      '.raduno-gallery img, .raduno-gallery video'
    )
  );

  let currentMediaIndex = 0;


  function getMediaSource(element) {

    if (!element) return '';

    if (element.tagName.toLowerCase() === 'video') {

      const source =
        element.querySelector('source');

      return (
        element.dataset.fullSrc ||
        element.currentSrc ||
        element.src ||
        (source ? source.src : '')
      );
    }

    return (
      element.dataset.fullSrc ||
      element.src
    );
  }


  function getMediaType(element) {

    if (!element) return 'image';

    return (
      element.tagName.toLowerCase() === 'video'
        ? 'video'
        : 'image'
    );
  }


  function showMedia(index) {

    if (
      !mediaModal ||
      !mediaModalContent ||
      !raduniMedia.length
    ) return;

    currentMediaIndex =
      (index + raduniMedia.length) %
      raduniMedia.length;

    const item =
      raduniMedia[currentMediaIndex];

    const type =
      getMediaType(item);

    const src =
      getMediaSource(item);

    const alt =
      item.getAttribute('alt') ||
      'Media raduno';

    mediaModalContent.replaceChildren();

    if (type === 'video') {

      const video =
        document.createElement('video');

      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;

      video.setAttribute(
        'playsinline',
        ''
      );

      if (item.poster) {
        video.poster = item.poster;
      }

      mediaModalContent.appendChild(video);

    } else {

      const image =
        document.createElement('img');

      image.src = src;
      image.alt = alt;

      mediaModalContent.appendChild(image);
    }
  }


  function openMediaModal(index) {

    if (!mediaModal) return;

    showMedia(index);

    mediaModal.hidden = false;

    document.body.style.overflow =
      'hidden';
  }


  function closeRaduniMediaModal() {

    if (
      !mediaModal ||
      !mediaModalContent
    ) return;

    mediaModal.hidden = true;

    mediaModalContent.replaceChildren();

    document.body.style.overflow = '';
  }


  raduniMedia.forEach(
    (item, index) => {

      item.addEventListener(
        'click',
        event => {

          event.preventDefault();

          openMediaModal(index);
        }
      );
    }
  );


  if (closeMediaModal) {

    closeMediaModal.addEventListener(
      'click',
      closeRaduniMediaModal
    );
  }


  if (prevMediaModal) {

    prevMediaModal.addEventListener(
      'click',
      event => {

        event.stopPropagation();

        showMedia(
          currentMediaIndex - 1
        );
      }
    );
  }


  if (nextMediaModal) {

    nextMediaModal.addEventListener(
      'click',
      event => {

        event.stopPropagation();

        showMedia(
          currentMediaIndex + 1
        );
      }
    );
  }


  if (mediaModal) {

    mediaModal.addEventListener(
      'click',
      event => {

        if (event.target === mediaModal) {
          closeRaduniMediaModal();
        }
      }
    );
  }


  document.addEventListener(
    'keydown',
    event => {

      if (
        !mediaModal ||
        mediaModal.hidden
      ) return;

      if (event.key === 'Escape') {
        closeRaduniMediaModal();
      }

      if (event.key === 'ArrowLeft') {
        showMedia(
          currentMediaIndex - 1
        );
      }

      if (event.key === 'ArrowRight') {
        showMedia(
          currentMediaIndex + 1
        );
      }
    }
  );

});
