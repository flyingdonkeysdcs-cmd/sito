/* ==========================================================
   FLYING DONKEYS — SCRIPT COMUNE
   Caricato su tutte le pagine, prima degli script di pagina.

   0. Transizione di caricamento (#pageIntro, se presente)
   1. FD: utility condivise (fogli Google, sicurezza HTML/URL,
      formattazione testi missione, lazy loading)
   2. Copyright nel footer
   3. Roster piloti (menu desktop + menu mobile)
   ========================================================== */


/* ----------------------------------------------------------
   0. TRANSIZIONE DI CARICAMENTO
   Nelle pagine che includono il markup #pageIntro (vedi
   style.css), apre l'overlay quando la pagina ha finito di
   caricare, con un tempo minimo a schermo e uno massimo di
   sicurezza nel caso il caricamento sia troppo lento o fallisca.
   Nelle altre pagine non fa nulla.
   ---------------------------------------------------------- */

(() => {
  const intro = document.getElementById('pageIntro');
  if (!intro) return;

  const MIN_VISIBLE_MS = 700;
  const MAX_WAIT_MS = 5000;

  const introStart = Date.now();
  let introDone = false;

  function reveal() {
    if (introDone) return;
    introDone = true;

    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - introStart));

    setTimeout(() => {
      intro.classList.add('open');
      document.body.classList.remove('pi-loading');
      setTimeout(() => intro.remove(), 1400);
    }, wait);
  }

  setTimeout(reveal, MAX_WAIT_MS);

  if (document.readyState === 'complete') {
    reveal();
  } else {
    window.addEventListener('load', reveal);
  }
})();


/* ----------------------------------------------------------
   1. UTILITY CONDIVISE
   Esposte come oggetto globale FD per gli altri script.
   ---------------------------------------------------------- */

const FD = (() => {

  const SHEET_ID = '1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk';

  const sheetCsvUrl = gid =>
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;

  /* Fonti dati del Google Sheet della squadriglia */
  const SHEETS = {
    stats:       sheetCsvUrl('1481970459'), // Statistiche (roster)
    medalRules:  sheetCsvUrl('2068617911'), // RegoleMedaglie
    pilotPhotos: sheetCsvUrl('1843730163'), // Foto profilo / header / posizione
    aar:         `https://opensheet.elk.sh/${SHEET_ID}/AAR` // Mission Log (JSON)
  };


  /* Escape dei caratteri speciali prima di inserire testo in HTML */
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


  /*
   * URL di immagini/asset: accetta percorsi relativi al sito
   * e URL http/https. Valori vuoti o segnaposto ("-", "n/a"...)
   * restituiscono una stringa vuota.
   */
  function safeAssetUrl(value) {
    const rawValue = String(value ?? '').trim();

    const invalidValues = ['', '-', 'n/a', 'na', 'null', 'undefined'];

    if (invalidValues.includes(rawValue.toLowerCase())) {
      return '';
    }

    try {
      const url = new URL(rawValue, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }


  /* URL esterni: solo assoluti http/https */
  function safeExternalUrl(value) {
    try {
      const url = new URL(String(value ?? '').trim());
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }


  /* Parser CSV (gestisce virgolette, "" escapate e a capo CRLF) */
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && insideQuotes && next === '"') {
        cell += '"';
        i++;

      } else if (char === '"') {
        insideQuotes = !insideQuotes;

      } else if (char === ',' && !insideQuotes) {
        row.push(cell.trim());
        cell = '';

      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (char === '\r' && next === '\n') {
          i++;
        }

        row.push(cell.trim());
        rows.push(row);

        row = [];
        cell = '';

      } else {
        cell += char;
      }
    }

    if (cell || row.length) {
      row.push(cell.trim());
      rows.push(row);
    }

    return rows.filter(row => row.some(cell => cell !== ''));
  }


  /* Scarica un foglio Google in CSV e lo restituisce come righe */
  async function loadSheet(url) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Impossibile leggere il foglio Google');
    }

    return parseCSV(await response.text());
  }


  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }


  /* Legge una cella usando il NOME della colonna (case-insensitive) */
  function getCellByHeader(headers, row, headerName) {
    const index = headers.findIndex(
      header => normalize(header) === normalize(headerName)
    );

    return index >= 0 ? String(row[index] || '').trim() : '';
  }


  /*
   * Mini-markdown dei debriefing missione:
   *   ## Titolo      -> titolo sezione
   *   ### Titolo     -> sottotitolo
   *   - voce         -> elenco puntato
   *   riga vuota     -> spazio tra paragrafi
   */
  function formatMissionText(text) {
    if (!text) return '';

    const source = escapeHTML(
      String(text).replace(/\r\n?/g, '\n')
    );

    const inline = value => value
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^\w*])\*([^*\n]+)\*(?=$|[^\w*])/g,
        '$1<em>$2</em>');

    const lines = source.split('\n');
    const output = [];
    let inList = false;

    function closeList() {
      if (inList) {
        output.push('</ul>');
        inList = false;
      }
    }

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        closeList();
        if (output.length && output.at(-1) !== '<br>') {
          output.push('<br>');
        }
        continue;
      }

      if (/^---+$/.test(trimmed)) {
        closeList();
        output.push('<hr class="mission-divider">');
        continue;
      }

      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        closeList();

        const cls = heading[1].length === 3
          ? 'mission-subheading'
          : 'mission-heading';

        output.push(
          `<strong class="${cls}">${inline(heading[2])}</strong>`
        );
        continue;
      }

      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        if (!inList) {
          output.push('<ul class="mission-list">');
          inList = true;
        }
        output.push(`<li>${inline(bullet[1])}</li>`);
        continue;
      }

      closeList();
      output.push(`${inline(line)}<br>`);
    }

    closeList();
    return output.join('\n');
  }


  /* Blocca/sblocca lo scroll della pagina mentre un popup è aperto */
  function setScrollLock(locked) {
    document.body.style.overflow = locked ? 'hidden' : '';
  }


  /*
   * Esegue callback una sola volta, quando l'elemento si avvicina
   * all'area visibile (rootMargin). Senza IntersectionObserver
   * la esegue subito.
   */
  function whenVisible(element, rootMargin, callback) {
    if (!element) return;

    if (!('IntersectionObserver' in window)) {
      callback();
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting) return;

        observer.disconnect();
        callback();
      },
      { rootMargin }
    );

    observer.observe(element);
  }


  return {
    SHEETS,
    escapeHTML,
    safeAssetUrl,
    safeExternalUrl,
    parseCSV,
    loadSheet,
    normalize,
    getCellByHeader,
    formatMissionText,
    setScrollLock,
    whenVisible
  };
})();


document.addEventListener('DOMContentLoaded', () => {

  /* ----------------------------------------------------------
     2. COPYRIGHT
     ---------------------------------------------------------- */

  const copyright = document.getElementById('copyright');

  if (copyright) {
    copyright.textContent =
      `© ${new Date().getFullYear()} Flying Donkeys Virtual Squadron`;
  }


  /* ----------------------------------------------------------
     3. ROSTER PILOTI (desktop + mobile)
     ---------------------------------------------------------- */

  const openRoster       = document.getElementById('openRoster');
  const rosterMenu       = document.getElementById('rosterMenu');
  const pilotList        = document.getElementById('pilotList');

  const openMobileRoster = document.getElementById('openMobileRoster');
  const mobileRosterMenu = document.getElementById('mobileRosterMenu');
  const mobilePilotList  = document.getElementById('mobilePilotList');


  /*
   * Una sola richiesta al Google Sheet:
   * desktop e mobile condividono gli stessi dati.
   * In caso di errore la richiesta viene ritentata alla prossima apertura.
   */
  let rosterRowsPromise = null;

  function getRosterRows() {
    if (!rosterRowsPromise) {
      rosterRowsPromise = FD.loadSheet(FD.SHEETS.stats).catch(error => {
        rosterRowsPromise = null;
        throw error;
      });
    }

    return rosterRowsPromise;
  }


  function renderRoster(container, rows) {
    if (!container) return;

    container.replaceChildren();

    let pilotsAdded = 0;

    rows.slice(1).forEach(row => {
      const pilotName = String(row[0] || '').trim();

      if (!pilotName) return;

      const link = document.createElement('a');
      link.className = 'pilot-item';
      link.textContent = pilotName;
      link.href = './pilota.html?nome=' + encodeURIComponent(pilotName);

      container.appendChild(link);
      pilotsAdded++;
    });

    if (!pilotsAdded) {
      container.textContent = 'Nessun pilota disponibile.';
    }
  }


  async function loadRosterInto(container) {
    if (!container) return;
    if (container.dataset.loaded === 'true') return;

    container.textContent = 'Caricamento piloti...';

    try {
      const rows = await getRosterRows();

      renderRoster(container, rows);
      container.dataset.loaded = 'true';

    } catch (error) {
      container.textContent = error.message;
    }
  }


  /* Roster desktop: menu a tendina, si chiude cliccando fuori */
  if (openRoster && rosterMenu && pilotList) {

    openRoster.setAttribute('aria-expanded', 'false');

    openRoster.addEventListener('click', () => {
      const willOpen = rosterMenu.hidden;

      rosterMenu.hidden = !willOpen;
      openRoster.setAttribute('aria-expanded', String(willOpen));

      if (willOpen) {
        loadRosterInto(pilotList);
      }
    });

    document.addEventListener('click', event => {
      const clickedInsideRoster =
        openRoster.contains(event.target) ||
        rosterMenu.contains(event.target);

      if (!clickedInsideRoster) {
        rosterMenu.hidden = true;
        openRoster.setAttribute('aria-expanded', 'false');
      }
    });
  }


  /* Menu a tendina della nav desktop (Squadriglia / Operazioni /
     Media / Guide): stesso comportamento del menu Roster, si chiude
     cliccando fuori. Funziona su qualunque coppia pulsante/pannello
     che segua la convenzione id "open<Nome>"/"<nome>Menu". */
  function wireNavDropdown(openId, menuId) {
    const openBtn = document.getElementById(openId);
    const menu    = document.getElementById(menuId);

    if (!openBtn || !menu) return;

    openBtn.setAttribute('aria-expanded', 'false');

    openBtn.addEventListener('click', () => {
      const willOpen = menu.hidden;

      menu.hidden = !willOpen;
      openBtn.setAttribute('aria-expanded', String(willOpen));
    });

    document.addEventListener('click', event => {
      const clickedInside =
        openBtn.contains(event.target) ||
        menu.contains(event.target);

      if (!clickedInside) {
        menu.hidden = true;
        openBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  wireNavDropdown('openSquadriglia', 'squadrigliaMenu');
  wireNavDropdown('openOperazioni', 'operazioniMenu');
  wireNavDropdown('openMedia', 'mediaMenu');
  wireNavDropdown('openGuideMenu', 'guideMenu');


  /* Roster mobile: sezione espandibile dentro il menu hamburger */
  if (openMobileRoster && mobileRosterMenu && mobilePilotList) {

    openMobileRoster.setAttribute('aria-expanded', 'false');

    openMobileRoster.addEventListener('click', event => {
      event.preventDefault();

      const willOpen = mobileRosterMenu.hidden;

      mobileRosterMenu.hidden = !willOpen;
      openMobileRoster.classList.toggle('is-open', willOpen);
      openMobileRoster.setAttribute('aria-expanded', String(willOpen));

      if (willOpen) {
        loadRosterInto(mobilePilotList);
      }
    });
  }
});
