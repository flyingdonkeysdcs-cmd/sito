/* ==========================================================
   DOVE SIAMO (dove-siamo.html)
   Mappa Leaflet con la posizione approssimativa dei piloti,
   letta dalla colonna D del foglio foto piloti.
   Piloti nella stessa zona (~1 km) vengono raggruppati.

   Richiede Leaflet e common.js (oggetto FD).
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const { SHEETS, loadSheet } = FD;

  const MAP_CENTER_ITALY = [42.8, 12.6];
  const MAP_ZOOM_ITALY = 5.6;
  const MAP_ZOOM_SINGLE = 8;

  const TILE_URL =
    'https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_3v5x_1_6575c6116c0e4ee017777007';

  const TILE_ATTRIBUTION =
    '&copy; ' +
    '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, ' +
    '&copy; ' +
    '<a href="https://carto.com/attributions">CARTO</a>';


  /*
   * Coordinate "lat, lng" (accetta anche ";" o spazio come
   * separatore e la virgola decimale). Restituisce null se
   * il valore non è valido.
   */
  function parsePilotCoordinates(value) {
    const raw = String(value || '').trim();

    if (!raw) return null;

    const cleaned = raw
      .replace(/;/g, ',')
      .replace(/\s+/g, ' ');

    const match = cleaned.match(
      /(-?\d+(?:[\.,]\d+)?)\s*[, ]\s*(-?\d+(?:[\.,]\d+)?)/
    );

    if (!match) return null;

    const lat = parseFloat(match[1].replace(',', '.'));
    const lng = parseFloat(match[2].replace(',', '.'));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
  }


  /* Raggruppa i piloti per posizione arrotondata a 2 decimali (~1 km) */
  function buildPilotMapGroups(rows) {
    const groups = new Map();

    rows.slice(1).forEach(row => {
      const pilotName = String(row[0] || '').trim();
      const coordinates = parsePilotCoordinates(row[3]);

      if (!pilotName || !coordinates) return;

      const lat = Number(coordinates.lat.toFixed(2));
      const lng = Number(coordinates.lng.toFixed(2));
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;

      if (!groups.has(key)) {
        groups.set(key, { lat, lng, pilots: [] });
      }

      groups.get(key).pilots.push(pilotName);
    });

    return Array.from(groups.values());
  }


  /* Marker: punto singolo oppure cerchio con il numero di piloti */
  function createMarkerIcon(pilotCount) {
    const isGroup = pilotCount > 1;

    return L.divIcon({
      className: '',
      html: isGroup
        ? `<div class="fd-map-marker-count">
                   ${pilotCount}
                 </div>`
        : '<div class="fd-map-marker"></div>',
      iconSize:   isGroup ? [26, 26] : [18, 18],
      iconAnchor: isGroup ? [13, 13] : [9, 9]
    });
  }


  /* Popup: numero di piloti + elenco alfabetico */
  function createPopup(pilots) {
    const popupEl = document.createElement('div');
    popupEl.className = 'fd-map-popup';

    const popupTitle = document.createElement('strong');
    popupTitle.textContent = `${pilots.length} pilota/i`;

    const popupList = document.createElement('ul');

    [...pilots]
      .sort((a, b) => a.localeCompare(b, 'it'))
      .forEach(pilotName => {
        const item = document.createElement('li');
        item.textContent = pilotName;
        popupList.appendChild(item);
      });

    popupEl.append(popupTitle, popupList);

    return popupEl;
  }


  async function initPilotMapFromSheet() {
    const mapEl = document.getElementById('pilotMap');

    if (!mapEl || typeof L === 'undefined') return;

    try {
      const photoRows = await loadSheet(SHEETS.pilotPhotos);
      const pilotLocations = buildPilotMapGroups(photoRows);

      if (!pilotLocations.length) return;

      const map = L.map('pilotMap', { scrollWheelZoom: false })
        .setView(MAP_CENTER_ITALY, MAP_ZOOM_ITALY);

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      const bounds = [];

      pilotLocations.forEach(location => {
        bounds.push([location.lat, location.lng]);

        L.marker([location.lat, location.lng], {
          icon: createMarkerIcon(location.pilots.length)
        })
          .addTo(map)
          .bindPopup(createPopup(location.pilots));
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [42, 42] });
      } else {
        map.setView(bounds[0], MAP_ZOOM_SINGLE);
      }

    } catch (error) {
      console.error('Errore caricamento mappa piloti:', error);
    }
  }


  initPilotMapFromSheet();
});
