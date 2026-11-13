/* ==========================================================
   HOMEPAGE — ANTEPRIMA MISSION LOG
   Mostra le ultime 3 missioni del foglio AAR e apre il
   debriefing in un popup. Caricata quando la sezione
   #mission-preview si avvicina all'area visibile.

   Richiede common.js (oggetto FD).
   ========================================================== */

(() => {

  const { SHEETS, escapeHTML, safeAssetUrl, formatMissionText, whenVisible } = FD;

  const PREVIEW_COUNT = 3;
  const SUMMARY_PREVIEW_LENGTH = 160;

  let latestMissions = [];


  /* Campi della missione con i valori di ripiego */
  function getMissionImage(mission) {
    return safeAssetUrl(mission.immagine) ||
      safeAssetUrl('images/default-mission.jpg');
  }

  function getMissionTitle(mission) {
    return mission.titolo || 'Operazione Flying Donkeys';
  }

  function getMissionSummary(mission) {
    return mission['riassunto debriefing'] ||
      mission['riassunto debriefeing'] || // refuso presente nel foglio
      '';
  }


  function missionPreviewCardHTML(mission, index) {
    const image   = getMissionImage(mission);
    const title   = getMissionTitle(mission);
    const date    = mission.data || '';
    const theatre = mission.teatro || '';
    const summary = getMissionSummary(mission);

    return `
    <article
      class="mission-preview-card unified-card"
      data-mission-index="${index}"
      role="button"
      tabindex="0">

      <div class="mission-preview-image">
        <img
          src="${escapeHTML(image)}"
          alt="${escapeHTML(title)}"
          loading="lazy">
      </div>

      <div class="mission-preview-content">

        <span class="mission-preview-date">
          ${escapeHTML(date)}
        </span>

        <h3>
          ${escapeHTML(title)}
        </h3>

        <p>
          ${escapeHTML(theatre)}
        </p>

        <p>
          ${escapeHTML(String(summary).slice(0, SUMMARY_PREVIEW_LENGTH))}...
        </p>

      </div>
    </article>
  `;
  }


  async function loadHomeMissionPreview() {
    const container = document.getElementById('homeMissionPreview');
    if (!container) return;

    try {
      const response = await fetch(SHEETS.aar);
      const missions = await response.json();

      if (!response.ok || !missions.length) {
        container.innerHTML = '<p class="muted">Nessuna missione disponibile.</p>';
        return;
      }

      latestMissions = missions.slice(-PREVIEW_COUNT).reverse();

      container.innerHTML = latestMissions.map(missionPreviewCardHTML).join('');

      container.querySelectorAll('.mission-preview-card').forEach(card => {
        const open = () =>
          openHomeMissionModal(latestMissions[card.dataset.missionIndex]);

        card.addEventListener('click', open);

        card.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        });
      });

    } catch (error) {
      console.error('Errore caricamento anteprima missioni:', error);
      container.innerHTML =
        '<p class="muted">Mission Log momentaneamente non disponibile.</p>';
    }
  }


  /* ----------------------------------------------------------
     Popup debriefing
     ---------------------------------------------------------- */

  function openHomeMissionModal(mission) {
    const modal   = document.getElementById('homeMissionModal');
    const content = document.getElementById('homeMissionModalContent');
    if (!modal || !content || !mission) return;

    const image   = getMissionImage(mission);
    const title   = getMissionTitle(mission);
    const date    = mission.data || '';
    const theatre = mission.teatro || '';
    const pilots  = mission['piloti coinvolti'] || '';
    const summary = getMissionSummary(mission);

    content.innerHTML = `
    <img class="mission-detail-image" src="${escapeHTML(image)}" alt="${escapeHTML(title)}">

    <div class="mission-detail-tags">
      <span>${escapeHTML(date)}</span>
      <span>${escapeHTML(theatre)}</span>
    </div>

    <h2>${escapeHTML(title)}</h2>

    ${pilots ? `<p class="muted"><strong>Teatro Operativo:</strong> ${escapeHTML(pilots)}</p>` : ''}

    <div class="mission-detail-text">
      ${formatMissionText(summary)}
    </div>

    <div class="mission-preview-footer">
      <a class="btn btn-primary" href="mission-log.html">Apri Mission Log completo</a>
    </div>
  `;

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }


  function closeHomeMissionModal() {
    const modal = document.getElementById('homeMissionModal');
    if (!modal) return;

    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }


  /* Chiusura: clic sullo sfondo o sul pulsante ×, oppure Esc */
  document.addEventListener('click', event => {
    if (
      event.target.id === 'homeMissionModal' ||
      event.target.id === 'homeMissionModalClose'
    ) {
      closeHomeMissionModal();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeHomeMissionModal();
    }
  });


  whenVisible(
    document.getElementById('mission-preview'),
    '400px 0px',
    loadHomeMissionPreview
  );

})();
