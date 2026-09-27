document.addEventListener('DOMContentLoaded', () => {

  function escapeHTML(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[char]
    );
  }


  function safeExternalUrl(value) {
    try {
      const url =
        new URL(
          String(value ?? '').trim()
        );

      return ['http:', 'https:']
        .includes(url.protocol)
        ? url.href
        : '';

    } catch {
      return '';
    }
  }


  function formatEventDate(dateValue) {

    const date =
      new Date(dateValue);

    return date.toLocaleString(
      'it-IT',
      {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }


  function formatEventDescription(
    description
  ) {

    if (!description) return '';

    const plainDescription =
      String(description);

    const urlMatch =
      plainDescription.match(
        /https?:\/\/[^\s"<]+/
      );


    if (!urlMatch) {
      return escapeHTML(
        plainDescription
      );
    }


    const url =
      safeExternalUrl(
        urlMatch[0]
      );


    const cleanDescription =
      plainDescription
        .replace(
          /<a[^>]*>(.*?)<\/a>/gi,
          '$1'
        )
        .replace(
          urlMatch[0],
          ''
        )
        .replace(
          /<[^>]+>/g,
          ''
        )
        .replace(
          /Discord:/gi,
          ''
        )
        .trim();


    const safeDescription =
      escapeHTML(
        cleanDescription
      );


    if (!url) {
      return safeDescription;
    }


    return `
      <span>${safeDescription}</span>

      <div class="event-links">
        <a
          class="ato-link"
          href="${escapeHTML(url)}"
          target="_blank"
          rel="noopener noreferrer">
          ATO
        </a>
      </div>
    `;
  }


  async function loadNextCalendarEvent() {

    const titleEl =
      document.getElementById(
        'nextEventTitle'
      );

    const descriptionEl =
      document.getElementById(
        'nextEventDescription'
      );

    const dateEl =
      document.getElementById(
        'nextEventDate'
      );

    const locationEl =
      document.getElementById(
        'nextEventLocation'
      );

    const programListEl =
      document.getElementById(
        'programEventsList'
      );


    if (
      !titleEl ||
      !dateEl ||
      !locationEl
    ) {
      return;
    }


    try {

      const response =
        await fetch(
          '/api/calendar-events'
        );

      const events =
        await response.json();


      if (!response.ok) {

        throw new Error(
          events.details ||
          'Errore calendario'
        );
      }


      if (!events.length) {

        titleEl.textContent =
          'Nessun evento programmato';


        if (descriptionEl) {
          descriptionEl.textContent =
            '';
        }


        dateEl.textContent =
          'Da definire';


        locationEl.textContent =
          'Server Flying Donkeys';


        if (programListEl) {
          programListEl.replaceChildren();
        }

        return;
      }


      const nextEvent =
        events[0];


      titleEl.textContent =
        nextEvent.summary ||
        nextEvent.calendarLabel;


      if (descriptionEl) {

        descriptionEl.innerHTML =
          formatEventDescription(
            nextEvent.description || ''
          );
      }


      dateEl.textContent =
        formatEventDate(
          nextEvent.startValue
        );


      locationEl.textContent =
        nextEvent.serverName;


      if (programListEl) {

        const nextEvents =
          events.slice(1, 5);


        if (!nextEvents.length) {

          programListEl.innerHTML =
            '<p class="muted">Nessun altro evento programmato.</p>';

          return;
        }


        programListEl.innerHTML =
          nextEvents
            .map(event => `

              <article class="program-event-card">

                <div>

                  <p class="muted small">
                    ${escapeHTML(event.calendarLabel)}
                  </p>

                  <h3>
                    ${escapeHTML(
                      event.summary ||
                      event.calendarLabel
                    )}
                  </h3>

                  <p>
                    ${formatEventDescription(
                      event.description || ''
                    )}
                  </p>

                </div>

                <div class="program-event-meta">

                  <span>
                    ${escapeHTML(
                      formatEventDate(
                        event.startValue
                      )
                    )}
                  </span>

                  <strong>
                    ${escapeHTML(
                      event.serverName
                    )}
                  </strong>

                </div>

              </article>

            `)
            .join('');
      }


    } catch (error) {

      console.error(
        'Errore caricamento calendario:',
        error
      );


      titleEl.textContent =
        'Prossimo Evento';


      if (descriptionEl) {
        descriptionEl.textContent =
          '';
      }


      dateEl.textContent =
        'Martedì e Giovedì — 21:00 CEST';


      locationEl.textContent =
        'Server Flying Donkeys';


      if (programListEl) {
        programListEl.replaceChildren();
      }
    }
  }


  loadNextCalendarEvent();


  // Smooth scrolling
  document
    .querySelectorAll(
      'a[href^="#"]'
    )
    .forEach(anchor => {

      anchor.addEventListener(
        'click',
        function (event) {

          const href =
            this.getAttribute(
              'href'
            );

          if (href === '#') {
            return;
          }


          const target =
            document.querySelector(
              href
            );


          if (target) {

            event.preventDefault();

            target.scrollIntoView({
              behavior: 'smooth'
            });
          }
        }
      );
    });


  // Modal contatti
  const openBtn =
    document.getElementById(
      'openContact'
    );

  const closeBtn =
    document.getElementById(
      'closeModal'
    );

  const cancelBtn =
    document.getElementById(
      'cancelModal'
    );

  const modal =
    document.getElementById(
      'modalBackdrop'
    );


  function openModal() {

    if (!modal) return;

    modal.hidden = false;

    document.body.style.overflow =
      'hidden';
  }


  function closeModal() {

    if (!modal) return;

    modal.hidden = true;

    document.body.style.overflow =
      '';
  }


  if (openBtn) {
    openBtn.addEventListener(
      'click',
      openModal
    );
  }


  if (closeBtn) {
    closeBtn.addEventListener(
      'click',
      closeModal
    );
  }


  if (cancelBtn) {
    cancelBtn.addEventListener(
      'click',
      closeModal
    );
  }


  if (modal) {

    modal.addEventListener(
      'click',
      event => {

        if (
          event.target === modal
        ) {
          closeModal();
        }
      }
    );
  }


  document.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Escape' &&
        modal &&
        !modal.hidden
      ) {
        closeModal();
      }
    }
  );


  const contactForm =
    document.getElementById(
      'contactForm'
    );


  if (contactForm) {

    contactForm.addEventListener(
      'submit',
      event => {

        event.preventDefault();


        const name =
          document.getElementById(
            'name'
          ).value;

        const email =
          document.getElementById(
            'email'
          ).value;

        const message =
          document.getElementById(
            'message'
          ).value;


        const recipient =
          'flyingdonkeysdcs@gmail.com';


        const subject =
          encodeURIComponent(
            `Messaggio da ${name}`
          );


        const body =
          encodeURIComponent(
`Nome: ${name}

Email: ${email}

Messaggio:
${message}`
          );


        window.location.href =
          `mailto:${recipient}?subject=${subject}&body=${body}`;


        closeModal();
      }
    );
  }


  // Galleria
  async function initGallery() {

    const container =
      document.querySelector(
        '.slideshow-container'
      );

    if (!container) return;


    function startSlideshow() {

      const slides =
        container.querySelectorAll(
          '.slide'
        );


      if (!slides.length) {
        return;
      }


      let currentSlide = 0;


      slides.forEach(
        (slide, index) => {

          slide.classList.toggle(
            'active-slide',
            index === 0
          );
        }
      );


      if (slides.length > 1) {

        setInterval(() => {

          slides[currentSlide]
            .classList
            .remove(
              'active-slide'
            );


          currentSlide =
            (
              currentSlide + 1
            ) %
            slides.length;


          slides[currentSlide]
            .classList
            .add(
              'active-slide'
            );

        }, 4000);
      }
    }


    try {

      const response =
        await fetch(
          '/api/gallery'
        );


      if (!response.ok) {

        throw new Error(
          `Gallery API error: ${response.status}`
        );
      }


      const images =
        await response.json();


      if (
        !Array.isArray(images) ||
        !images.length
      ) {

        throw new Error(
          'Gallery vuota'
        );
      }


      const fragment =
        document.createDocumentFragment();


      images.forEach(
        (image, index) => {

          const img =
            document.createElement(
              'img'
            );


          img.src =
            image.src;

          img.alt =
            image.alt ||
            'Flying Donkeys Gallery';


          img.className =
            index === 0
              ? 'slide active-slide'
              : 'slide';


          img.loading =
            'lazy';

          img.decoding =
            'async';


          fragment.appendChild(
            img
          );
        }
      );


      container.replaceChildren(
        fragment
      );


      startSlideshow();


    } catch (error) {

      console.error(
        'Errore caricamento galleria:',
        error
      );

      startSlideshow();
    }
  }


  function initGalleryWhenVisible() {

    const container =
      document.querySelector(
        '.slideshow-container'
      );


    if (!container) return;


    if (
      !(
        'IntersectionObserver'
        in window
      )
    ) {

      initGallery();
      return;
    }


    const observer =
      new IntersectionObserver(
        entries => {

          if (
            !entries[0]
              .isIntersecting
          ) {
            return;
          }


          observer.disconnect();

          initGallery();

        },
        {
          rootMargin:
            '600px 0px'
        }
      );


    observer.observe(
      container
    );
  }


  initGalleryWhenVisible();


  // News DCS
  async function loadDcsNews() {

    const listEl =
      document.getElementById(
        'dcsNewsList'
      );


    if (!listEl) return;


    try {

      const response =
        await fetch(
          '/api/dcs-news',
          {
            headers: {
              Accept:
                'application/json'
            }
          }
        );


      if (!response.ok) {

        throw new Error(
          'Errore caricamento newsletter'
        );
      }


      const news =
        await response.json();


      if (!Array.isArray(news)) {

        throw new Error(
          'Formato newsletter non valido'
        );
      }


      listEl.replaceChildren();


      if (!news.length) {

        const emptyMessage =
          document.createElement(
            'p'
          );

        emptyMessage.className =
          'muted';

        emptyMessage.textContent =
          'Newsletter DCS non disponibili al momento.';


        listEl.appendChild(
          emptyMessage
        );

        return;
      }


      const fragment =
        document.createDocumentFragment();


      news.forEach(item => {

        const article =
          document.createElement(
            'article'
          );

        article.className =
          'program-event-card dcs-news-card';


        const content =
          document.createElement(
            'div'
          );


        const source =
          document.createElement(
            'p'
          );

        source.className =
          'muted small';

        source.textContent =
          'Eagle Dynamics Newsletter';


        const title =
          document.createElement(
            'h3'
          );

        title.textContent =
          String(
            item?.title ||
            'DCS Newsletter'
          );


        const summary =
          document.createElement(
            'p'
          );

        summary.textContent =
          String(
            item?.summary ||
            'Riassunto non disponibile.'
          );


        content.appendChild(
          source
        );

        content.appendChild(
          title
        );

        content.appendChild(
          summary
        );


        article.appendChild(
          content
        );


        const newsletterUrl =
          safeExternalUrl(
            item?.url
          );


        if (newsletterUrl) {

          const meta =
            document.createElement(
              'div'
            );

          meta.className =
            'program-event-meta';


          const link =
            document.createElement(
              'a'
            );

          link.className =
            'btn btn-primary';

          link.href =
            newsletterUrl;

          link.target =
            '_blank';

          link.rel =
            'noopener noreferrer';

          link.textContent =
            'Leggi newsletter';


          meta.appendChild(
            link
          );

          article.appendChild(
            meta
          );
        }


        fragment.appendChild(
          article
        );
      });


      listEl.appendChild(
        fragment
      );


    } catch (error) {

      console.error(
        'Errore DCS news:',
        error
      );


      listEl.replaceChildren();


      const errorMessage =
        document.createElement(
          'p'
        );

      errorMessage.className =
        'muted';

      errorMessage.textContent =
        'Newsletter DCS non disponibili al momento.';


      listEl.appendChild(
        errorMessage
      );
    }
  }


  function initDcsNewsWhenVisible() {

    const section =
      document.getElementById(
        'dcs-news'
      );


    if (!section) return;


    if (
      !(
        'IntersectionObserver'
        in window
      )
    ) {

      loadDcsNews();
      return;
    }


    const observer =
      new IntersectionObserver(
        entries => {

          if (
            !entries[0]
              .isIntersecting
          ) {
            return;
          }


          observer.disconnect();

          loadDcsNews();

        },
        {
          rootMargin:
            '700px 0px'
        }
      );


    observer.observe(
      section
    );
  }


  initDcsNewsWhenVisible();

});
