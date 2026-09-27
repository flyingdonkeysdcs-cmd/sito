document.addEventListener('DOMContentLoaded', () => {

  // Copyright
  const copyright = document.getElementById('copyright');

  if (copyright) {
    copyright.textContent =
      `© ${new Date().getFullYear()} Flying Donkeys Virtual Squadron`;
  }


  // Google Sheet usato dal roster
  const statsSheetUrl =
    'https://docs.google.com/spreadsheets/d/1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk/gviz/tq?tqx=out:csv&gid=1481970459';


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

      } else if (
        (char === '\n' || char === '\r') &&
        !insideQuotes
      ) {

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

    return rows.filter(
      row => row.some(cell => cell !== '')
    );
  }


  async function loadSheet(url) {

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Impossibile leggere il foglio Google');
    }

    return parseCSV(await response.text());
  }


  // =========================================================
  // ROSTER DESKTOP + MOBILE
  // =========================================================

  const openRoster =
    document.getElementById('openRoster');

  const rosterMenu =
    document.getElementById('rosterMenu');

  const pilotList =
    document.getElementById('pilotList');


  const openMobileRoster =
    document.getElementById('openMobileRoster');

  const mobileRosterMenu =
    document.getElementById('mobileRosterMenu');

  const mobilePilotList =
    document.getElementById('mobilePilotList');


  /*
   * Una sola richiesta al Google Sheet.
   * Desktop e mobile condividono gli stessi dati.
   */
  let rosterRowsPromise = null;


  function getRosterRows() {

    if (!rosterRowsPromise) {

      rosterRowsPromise =
        loadSheet(statsSheetUrl)
          .catch(error => {

            rosterRowsPromise = null;

            throw error;
          });
    }

    return rosterRowsPromise;
  }


  function renderRoster(
    container,
    rows
  ) {

    if (!container) return;

    container.replaceChildren();

    let pilotsAdded = 0;


    rows.slice(1).forEach(row => {

      const pilotName =
        String(row[0] || '').trim();

      if (!pilotName) return;


      const link =
        document.createElement('a');

      link.className =
        'pilot-item';

      link.textContent =
        pilotName;

      link.href =
        './pilota.html?nome=' +
        encodeURIComponent(pilotName);


      container.appendChild(link);

      pilotsAdded++;
    });


    if (!pilotsAdded) {

      container.textContent =
        'Nessun pilota disponibile.';
    }
  }


  async function loadRosterInto(
    container
  ) {

    if (!container) return;

    if (
      container.dataset.loaded ===
      'true'
    ) {
      return;
    }


    container.textContent =
      'Caricamento piloti...';


    try {

      const rows =
        await getRosterRows();

      renderRoster(
        container,
        rows
      );

      container.dataset.loaded =
        'true';

    } catch (error) {

      container.textContent =
        error.message;
    }
  }


  // -------------------------
  // ROSTER DESKTOP
  // -------------------------

  if (
    openRoster &&
    rosterMenu &&
    pilotList
  ) {

    openRoster.setAttribute(
      'aria-expanded',
      'false'
    );


    openRoster.addEventListener(
      'click',
      function () {

        const willOpen =
          rosterMenu.hidden;

        rosterMenu.hidden =
          !willOpen;

        openRoster.setAttribute(
          'aria-expanded',
          String(willOpen)
        );


        if (willOpen) {

          loadRosterInto(
            pilotList
          );
        }
      }
    );


    document.addEventListener(
      'click',
      function (event) {

        const clickedInsideRoster =
          openRoster.contains(
            event.target
          ) ||
          rosterMenu.contains(
            event.target
          );


        if (!clickedInsideRoster) {

          rosterMenu.hidden =
            true;

          openRoster.setAttribute(
            'aria-expanded',
            'false'
          );
        }
      }
    );
  }


  // -------------------------
  // ROSTER MOBILE
  // -------------------------

  if (
    openMobileRoster &&
    mobileRosterMenu &&
    mobilePilotList
  ) {

    openMobileRoster.setAttribute(
      'aria-expanded',
      'false'
    );


    openMobileRoster.addEventListener(
      'click',
      function (event) {

        event.preventDefault();

        const willOpen =
          mobileRosterMenu.hidden;


        mobileRosterMenu.hidden =
          !willOpen;


        openMobileRoster.classList.toggle(
          'is-open',
          willOpen
        );


        openMobileRoster.setAttribute(
          'aria-expanded',
          String(willOpen)
        );


        if (willOpen) {

          loadRosterInto(
            mobilePilotList
          );
        }
      }
    );
  }
});
