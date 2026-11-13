/* ==========================================================
   PAGINA PROFILO PILOTA  (pilota.html?nome=<Pilota>)

   1. Riferimenti DOM e pilota selezionato
   2. Aspetto: divisa, logo reparto, foto profilo e sfondo
   3. Popup immagini (foto profilo / logo reparto)
   4. Statistiche
   5. Medagliere
      5a. Regole lette dal foglio RegoleMedaglie
      5b. Assegnazione medaglie (logica delle regole)
      5c. Rendering divisa: brevetto, badge, rack nastrini
      5d. Popup nastrini
   6. Avvio

   Richiede common.js (oggetto FD).
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {

  const {
    SHEETS,
    escapeHTML,
    safeAssetUrl,
    loadSheet,
    normalize,
    getCellByHeader
  } = FD;


  /* ----------------------------------------------------------
     1. RIFERIMENTI DOM E PILOTA SELEZIONATO
     ---------------------------------------------------------- */

  const pilotNameTitle     = document.getElementById('pilotNameTitle');
  const pilotStats         = document.getElementById('pilotStats');
  const pilotMedals        = document.getElementById('pilotMedals');
  const pilotBadges        = document.getElementById('pilotBadges');
  const pilotWingsElement  = document.getElementById('pilotWings');
  const pilotProfileImage  = document.getElementById('pilotProfileImage');
  const pilotAircraftLogo  = document.getElementById('pilotAircraftLogo');
  const pilotUniformBody   = document.getElementById('pilotUniformBody');
  const pilotUniformLapel  = document.getElementById('pilotUniformLapel');
  const pilotUniformAscot  = document.getElementById('pilotUniformAscot');

  const selectedPilot =
    new URLSearchParams(window.location.search).get('nome');

  if (!pilotNameTitle || !pilotStats) return;

  if (!selectedPilot) {
    pilotNameTitle.textContent = 'Pilota non selezionato';
    pilotStats.innerHTML =
      '<p class="muted">Torna al roster e seleziona un pilota.</p>';
    return;
  }

  pilotNameTitle.textContent = selectedPilot;


  /* Velivoli: logo reparto, titolo e descrizione del popup */
  const AIRCRAFT = {
    'F-16C': {
      logo: 'images/logo-f16.png',
      title: 'F-16C Fighting Falcon',
      description: 'Pilota assegnato al reparto F-16C.'
    },
    'F/A-18C': {
      logo: 'images/logo-fa18.png',
      title: 'F/A-18C Hornet',
      description: 'Pilota assegnato al reparto F/A-18C.'
    }
  };

  /* Colonna "Aereo Principale" (colonna D) del foglio Statistiche */
  function getMainAircraft(pilotRow) {
    return String(pilotRow[3] || '').trim().toUpperCase();
  }


  /* ----------------------------------------------------------
     2. ASPETTO: DIVISA, LOGO REPARTO, FOTO E SFONDO
     ---------------------------------------------------------- */

  async function loadPilotVisuals(pilotRow) {

    const aircraft  = getMainAircraft(pilotRow);
    const pilotName = String(pilotRow[0] || '').trim().toUpperCase();

    /* Ascot: solo per Polonio */
    if (pilotUniformAscot) {
      pilotUniformAscot.hidden = pilotName !== 'POLONIO';
    }

    /* Divisa: blu Navy per i piloti F/A-18C, standard per gli altri */
    const isNavyPilot = aircraft === 'F/A-18C';

    if (pilotUniformBody) {
      pilotUniformBody.src = isNavyPilot
        ? 'images/donkey_body_navy.webp'
        : 'images/donkey_body.webp';
    }

    if (pilotUniformLapel) {
      pilotUniformLapel.src = isNavyPilot
        ? 'images/donkey_rever_navy.webp'
        : 'images/donkey_rever.webp';
    }

    /* Logo reparto */
    if (pilotAircraftLogo && AIRCRAFT[aircraft]) {
      pilotAircraftLogo.src = AIRCRAFT[aircraft].logo;
      pilotAircraftLogo.hidden = false;
    }

    /* Foto profilo e immagine di sfondo dal foglio foto piloti */
    try {
      const photoRows = await loadSheet(SHEETS.pilotPhotos);
      const headers = photoRows[0] || [];

      const photoRow = photoRows
        .slice(1)
        .find(row => normalize(row[0]) === normalize(selectedPilot));

      if (photoRow) {
        const profileUrl = safeAssetUrl(
          getCellByHeader(headers, photoRow, 'FotoProfilo')
        );

        const headerUrl = safeAssetUrl(
          getCellByHeader(headers, photoRow, 'FotoHeader')
        );

        if (profileUrl && pilotProfileImage) {
          pilotProfileImage.src = profileUrl;
        }

        clearPageBackground();

        /* Lo sfondo viene applicato solo se l'immagine si carica davvero */
        if (headerUrl) {
          const testImage = new Image();

          testImage.onload = () => {
            document.body.style.setProperty('--pilot-page-bg', `url("${headerUrl}")`);
            document.body.classList.add('has-pilot-page-bg');
          };

          testImage.onerror = clearPageBackground;

          testImage.src = headerUrl;
        }
      }

    } catch (error) {
      console.warn('Immagini pilota non disponibili:', error);
    }

    setupPilotImagePopups(pilotRow);
  }


  function clearPageBackground() {
    document.body.style.removeProperty('--pilot-page-bg');
    document.body.classList.remove('has-pilot-page-bg');
  }


  /* ----------------------------------------------------------
     3. POPUP IMMAGINI (foto profilo / logo reparto)
     ---------------------------------------------------------- */

  function setupPilotImagePopups(pilotRow) {

    const modal            = document.getElementById('pilotImageModal');
    const closeBtn         = document.getElementById('closePilotImageModal');
    const modalImg         = document.getElementById('pilotImageModalImg');
    const modalTitle       = document.getElementById('pilotImageModalTitle');
    const modalDescription = document.getElementById('pilotImageModalDescription');

    if (!modal || !closeBtn || !modalImg || !modalTitle || !modalDescription) {
      return;
    }

    function openPilotImageModal(src, title, description) {
      modalImg.src = src;
      modalTitle.textContent = title;
      modalDescription.textContent = description;

      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    }

    function closePilotImageModal() {
      modal.hidden = true;
      modalImg.src = '';
      document.body.style.overflow = '';
    }

    closeBtn.onclick = closePilotImageModal;

    modal.onclick = event => {
      if (event.target === modal) {
        closePilotImageModal();
      }
    };

    if (pilotProfileImage) {
      pilotProfileImage.classList.add('pilot-clickable-image');

      pilotProfileImage.onclick = () => {
        openPilotImageModal(
          pilotProfileImage.src,
          selectedPilot,
          'Foto profilo del pilota.'
        );
      };
    }

    if (pilotAircraftLogo) {
      pilotAircraftLogo.classList.add('pilot-clickable-image');

      pilotAircraftLogo.onclick = () => {
        const info = AIRCRAFT[getMainAircraft(pilotRow)];

        openPilotImageModal(
          pilotAircraftLogo.src,
          info ? info.title : 'Reparto',
          info ? info.description : 'Logo di appartenenza del pilota.'
        );
      };
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden) {
        closePilotImageModal();
      }
    });
  }


  /* ----------------------------------------------------------
     4. STATISTICHE
     Una card per ogni colonna del foglio, esclusi:
     nome pilota, "Ultima attività", valori vuoti, 0 e FALSE.
     I valori TRUE diventano card "abilitazione" senza valore.
     ---------------------------------------------------------- */

  function renderPilotStats(headers, pilotRow) {

    const html = headers
      .map((header, index) => {

        if (!header || index === 0) return '';
        if (header.trim().toLowerCase() === 'ultima attività') return '';

        const value = String(pilotRow[index] || '').trim();

        if (value === '' || value === '0') return '';
        if (value.toUpperCase() === 'FALSE') return '';

        if (value.toUpperCase() === 'TRUE') {
          return `
                <div class="stat-card boolean-true">
                  <strong>${escapeHTML(header)}</strong>
                </div>
              `;
        }

        return `
              <div class="stat-card">
                <span>${escapeHTML(header)}</span>
                <strong>${escapeHTML(value)}</strong>
              </div>
            `;
      })
      .join('');

    pilotStats.innerHTML =
      html || '<p class="muted">Nessuna statistica disponibile.</p>';
  }


  /* ----------------------------------------------------------
     5. MEDAGLIERE
     ---------------------------------------------------------- */

  /* Medaglie con logica dedicata (non seguono le regole generiche) */
  const SPECIAL_MEDALS = ['FCR_VET', 'ASTRA', 'ASTRA_MAJ'];

  /* "Per Aspera ad Astra": soglia minima di altitudine */
  const ASTRA_STAT = 'Record Altitudine di Squadriglia';
  const ASTRA_MIN_ALTITUDE = 65000;

  /* Limiti di visualizzazione sulla divisa */
  const MAX_RIBBONS = 20;
  const MAX_BADGES  = 3;
  const MAX_WINGS   = 1;

  /* Rack nastrini: righe basse da 3, righe alte (bavero) da 2 */
  const LOWER_ROWS = 5;
  const LOWER_ROW_SIZE = 3;
  const UPPER_ROW_SIZE = 2;


  function toNumber(value) {
    const number = Number(String(value || '').replace(',', '.'));
    return isNaN(number) ? 0 : number;
  }

  function isTrue(value) {
    return ['TRUE', 'VERO'].includes(String(value || '').trim().toUpperCase());
  }


  /* ---------- 5a. Regole dal foglio RegoleMedaglie ----------
     Colonne:
       A med                 codice medaglia (es. FCR, FCR_VET, ASTRA)
       B statistica          nome della colonna nel foglio Statistiche
       C tipo                BOOL / TESTO / NUM, con eventuali suffissi
                             BADGE (abilitazione) o WINGS (brevetto)
       D valore              valore atteso / soglia numerica
       F img                 immagine del nastrino
       G descrizione         testo del popup
       H immagineDettaglio   immagine extra nel popup
       I titolo              titolo del popup
  ------------------------------------------------------------ */

  function parseMedalRules(rulesRows) {
    return rulesRows.slice(1).map(row => ({
      med:               String(row[0] || '').trim(),
      statistica:        String(row[1] || '').trim(),
      tipo:              String(row[2] || '').trim().toUpperCase(),
      valore:            String(row[3] || '').trim(),
      img:               String(row[5] || '').trim(),
      descrizione:       String(row[6] || '').trim(),
      immagineDettaglio: String(row[7] || '').trim(),
      titolo:            String(row[8] || '').trim()
    }));
  }


  /* ---------- 5b. Assegnazione medaglie ----------
     Restituisce l'elenco ordinato delle medaglie guadagnate:
       1. FCR Veterano (in testa)
       2. regole BOOL / TESTO, nell'ordine del foglio
       3. regole NUM: solo il livello più alto per statistica
       4. Per Aspera ad Astra
  ------------------------------------------------ */

  function computeEarnedMedals(statsRows, rules, pilotRow) {

    const headers = statsRows[0] || [];

    /* Legge una statistica usando il NOME dell'intestazione */
    const valStat = (headerName, row = pilotRow) =>
      getCellByHeader(headers, row, headerName);

    const hasStat = headerName =>
      headers.some(header => normalize(header) === normalize(headerName));


    /* Avviso in console se RegoleMedaglie cita una colonna
       che non esiste nel foglio Statistiche */
    const missingStats = [
      ...new Set(
        rules
          .filter(rule => !rule.tipo.includes('BADGE'))
          .map(rule => rule.statistica)
          .filter(statistica => statistica && !hasStat(statistica))
      )
    ];

    if (missingStats.length) {
      console.warn('Statistiche medaglie non trovate:', missingStats);
    }


    const medals = [];


    /* FCR Veterano: livello FCR + almeno 4 anni di attività */
    const isVet =
      normalize(valStat('Livello Pilota')) === 'fcr' &&
      toNumber(valStat('Anni di Attività')) >= 4;


    /* Abilitazioni velivoli del pilota (usate dai badge TESTO_BADGE) */
    const pilotAircraftQualifications = [
      valStat('Aereo Principale'),
      valStat('Aereo Secondario'),
      valStat('Aereo WW2')
    ]
      .map(value => String(value || '').trim())
      .filter(Boolean);


    /* --- Regole BOOL e TESTO --- */
    rules.forEach(rule => {

      if (!rule.med || !rule.img || !rule.statistica) return;

      if (SPECIAL_MEDALS.includes(rule.med)) return;

      if (!rule.tipo.includes('BOOL') && !rule.tipo.includes('TESTO')) return;

      /* Il veterano non mostra anche il normale nastrino FCR */
      if (rule.med === 'FCR' && isVet) return;

      const dato = valStat(rule.statistica);

      /* BOOL: la statistica deve essere TRUE / VERO */
      if (rule.tipo.includes('BOOL') && isTrue(dato)) {
        medals.push(rule);
      }

      if (rule.tipo.includes('TESTO')) {

        if (rule.tipo.includes('BADGE')) {
          /* Badge abilitazione: il velivolo della regola deve essere
             fra Aereo Principale, Secondario o WW2 del pilota */
          const hasQualification = pilotAircraftQualifications.some(
            aircraft => normalize(aircraft) === normalize(rule.valore)
          );

          if (hasQualification) {
            medals.push(rule);
          }

        } else if (normalize(dato) === normalize(rule.valore)) {
          /* TESTO normale: la statistica deve avere il valore indicato */
          medals.push(rule);
        }
      }
    });


    /* --- FCR Veterano (in testa all'elenco) --- */
    if (isVet) {
      const fcrVet = rules.find(rule => rule.med === 'FCR_VET');

      if (fcrVet && fcrVet.img) {
        medals.unshift(fcrVet);
      }
    }


    /* --- Regole NUM ---
       Per ogni statistica numerica si assegna solo il livello
       più alto raggiunto (valore della regola <= valore del pilota). */
    const numericStats = [
      ...new Set(
        rules
          .filter(rule => rule.statistica && rule.tipo.includes('NUM'))
          .map(rule => rule.statistica)
      )
    ];

    numericStats.forEach(statistica => {

      const value = toNumber(valStat(statistica));

      const candidates = rules
        .filter(rule =>
          normalize(rule.statistica) === normalize(statistica) &&
          rule.tipo.includes('NUM') &&
          toNumber(rule.valore) <= value
        )
        .sort((a, b) => toNumber(b.valore) - toNumber(a.valore));

      if (candidates[0] && candidates[0].img) {
        medals.push(candidates[0]);
      }
    });


    /* --- Per Aspera ad Astra ---
       Altitudine >= 65.000: ASTRA_MAJ al detentore del record
       di squadriglia, ASTRA a tutti gli altri. */
    const astraValue = toNumber(valStat(ASTRA_STAT));

    const allAstraValues = statsRows
      .slice(1)
      .map(row => toNumber(valStat(ASTRA_STAT, row)))
      .filter(value => value > 0);

    const maxAstraValue = allAstraValues.length
      ? Math.max(...allAstraValues)
      : 0;

    if (astraValue >= ASTRA_MIN_ALTITUDE) {
      const astraCode = astraValue === maxAstraValue ? 'ASTRA_MAJ' : 'ASTRA';
      const astraRule = rules.find(rule => rule.med === astraCode);

      if (astraRule && astraRule.img) {
        medals.push(astraRule);
      }
    }

    return medals;
  }


  /* ---------- 5c. Rendering sulla divisa ---------- */

  /* <img> cliccabile che apre il popup del nastrino */
  function medalImageHTML(rule, extraClass) {
    const imageUrl = safeAssetUrl(rule.img);
    const extraImageUrl = safeAssetUrl(rule.immagineDettaglio);

    return `<img
        src="${escapeHTML(imageUrl)}"
        alt="${escapeHTML(rule.med || '')}"
        class="${extraClass}"
        data-title="${escapeHTML(rule.titolo || rule.med || '')}"
        data-description="${escapeHTML(rule.descrizione || '')}"
        data-image="${escapeHTML(imageUrl)}"
        data-extra="${escapeHTML(extraImageUrl)}"
        loading="lazy"
        decoding="async">`;
  }

  /* Solo le medaglie con un'immagine valida, dopo il limite */
  function visibleOnly(rules, max) {
    return rules
      .slice(0, max)
      .filter(rule => safeAssetUrl(rule.img));
  }


  /*
   * Numero di nastrini per riga, dall'alto verso il basso.
   *
   * - Fino a 15 nastrini: righe da 3; l'eventuale riga
   *   incompleta sta in cima (centrata).
   * - Oltre 15: le 5 righe basse sono piene (3 ciascuna),
   *   i nastrini in più salgono verso il bavero in righe
   *   da 2 (allineate a destra), con la riga incompleta in cima.
   */
  function getRibbonRowCounts(total) {
    const lowerCapacity = LOWER_ROWS * LOWER_ROW_SIZE;
    const rowCounts = [];

    if (total <= lowerCapacity) {
      const remainder = total % LOWER_ROW_SIZE;

      if (remainder > 0) rowCounts.push(remainder);

      for (let i = 0; i < Math.floor(total / LOWER_ROW_SIZE); i++) {
        rowCounts.push(LOWER_ROW_SIZE);
      }

    } else {
      const upperCount = total - lowerCapacity;

      if (upperCount % UPPER_ROW_SIZE > 0) rowCounts.push(1);

      for (let i = 0; i < Math.floor(upperCount / UPPER_ROW_SIZE); i++) {
        rowCounts.push(UPPER_ROW_SIZE);
      }

      for (let i = 0; i < LOWER_ROWS; i++) {
        rowCounts.push(LOWER_ROW_SIZE);
      }
    }

    return rowCounts;
  }


  function renderWings(wings) {
    if (!pilotWingsElement) return;

    const visibleWings = visibleOnly(wings, MAX_WINGS);

    if (visibleWings.length) {
      pilotWingsElement.innerHTML = `
      ${medalImageHTML(visibleWings[0], 'ribbon-clickable pilot-wings-image')}
    `;
      pilotWingsElement.hidden = false;

    } else {
      pilotWingsElement.innerHTML = '';
      pilotWingsElement.hidden = true;
    }
  }


  function renderBadges(badges) {
    if (!pilotBadges) return;

    const visibleBadges = visibleOnly(badges, MAX_BADGES);

    pilotBadges.innerHTML = visibleBadges
      .map(rule => `
    <div class="qualification-badge-slot">
      ${medalImageHTML(rule, 'ribbon-clickable qualification-badge')}
    </div>
  `)
      .join('');

    pilotBadges.hidden = visibleBadges.length === 0;
  }


  function renderRibbonRack(ribbons) {
    const visibleMedals = visibleOnly(ribbons, MAX_RIBBONS);

    if (!visibleMedals.length) {
      pilotMedals.innerHTML = '';
      return;
    }

    const rowCounts = getRibbonRowCounts(visibleMedals.length);
    const rows = [];
    let index = 0;

    rowCounts.forEach((count, rowIndex) => {
      const rowMedals = visibleMedals.slice(index, index + count);

      /* Le righe sopra le 5 basse sono nella zona del bavero */
      const rowsBelow = rowCounts.length - rowIndex - 1;
      const alignmentClass = rowsBelow >= LOWER_ROWS
        ? 'ribbon-row-right'
        : 'ribbon-row-center';

      rows.push(`
        <div class="ribbon-row ribbon-count-${count} ${alignmentClass}">
          ${rowMedals.map(rule => `
    <div class="ribbon-slot">
      ${medalImageHTML(rule, 'ribbon-clickable')}
    </div>
  `).join('')}
        </div>
      `);

      index += count;
    });

    pilotMedals.innerHTML = rows.join('');
  }


  function renderMedals(statsRows, rulesRows, pilotRow) {
    if (!pilotMedals) return;

    const rules  = parseMedalRules(rulesRows);
    const medals = computeEarnedMedals(statsRows, rules, pilotRow);

    /* Separazione per tipo:
       - BADGE -> abilitazioni (sotto il rack)
       - WINGS -> brevetto (sopra il taschino)
       - tutto il resto -> nastrini */
    const ribbons = medals.filter(
      rule => !rule.tipo.includes('BADGE') && !rule.tipo.includes('WINGS')
    );
    const badges = medals.filter(rule => rule.tipo.includes('BADGE'));
    const wings  = medals.filter(rule => rule.tipo.includes('WINGS'));

    renderWings(wings);
    renderBadges(badges);
    renderRibbonRack(ribbons);
    setupRibbonPopup();
  }


  /* ---------- 5d. Popup nastrini ---------- */

  function setupRibbonPopup() {

    const ribbonModal            = document.getElementById('ribbonModal');
    const ribbonModalImage       = document.getElementById('ribbonModalImage');
    const ribbonModalTitle       = document.getElementById('ribbonModalTitle');
    const ribbonModalDescription = document.getElementById('ribbonModalDescription');
    const ribbonModalExtraImage  = document.getElementById('ribbonModalExtraImage');
    const closeRibbonModal       = document.getElementById('closeRibbonModal');

    document.querySelectorAll('.ribbon-clickable').forEach(ribbon => {
      ribbon.addEventListener('click', () => {

        if (
          !ribbonModal ||
          !ribbonModalImage ||
          !ribbonModalTitle ||
          !ribbonModalDescription ||
          !ribbonModalExtraImage
        ) {
          return;
        }

        ribbonModalImage.src = ribbon.dataset.image || '';
        ribbonModalTitle.textContent = ribbon.dataset.title || '';
        ribbonModalDescription.textContent = ribbon.dataset.description || '';

        if (ribbon.dataset.extra) {
          ribbonModalExtraImage.src = ribbon.dataset.extra;
          ribbonModalExtraImage.style.display = 'block';
        } else {
          ribbonModalExtraImage.src = '';
          ribbonModalExtraImage.style.display = 'none';
        }

        ribbonModal.hidden = false;
      });
    });

    if (closeRibbonModal && ribbonModal) {
      closeRibbonModal.onclick = () => {
        ribbonModal.hidden = true;
      };

      ribbonModal.onclick = event => {
        if (event.target === ribbonModal) {
          ribbonModal.hidden = true;
        }
      };
    }
  }


  /* ----------------------------------------------------------
     6. AVVIO
     ---------------------------------------------------------- */

  function showLoadError(message) {
    pilotStats.innerHTML = message;

    if (pilotMedals) {
      pilotMedals.innerHTML =
        '<p class="muted">Medagliere non disponibile.</p>';
    }
  }


  async function initPilotPage() {
    try {
      /* Un'unica richiesta Statistiche, usata da stats e medaglie */
      const [statsRows, rulesRows] = await Promise.all([
        loadSheet(SHEETS.stats),
        loadSheet(SHEETS.medalRules)
      ]);

      const headers = statsRows[0] || [];

      const pilotRow = statsRows
        .slice(1)
        .find(row => normalize(row[0]) === normalize(selectedPilot));

      if (!pilotRow) {
        showLoadError(
          '<p class="muted">Statistiche non trovate per questo pilota.</p>'
        );
        return;
      }

      renderPilotStats(headers, pilotRow);
      renderMedals(statsRows, rulesRows, pilotRow);

      /* Foto e sfondo si caricano a parte, senza bloccare le statistiche */
      loadPilotVisuals(pilotRow);

    } catch (error) {
      console.error('Errore pagina pilota:', error);

      showLoadError(`<p class="muted">${escapeHTML(error.message)}</p>`);
    }
  }


  initPilotPage();
});
