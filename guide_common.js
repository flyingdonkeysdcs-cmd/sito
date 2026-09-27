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


  // Roster
  const openRoster =
    document.getElementById('openRoster');

  const rosterMenu =
    document.getElementById('rosterMenu');

  const pilotList =
    document.getElementById('pilotList');


  if (openRoster && rosterMenu && pilotList) {

    let rosterLoaded = false;
    let rosterLoading = false;


    async function loadRosterOnce() {

      if (rosterLoaded || rosterLoading) return;

      rosterLoading = true;

      pilotList.textContent = 'Caricamento piloti...';

      try {

        const rows =
          await loadSheet(statsSheetUrl);

        pilotList.replaceChildren();

        rows.slice(1).forEach(row => {

          const pilotName = row[0];

          if (!pilotName) return;

          const link =
            document.createElement('a');

          link.className = 'pilot-item';
          link.textContent = pilotName;

          link.href =
            './pilota.html?nome=' +
            encodeURIComponent(
              pilotName.trim()
            );

          pilotList.appendChild(link);
        });

        rosterLoaded = true;

      } catch (error) {

        pilotList.textContent =
          error.message;

      } finally {

        rosterLoading = false;
      }
    }


    openRoster.addEventListener(
      'click',
      function () {

        rosterMenu.hidden =
          !rosterMenu.hidden;

        if (!rosterMenu.hidden) {
          loadRosterOnce();
        }
      }
    );


    document.addEventListener(
      'click',
      function (event) {

        const clickedInsideRoster =
          openRoster.contains(event.target) ||
          rosterMenu.contains(event.target);

        if (!clickedInsideRoster) {
          rosterMenu.hidden = true;
        }
      }
    );
  }

});
