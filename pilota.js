document.addEventListener('DOMContentLoaded', () => {

  const statsSheetUrl =
    'https://docs.google.com/spreadsheets/d/1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk/gviz/tq?tqx=out:csv&gid=1481970459';

  const medalRulesSheetUrl =
    'https://docs.google.com/spreadsheets/d/1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk/gviz/tq?tqx=out:csv&gid=2068617911';

  const pilotPhotosSheetUrl =
    'https://docs.google.com/spreadsheets/d/1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk/gviz/tq?tqx=out:csv&gid=1843730163';


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


  function safeAssetUrl(value) {
    const rawValue =
      String(value ?? '').trim();

    const invalidValues = [
      '',
      '-',
      'n/a',
      'na',
      'null',
      'undefined'
    ];

    if (
      invalidValues.includes(
        rawValue.toLowerCase()
      )
    ) {
      return '';
    }

    try {
      const url =
        new URL(
          rawValue,
          window.location.href
        );

      return ['http:', 'https:']
        .includes(url.protocol)
        ? url.href
        : '';

    } catch {
      return '';
    }
  }


  function parseCSV(text) {
    const rows = [];

    let row = [];
    let cell = '';
    let insideQuotes = false;

    for (
      let i = 0;
      i < text.length;
      i++
    ) {

      const char = text[i];
      const next = text[i + 1];

      if (
        char === '"' &&
        insideQuotes &&
        next === '"'
      ) {

        cell += '"';
        i++;

      } else if (char === '"') {

        insideQuotes =
          !insideQuotes;

      } else if (
        char === ',' &&
        !insideQuotes
      ) {

        row.push(cell.trim());
        cell = '';

      } else if (
        (char === '\n' ||
         char === '\r') &&
        !insideQuotes
      ) {

        if (
          char === '\r' &&
          next === '\n'
        ) {
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
      row =>
        row.some(
          cell => cell !== ''
        )
    );
  }


  async function loadSheet(url) {
    const response =
      await fetch(url);

    if (!response.ok) {
      throw new Error(
        'Impossibile leggere il foglio Google'
      );
    }

    return parseCSV(
      await response.text()
    );
  }


  function normalize(value) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }


  function getCellByHeader(
    headers,
    row,
    headerName
  ) {

    const index =
      headers.findIndex(
        header =>
          normalize(header) ===
          normalize(headerName)
      );

    return index >= 0
      ? String(row[index] || '')
          .trim()
      : '';
  }


  const pilotNameTitle =
    document.getElementById(
      'pilotNameTitle'
    );

  const pilotStats =
    document.getElementById(
      'pilotStats'
    );

  const pilotMedals =
    document.getElementById(
      'pilotMedals'
    );

  const pilotProfileImage =
    document.getElementById(
      'pilotProfileImage'
    );

  const pilotAircraftLogo =
    document.getElementById(
      'pilotAircraftLogo'
    );
const pilotUniformBody =
  document.getElementById(
    'pilotUniformBody'
  );

const pilotUniformLapel =
  document.getElementById(
    'pilotUniformLapel'
  );

  const pilotUniformAscot =
  document.getElementById(
    'pilotUniformAscot'
  );
  
  const params =
    new URLSearchParams(
      window.location.search
    );

  const selectedPilot =
    params.get('nome');


  if (
    !pilotNameTitle ||
    !pilotStats
  ) {
    return;
  }


  if (!selectedPilot) {

    pilotNameTitle.textContent =
      'Pilota non selezionato';

    pilotStats.innerHTML =
      '<p class="muted">Torna al roster e seleziona un pilota.</p>';

    return;
  }


  pilotNameTitle.textContent =
    selectedPilot;


  function setupPilotImagePopups(
    pilotRow
  ) {

    const modal =
      document.getElementById(
        'pilotImageModal'
      );

    const closeBtn =
      document.getElementById(
        'closePilotImageModal'
      );

    const modalImg =
      document.getElementById(
        'pilotImageModalImg'
      );

    const modalTitle =
      document.getElementById(
        'pilotImageModalTitle'
      );

    const modalDescription =
      document.getElementById(
        'pilotImageModalDescription'
      );


    if (
      !modal ||
      !closeBtn ||
      !modalImg ||
      !modalTitle ||
      !modalDescription
    ) {
      return;
    }


    function openPilotImageModal(
      src,
      title,
      description
    ) {

      modalImg.src = src;

      modalTitle.textContent =
        title;

      modalDescription.textContent =
        description;

      modal.hidden = false;

      document.body.style.overflow =
        'hidden';
    }


    function closePilotImageModal() {

      modal.hidden = true;
      modalImg.src = '';

      document.body.style.overflow =
        '';
    }


    closeBtn.onclick =
      closePilotImageModal;


    modal.onclick = event => {

      if (event.target === modal) {
        closePilotImageModal();
      }
    };


    if (pilotProfileImage) {

      pilotProfileImage.classList.add(
        'pilot-clickable-image'
      );

      pilotProfileImage.onclick =
        () => {

          openPilotImageModal(
            pilotProfileImage.src,
            selectedPilot,
            'Foto profilo del pilota.'
          );
        };
    }


    if (pilotAircraftLogo) {

      pilotAircraftLogo.classList.add(
        'pilot-clickable-image'
      );

      pilotAircraftLogo.onclick =
        () => {

          const aircraft =
            String(
              pilotRow[3] || ''
            )
              .trim()
              .toUpperCase();
          const isNavyPilot =
  aircraft === 'F/A-18C';


if (pilotUniformBody) {

  pilotUniformBody.src =
    isNavyPilot
      ? 'images/donkey_body_navy.webp'
      : 'images/donkey_body.webp';
}


if (pilotUniformLapel) {

  pilotUniformLapel.src =
    isNavyPilot
      ? 'images/donkey_rever_navy.webp'
      : 'images/donkey_rever.webp';
}
          let title =
            'Reparto';

          let description =
            'Logo di appartenenza del pilota.';


          if (aircraft === 'F-16C') {

            title =
              'F-16C Fighting Falcon';

            description =
              'Pilota assegnato al reparto F-16C.';
          }


          if (
            aircraft ===
            'F/A-18C'
          ) {

            title =
              'F/A-18C Hornet';

            description =
              'Pilota assegnato al reparto F/A-18C.';
          }


          openPilotImageModal(
            pilotAircraftLogo.src,
            title,
            description
          );
        };
    }


    document.addEventListener(
      'keydown',
      event => {

        if (
          event.key === 'Escape' &&
          !modal.hidden
        ) {
          closePilotImageModal();
        }
      }
    );
  }


  async function loadPilotVisuals(
  pilotRow
) {

  const aircraft =
    String(pilotRow[3] || '')
      .trim()
      .toUpperCase();

const pilotName =
  String(pilotRow[0] || '')
    .trim()
    .toUpperCase();


if (pilotUniformAscot) {

  pilotUniformAscot.hidden =
    pilotName !== 'POLONIO';
}
    
  /* Uniform selection */

  const isNavyPilot =
    aircraft === 'F/A-18C';


  if (pilotUniformBody) {

    pilotUniformBody.src =
      isNavyPilot
        ? 'images/donkey_body_navy.webp'
        : 'images/donkey_body.webp';
  }


  if (pilotUniformLapel) {

    pilotUniformLapel.src =
      isNavyPilot
        ? 'images/donkey_rever_navy.webp'
        : 'images/donkey_rever.webp';
  }


  /* Aircraft logo */

  if (pilotAircraftLogo) {

    let logoUrl = '';

    if (aircraft === 'F-16C') {
      logoUrl =
        'images/logo-f16.png';
    }

    if (
      aircraft === 'F/A-18C'
    ) {
      logoUrl =
        'images/logo-fa18.png';
    }

    if (logoUrl) {

      pilotAircraftLogo.src =
        logoUrl;

      pilotAircraftLogo.hidden =
        false;
    }
  }


  try {

      const photoRows =
        await loadSheet(
          pilotPhotosSheetUrl
        );

      const headers =
        photoRows[0] || [];

      const photoRow =
        photoRows
          .slice(1)
          .find(
            row =>
              normalize(row[0]) ===
              normalize(selectedPilot)
          );


      if (photoRow) {

        const profileUrl =
          safeAssetUrl(
            getCellByHeader(
              headers,
              photoRow,
              'FotoProfilo'
            )
          );

        const headerUrl =
          safeAssetUrl(
            getCellByHeader(
              headers,
              photoRow,
              'FotoHeader'
            )
          );


        if (
          profileUrl &&
          pilotProfileImage
        ) {

          pilotProfileImage.src =
            profileUrl;
        }


        document.body.style
          .removeProperty(
            '--pilot-page-bg'
          );

        document.body.classList
          .remove(
            'has-pilot-page-bg'
          );


        if (headerUrl) {

          const testImage =
            new Image();

          testImage.onload =
            () => {

              document.body.style
                .setProperty(
                  '--pilot-page-bg',
                  `url("${headerUrl}")`
                );

              document.body
                .classList
                .add(
                  'has-pilot-page-bg'
                );
            };


          testImage.onerror =
            () => {

              document.body.style
                .removeProperty(
                  '--pilot-page-bg'
                );

              document.body
                .classList
                .remove(
                  'has-pilot-page-bg'
                );
            };


          testImage.src =
            headerUrl;
        }
      }

    } catch (error) {

      console.warn(
        'Immagini pilota non disponibili:',
        error
      );
    }


    setupPilotImagePopups(
      pilotRow
    );
  }


  function renderPilotStats(
    headers,
    pilotRow
  ) {

    const html =
      headers
        .map(
          (header, index) => {

            if (
              !header ||
              index === 0
            ) {
              return '';
            }


            if (
              header
                .trim()
                .toLowerCase() ===
              'ultima attività'
            ) {
              return '';
            }


            const value =
              String(
                pilotRow[index] || ''
              ).trim();


            if (
              value === '' ||
              value === '0'
            ) {
              return '';
            }


            if (
              value.toUpperCase() ===
              'FALSE'
            ) {
              return '';
            }


            if (
              value.toUpperCase() ===
              'TRUE'
            ) {

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
          }
        )
        .join('');


    pilotStats.innerHTML =
      html ||
      '<p class="muted">Nessuna statistica disponibile.</p>';
  }


  function renderMedals(
  statsRows,
  rulesRows,
  pilotRow
) {

  if (!pilotMedals) return;


  const headers =
    statsRows[0] || [];


  // Legge una statistica usando il NOME
  // dell'intestazione, non la lettera Excel.
  function valStat(
    headerName,
    row = pilotRow
  ) {

    return getCellByHeader(
      headers,
      row,
      headerName
    );
  }


  function hasStat(headerName) {

    return headers.some(
      header =>
        normalize(header) ===
        normalize(headerName)
    );
  }


  function toNumber(value) {

    const number =
      Number(
        String(value || '')
          .replace(',', '.')
      );

    return isNaN(number)
      ? 0
      : number;
  }


  function isTrue(value) {

    return [
      'TRUE',
      'VERO'
    ].includes(
      String(value || '')
        .trim()
        .toUpperCase()
    );
  }


  const rules =
    rulesRows
      .slice(1)
      .map(row => ({

        med:
          String(row[0] || '')
            .trim(),

        statistica:
          String(row[1] || '')
            .trim(),

        tipo:
          String(row[2] || '')
            .trim()
            .toUpperCase(),

        valore:
          String(row[3] || '')
            .trim(),

        img:
          String(row[5] || '')
            .trim(),

        descrizione:
          String(row[6] || '')
            .trim(),

        immagineDettaglio:
          String(row[7] || '')
            .trim(),

        titolo:
          String(row[8] || '')
            .trim()
      }));


  // Utile per accorgersi subito se nel foglio
  // RegoleMedaglie c'è un nome non corrispondente
  // alle intestazioni di Statistiche.
  const missingStats =
    [
      ...new Set(
        rules
          .map(
            rule =>
              rule.statistica
          )
          .filter(
            statistica =>
              statistica &&
              !hasStat(statistica)
          )
      )
    ];


  if (missingStats.length) {

    console.warn(
      'Statistiche medaglie non trovate:',
      missingStats
    );
  }


  const medals = [];


  // FCR Veterano:
  // FCR + almeno 4 anni di attività.
  const isVet =
    normalize(
      valStat(
        'Livello Pilota'
      )
    ) === 'fcr' &&

    toNumber(
      valStat(
        'Anni di Attività'
      )
    ) >= 4;


  // ==========================================
  // BOOL + TESTO
  // ==========================================

  rules.forEach(rule => {

    if (
      !rule.med ||
      !rule.img ||
      !rule.statistica
    ) {
      return;
    }


    // Queste vengono gestite separatamente.
    if (
      [
        'FCR_VET',
        'ASTRA',
        'ASTRA_MAJ'
      ].includes(rule.med)
    ) {
      return;
    }


    if (
      !rule.tipo.includes('BOOL') &&
      !rule.tipo.includes('TESTO')
    ) {
      return;
    }


    // Se è veterano non mostrare anche
    // il normale nastrino FCR.
    if (
      rule.med === 'FCR' &&
      isVet
    ) {
      return;
    }


    const dato =
      valStat(
        rule.statistica
      );


    if (
      rule.tipo.includes('BOOL') &&
      isTrue(dato)
    ) {

      medals.push(rule);
    }


    if (
      rule.tipo.includes('TESTO') &&
      normalize(dato) ===
        normalize(rule.valore)
    ) {

      medals.push(rule);
    }
  });


  // ==========================================
  // FCR VETERANO
  // ==========================================

  if (isVet) {

    const fcrVet =
      rules.find(
        rule =>
          rule.med ===
          'FCR_VET'
      );


    if (
      fcrVet &&
      fcrVet.img
    ) {

      medals.unshift(
        fcrVet
      );
    }
  }


  // ==========================================
  // MEDAGLIE NUMERICHE
  // ==========================================
  //
  // Non esiste più la lista:
  //
  // H, J, U, V, W...
  //
  // Leggiamo automaticamente tutte le
  // statistiche NUM definite in RegoleMedaglie.

  const numericStats =
    [
      ...new Set(
        rules
          .filter(
            rule =>
              rule.statistica &&
              rule.tipo.includes('NUM')
          )
          .map(
            rule =>
              rule.statistica
          )
      )
    ];


  numericStats.forEach(
    statistica => {

      const value =
        toNumber(
          valStat(
            statistica
          )
        );


      const candidates =
        rules
          .filter(
            rule =>

              normalize(
                rule.statistica
              ) ===
                normalize(
                  statistica
                ) &&

              rule.tipo
                .includes('NUM') &&

              toNumber(
                rule.valore
              ) <= value
          )
          .sort(
            (a, b) =>
              toNumber(b.valore) -
              toNumber(a.valore)
          );


      // Prende solamente il livello più alto
      // raggiunto per quella statistica.
      if (
        candidates[0] &&
        candidates[0].img
      ) {

        medals.push(
          candidates[0]
        );
      }
    }
  );


  // ==========================================
  // PER ASPERA AD ASTRA
  // ==========================================

  const astraStat =
    'Record Altitudine di Squadriglia';


  const astraValue =
    toNumber(
      valStat(
        astraStat
      )
    );


  const allAstraValues =
    statsRows
      .slice(1)
      .map(
        row =>
          toNumber(
            valStat(
              astraStat,
              row
            )
          )
      )
      .filter(
        value => value > 0
      );


  const maxAstraValue =
    allAstraValues.length
      ? Math.max(
          ...allAstraValues
        )
      : 0;


  if (astraValue >= 65000) {

    const astraRule =
      rules.find(
        rule =>
          rule.med ===
          (
            astraValue ===
            maxAstraValue
              ? 'ASTRA_MAJ'
              : 'ASTRA'
          )
      );


    if (
      astraRule &&
      astraRule.img
    ) {

      medals.push(
        astraRule
      );
    }
  }


  // ==========================================
  // HTML NASTRINI
  // ==========================================

  const medalsHtml =
    medals
      .slice(0, 20)
      .map(rule => {

        const imageUrl =
          safeAssetUrl(
            rule.img
          );

        const extraImageUrl =
          safeAssetUrl(
            rule.immagineDettaglio
          );


        if (!imageUrl) {
          return '';
        }


        return `
          <div class="ribbon-slot">
            <img
              src="${escapeHTML(imageUrl)}"
              alt="${escapeHTML(rule.med || '')}"
              class="ribbon-clickable"
              data-title="${escapeHTML(rule.titolo || rule.med || '')}"
              data-description="${escapeHTML(rule.descrizione || '')}"
              data-image="${escapeHTML(imageUrl)}"
              data-extra="${escapeHTML(extraImageUrl)}"
              loading="lazy"
              decoding="async">
          </div>
        `;
      })
      .join('');


  pilotMedals.innerHTML =
    medalsHtml ||
    '<p class="muted">Nessun nastrino assegnato.</p>';


  // ==========================================
  // POPUP NASTRINI
  // ==========================================

  const ribbonModal =
    document.getElementById(
      'ribbonModal'
    );

  const ribbonModalImage =
    document.getElementById(
      'ribbonModalImage'
    );

  const ribbonModalTitle =
    document.getElementById(
      'ribbonModalTitle'
    );

  const ribbonModalDescription =
    document.getElementById(
      'ribbonModalDescription'
    );

  const ribbonModalExtraImage =
    document.getElementById(
      'ribbonModalExtraImage'
    );

  const closeRibbonModal =
    document.getElementById(
      'closeRibbonModal'
    );


  document
    .querySelectorAll(
      '.ribbon-clickable'
    )
    .forEach(ribbon => {

      ribbon.addEventListener(
        'click',
        () => {

          if (
            !ribbonModal ||
            !ribbonModalImage ||
            !ribbonModalTitle ||
            !ribbonModalDescription ||
            !ribbonModalExtraImage
          ) {
            return;
          }


          ribbonModalImage.src =
            ribbon.dataset.image || '';

          ribbonModalTitle.textContent =
            ribbon.dataset.title || '';

          ribbonModalDescription.textContent =
            ribbon.dataset.description || '';


          if (
            ribbon.dataset.extra
          ) {

            ribbonModalExtraImage.src =
              ribbon.dataset.extra;

            ribbonModalExtraImage.style.display =
              'block';

          } else {

            ribbonModalExtraImage.src =
              '';

            ribbonModalExtraImage.style.display =
              'none';
          }


          ribbonModal.hidden =
            false;
        }
      );
    });


  if (
    closeRibbonModal &&
    ribbonModal
  ) {

    closeRibbonModal.onclick =
      () => {

        ribbonModal.hidden =
          true;
      };


    ribbonModal.onclick =
      event => {

        if (
          event.target ===
          ribbonModal
        ) {

          ribbonModal.hidden =
            true;
        }
      };
  }
}

  async function initPilotPage() {

    try {

      // Una sola richiesta statistiche:
      // usata sia per stats che medaglie.
      const [
        statsRows,
        rulesRows
      ] =
        await Promise.all([
          loadSheet(statsSheetUrl),
          loadSheet(
            medalRulesSheetUrl
          )
        ]);


      const headers =
        statsRows[0] || [];


      const pilotRow =
        statsRows
          .slice(1)
          .find(
            row =>
              normalize(row[0]) ===
              normalize(selectedPilot)
          );


      if (!pilotRow) {

        pilotStats.innerHTML =
          '<p class="muted">Statistiche non trovate per questo pilota.</p>';

        if (pilotMedals) {

          pilotMedals.innerHTML =
            '<p class="muted">Medagliere non disponibile.</p>';
        }

        return;
      }


      renderPilotStats(
        headers,
        pilotRow
      );


      renderMedals(
        statsRows,
        rulesRows,
        pilotRow
      );


      // Foto e sfondo possono caricarsi
      // separatamente senza bloccare stats.
      loadPilotVisuals(
        pilotRow
      );


    } catch (error) {

      console.error(
        'Errore pagina pilota:',
        error
      );


      pilotStats.innerHTML =
        `<p class="muted">${escapeHTML(error.message)}</p>`;


      if (pilotMedals) {

        pilotMedals.innerHTML =
          '<p class="muted">Medagliere non disponibile.</p>';
      }
    }
  }


  initPilotPage();

});
