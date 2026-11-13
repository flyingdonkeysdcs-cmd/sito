/* ==========================================================
   HOMEPAGE (index.html)

   1. Prossimo evento + programma completo (Google Calendar)
   1b. Contatori live (piloti attivi, missioni volate, anni di attività)
   2. Scroll morbido per i link interni (#sezione)
   3. Popup contatti (apre il client email)
   4. Galleria fotografica (caricata quando diventa visibile)
   5. Newsletter DCS (caricate quando diventano visibili)

   Richiede common.js (oggetto FD).
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const { escapeHTML, safeExternalUrl, setScrollLock, whenVisible } = FD;


  /* ----------------------------------------------------------
     1. CALENDARIO EVENTI
     ---------------------------------------------------------- */

  function formatEventDate(dateValue) {
    return new Date(dateValue).toLocaleString('it-IT', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }


  /*
   * Descrizione evento dal calendario.
   * Se contiene un link, il link diventa il pulsante "ATO"
   * e viene tolto dal testo (insieme a eventuali tag HTML
   * e all'etichetta "Discord:").
   */
  function formatEventDescription(description) {
    if (!description) return '';

    const plainDescription = String(description);
    const urlMatch = plainDescription.match(/https?:\/\/[^\s"<]+/);

    if (!urlMatch) {
      return escapeHTML(plainDescription);
    }

    const url = safeExternalUrl(urlMatch[0]);

    const cleanDescription = plainDescription
      .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
      .replace(urlMatch[0], '')
      .replace(/<[^>]+>/g, '')
      .replace(/Discord:/gi, '')
      .trim();

    const safeDescription = escapeHTML(cleanDescription);

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


  function programEventCardHTML(event) {
    return `

              <article class="program-event-card">

                <div>

                  <p class="muted small">
                    ${escapeHTML(event.calendarLabel)}
                  </p>

                  <h3>
                    ${escapeHTML(event.summary || event.calendarLabel)}
                  </h3>

                  <p>
                    ${formatEventDescription(event.description || '')}
                  </p>

                </div>

                <div class="program-event-meta">

                  <span>
                    ${escapeHTML(formatEventDate(event.startValue))}
                  </span>

                  <strong>
                    ${escapeHTML(event.serverName)}
                  </strong>

                </div>

              </article>

            `;
  }


  async function loadNextCalendarEvent() {

    const titleEl       = document.getElementById('nextEventTitle');
    const descriptionEl = document.getElementById('nextEventDescription');
    const dateEl        = document.getElementById('nextEventDate');
    const locationEl    = document.getElementById('nextEventLocation');
    const programListEl = document.getElementById('programEventsList');

    if (!titleEl || !dateEl || !locationEl) return;

    /* Testi mostrati quando non ci sono eventi o il calendario non risponde */
    function showPlaceholder(title, date) {
      titleEl.textContent = title;
      if (descriptionEl) descriptionEl.textContent = '';
      dateEl.textContent = date;
      locationEl.textContent = 'Server Flying Donkeys';
      if (programListEl) programListEl.replaceChildren();
    }

    try {
      const response = await fetch('/api/calendar-events');
      const events = await response.json();

      if (!response.ok) {
        throw new Error(events.details || 'Errore calendario');
      }

      if (!events.length) {
        showPlaceholder('Nessun evento programmato', 'Da definire');
        return;
      }

      /* Card "Prossimo evento" nella hero */
      const nextEvent = events[0];

      titleEl.textContent = nextEvent.summary || nextEvent.calendarLabel;

      if (descriptionEl) {
        descriptionEl.innerHTML =
          formatEventDescription(nextEvent.description || '');
      }

      dateEl.textContent = formatEventDate(nextEvent.startValue);
      locationEl.textContent = nextEvent.serverName;

      /* Sezione "Programma completo": i 4 eventi successivi */
      if (programListEl) {
        const nextEvents = events.slice(1, 5);

        if (!nextEvents.length) {
          programListEl.innerHTML =
            '<p class="muted">Nessun altro evento programmato.</p>';
          return;
        }

        programListEl.innerHTML = nextEvents.map(programEventCardHTML).join('');
      }

    } catch (error) {
      console.error('Errore caricamento calendario:', error);
      showPlaceholder('Prossimo Evento', 'Martedì e Giovedì — 21:00 CEST');
    }
  }

  loadNextCalendarEvent();


  /* ----------------------------------------------------------
     1b. CONTATORI LIVE
     Numeri reali letti dai fogli Google: numero di piloti nel
     roster, missioni registrate nel Mission Log, anni di
     attività del pilota più anziano.
     ---------------------------------------------------------- */

  async function loadHomeStats() {

    const pilotsEl   = document.getElementById('statPilots');
    const missionsEl = document.getElementById('statMissions');
    const yearsEl    = document.getElementById('statYears');

    if (!pilotsEl && !missionsEl && !yearsEl) return;

    try {

      const [rosterRows, missions] = await Promise.all([
        FD.loadSheet(FD.SHEETS.stats),
        fetch(FD.SHEETS.aar).then(response => response.json())
      ]);

      const headers = rosterRows[0] || [];
      const pilotRows = rosterRows
        .slice(1)
        .filter(row => String(row[0] || '').trim());

      if (pilotsEl) {
        pilotsEl.textContent = `${pilotRows.length} Piloti Attivi`;
      }

      if (missionsEl && Array.isArray(missions)) {
        missionsEl.textContent = `${missions.length} Missioni Volate`;
      }

      if (yearsEl) {
        const maxYears = pilotRows.reduce((max, row) => {
          const value = Number(
            String(FD.getCellByHeader(headers, row, 'Anni di Attività') || '0')
              .replace(',', '.')
          );
          return isNaN(value) ? max : Math.max(max, value);
        }, 0);

        yearsEl.textContent = maxYears > 0
          ? `${maxYears}+ Anni di Attività`
          : 'Anni di Attività';
      }

    } catch (error) {
      console.error('Errore caricamento contatori home:', error);
      // In caso di errore restano le etichette generiche gia' nell'HTML.
    }
  }

  loadHomeStats();


  /* ----------------------------------------------------------
     2. SCROLL MORBIDO
     ---------------------------------------------------------- */

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (event) {
      const href = this.getAttribute('href');

      if (href === '#') return;

      const target = document.querySelector(href);

      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });


  /* ----------------------------------------------------------
     3. POPUP CONTATTI
     ---------------------------------------------------------- */

  const openBtn   = document.getElementById('openContact');
  const closeBtn  = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelModal');
  const modal     = document.getElementById('modalBackdrop');

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    setScrollLock(true);
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    setScrollLock(false);
  }

  if (openBtn)   openBtn.addEventListener('click', openModal);
  if (closeBtn)  closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
    }
  });


  /* Il form compone una email precompilata e apre il client di posta */
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', event => {
      event.preventDefault();

      const name    = document.getElementById('name').value;
      const email   = document.getElementById('email').value;
      const message = document.getElementById('message').value;

      const recipient = 'flyingdonkeysdcs@gmail.com';

      const subject = encodeURIComponent(`Messaggio da ${name}`);

      const body = encodeURIComponent(
`Nome: ${name}

Email: ${email}

Messaggio:
${message}`
      );

      window.location.href =
        `mailto:${recipient}?subject=${subject}&body=${body}`;

      closeModal();
    });
  }


  /* ----------------------------------------------------------
     4. GALLERIA
     Le immagini arrivano da /api/gallery; se l'API non risponde
     resta lo slideshow con le immagini già presenti nell'HTML.
     ---------------------------------------------------------- */

  const SLIDE_INTERVAL_MS = 4000;

  async function initGallery(container) {

    function startSlideshow() {
      const slides = container.querySelectorAll('.slide');

      if (!slides.length) return;

      let currentSlide = 0;

      slides.forEach((slide, index) => {
        slide.classList.toggle('active-slide', index === 0);
      });

      if (slides.length > 1) {
        setInterval(() => {
          slides[currentSlide].classList.remove('active-slide');
          currentSlide = (currentSlide + 1) % slides.length;
          slides[currentSlide].classList.add('active-slide');
        }, SLIDE_INTERVAL_MS);
      }
    }

    try {
      const response = await fetch('/api/gallery');

      if (!response.ok) {
        throw new Error(`Gallery API error: ${response.status}`);
      }

      const images = await response.json();

      if (!Array.isArray(images) || !images.length) {
        throw new Error('Gallery vuota');
      }

      const fragment = document.createDocumentFragment();

      images.forEach((image, index) => {
        const img = document.createElement('img');

        img.src = image.src;
        img.alt = image.alt || 'Flying Donkeys Gallery';
        img.className = index === 0 ? 'slide active-slide' : 'slide';
        img.loading = 'lazy';
        img.decoding = 'async';

        fragment.appendChild(img);
      });

      container.replaceChildren(fragment);
      startSlideshow();

    } catch (error) {
      console.error('Errore caricamento galleria:', error);
      startSlideshow();
    }
  }

  const galleryContainer = document.querySelector('.slideshow-container');

  whenVisible(galleryContainer, '600px 0px', () => initGallery(galleryContainer));


  /* ----------------------------------------------------------
     5. NEWSLETTER DCS
     ---------------------------------------------------------- */

  function showNewsMessage(listEl) {
    listEl.replaceChildren();

    const message = document.createElement('p');
    message.className = 'muted';
    message.textContent = 'Newsletter DCS non disponibili al momento.';

    listEl.appendChild(message);
  }


  function createNewsCard(item) {
    const article = document.createElement('article');
    article.className = 'program-event-card dcs-news-card';

    const content = document.createElement('div');

    const source = document.createElement('p');
    source.className = 'muted small';
    source.textContent = 'Eagle Dynamics Newsletter';

    const title = document.createElement('h3');
    title.textContent = String(item?.title || 'DCS Newsletter');

    const summary = document.createElement('p');
    summary.textContent = String(item?.summary || 'Riassunto non disponibile.');

    content.append(source, title, summary);
    article.appendChild(content);

    const newsletterUrl = safeExternalUrl(item?.url);

    if (newsletterUrl) {
      const meta = document.createElement('div');
      meta.className = 'program-event-meta';

      const link = document.createElement('a');
      link.className = 'btn btn-primary';
      link.href = newsletterUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Leggi newsletter';

      meta.appendChild(link);
      article.appendChild(meta);
    }

    return article;
  }


  async function loadDcsNews() {
    const listEl = document.getElementById('dcsNewsList');

    if (!listEl) return;

    try {
      const response = await fetch('/api/dcs-news', {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Errore caricamento newsletter');
      }

      const news = await response.json();

      if (!Array.isArray(news)) {
        throw new Error('Formato newsletter non valido');
      }

      if (!news.length) {
        showNewsMessage(listEl);
        return;
      }

      const fragment = document.createDocumentFragment();
      news.forEach(item => fragment.appendChild(createNewsCard(item)));

      listEl.replaceChildren(fragment);

    } catch (error) {
      console.error('Errore DCS news:', error);
      showNewsMessage(listEl);
    }
  }

  whenVisible(document.getElementById('dcs-news'), '700px 0px', loadDcsNews);
});
