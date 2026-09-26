document.addEventListener('DOMContentLoaded', () => {

  const pilotPhotosSheetUrl =
    'https://docs.google.com/spreadsheets/d/1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk/gviz/tq?tqx=out:csv&gid=1843730163';


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
      throw new Error(
        'Impossibile leggere il foglio Google'
      );
    }

    return parseCSV(
      await response.text()
    );
  }


  function parsePilotCoordinates(value) {
    const raw =
      String(value || '').trim();

    if (!raw) return null;

    const cleaned = raw
      .replace(/;/g, ',')
      .replace(/\s+/g, ' ');

    const match = cleaned.match(
      /(-?\d+(?:[\.,]\d+)?)\s*[, ]\s*(-?\d+(?:[\.,]\d+)?)/
    );

    if (!match) return null;

    const lat =
      parseFloat(
        match[1].replace(',', '.')
      );

    const lng =
      parseFloat(
        match[2].replace(',', '.')
      );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return null;
    }

    if (
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return null;
    }

    return { lat, lng };
  }


  function buildPilotMapGroups(rows) {
    const groups = new Map();

    rows.slice(1).forEach(row => {

      const pilotName =
        String(row[0] || '').trim();

      const coordinates =
        parsePilotCoordinates(row[3]);

      if (
        !pilotName ||
        !coordinates
      ) {
        return;
      }

      // Riduzione precisione posizione
      // a circa 1 km.
      const lat =
        Number(
          coordinates.lat.toFixed(2)
        );

      const lng =
        Number(
          coordinates.lng.toFixed(2)
        );

      const key =
        `${lat.toFixed(2)},${lng.toFixed(2)}`;

      if (!groups.has(key)) {

        groups.set(key, {
          lat,
          lng,
          pilots: []
        });
      }

      groups
        .get(key)
        .pilots
        .push(pilotName);
    });

    return Array.from(
      groups.values()
    );
  }


  async function initPilotMapFromSheet() {

    const mapEl =
      document.getElementById('pilotMap');

    if (
      !mapEl ||
      typeof L === 'undefined'
    ) {
      return;
    }

    try {

      const photoRows =
        await loadSheet(
          pilotPhotosSheetUrl
        );

      const pilotLocations =
        buildPilotMapGroups(photoRows);

      if (!pilotLocations.length) {
        return;
      }


      const map =
        L.map('pilotMap', {
          scrollWheelZoom: false
        }).setView(
          [42.8, 12.6],
          5.6
        );


      L.tileLayer(
        'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_3v5x_1_6575c6116c0e4ee017777007',
        {
          attribution:
            '&copy; ' +
            '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
            '&copy; ' +
            '<a href="https://carto.com/attributions">CARTO</a>',

          subdomains: 'abcd',
          maxZoom: 20
        }
      ).addTo(map);


      const bounds = [];


      pilotLocations.forEach(
        location => {

          bounds.push([
            location.lat,
            location.lng
          ]);


          const markerHtml =
            location.pilots.length > 1

              ? `<div class="fd-map-marker-count">
                   ${location.pilots.length}
                 </div>`

              : '<div class="fd-map-marker"></div>';


          const markerIcon =
            L.divIcon({
              className: '',
              html: markerHtml,

              iconSize:
                location.pilots.length > 1
                  ? [26, 26]
                  : [18, 18],

              iconAnchor:
                location.pilots.length > 1
                  ? [13, 13]
                  : [9, 9]
            });


          const sortedPilots =
            [...location.pilots]
              .sort(
                (a, b) =>
                  a.localeCompare(
                    b,
                    'it'
                  )
              );


          const popupEl =
            document.createElement('div');

          popupEl.className =
            'fd-map-popup';


          const popupTitle =
            document.createElement(
              'strong'
            );

          popupTitle.textContent =
            `${location.pilots.length} pilota/i`;


          const popupList =
            document.createElement('ul');


          sortedPilots.forEach(
            pilotName => {

              const item =
                document.createElement(
                  'li'
                );

              item.textContent =
                pilotName;

              popupList.appendChild(
                item
              );
            }
          );


          popupEl.appendChild(
            popupTitle
          );

          popupEl.appendChild(
            popupList
          );


          L.marker(
            [
              location.lat,
              location.lng
            ],
            {
              icon: markerIcon
            }
          )
            .addTo(map)
            .bindPopup(popupEl);

        }
      );


      if (bounds.length > 1) {

        map.fitBounds(
          bounds,
          {
            padding: [42, 42]
          }
        );

      } else {

        map.setView(
          bounds[0],
          8
        );
      }


    } catch (error) {

      console.error(
        'Errore caricamento mappa piloti:',
        error
      );

    }
  }


  initPilotMapFromSheet();

});
