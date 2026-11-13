/* ==========================================================
   MISSION LOG (mission-log.html)
   Elenco di tutte le missioni del foglio AAR (dalla più
   recente) con popup del debriefing.

   Richiede common.js (oggetto FD).
   ========================================================== */

document.addEventListener('DOMContentLoaded', async () => {

  const { SHEETS, escapeHTML, safeAssetUrl, formatMissionText } = FD;

  const list    = document.getElementById('missionLogGrid');
  const index   = document.getElementById('missionEventIndex');
  const loading = document.getElementById('missionLogLoading');
  const empty   = document.getElementById('missionLogEmpty');

  if (!list) return;


  function getMissionData(mission) {
    return {
      image:
        safeAssetUrl(mission.immagine) ||
        safeAssetUrl('images/default-mission.jpg'),
      title:   mission.titolo || 'Untitled Operation',
      date:    mission.data || '',
      theatre: mission.teatro || '',
      pilots:  mission['piloti coinvolti'] || '',
      summary:
        mission['riassunto debriefeing'] || // refuso presente nel foglio
        mission['riassunto debriefing'] ||
        ''
    };
  }


  /* ----------------------------------------------------------
     Popup debriefing (creato una volta sola)
     ---------------------------------------------------------- */

  function createModal() {
    const modal = document.createElement('div');
    modal.className = 'mission-modal-backdrop';
    modal.id = 'missionModal';
    modal.hidden = true;

    modal.innerHTML = `
      <div
        class="mission-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="missionModalTitle">
        <button class="mission-modal-close" type="button" aria-label="Chiudi">×</button>
        <div class="mission-modal-media">
          <img id="missionModalImage" src="" alt="">
        </div>
        <div class="mission-modal-body">
          <span class="card-kicker" id="missionModalTheatre"></span>
          <h2 id="missionModalTitle"></h2>
          <div class="mission-modal-meta">
            <span id="missionModalDate"></span>
            <span id="missionModalPilots"></span>
          </div>
          <div class="mission-summary" id="missionModalSummary"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    function closeModal() {
      modal.hidden = true;
      document.body.classList.remove('modal-open');
    }

    modal.querySelector('.mission-modal-close').addEventListener('click', closeModal);

    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden) closeModal();
    });

    return modal;
  }

  const modal = createModal();


  function openMissionModal(mission) {
    const image = document.getElementById('missionModalImage');
    image.src = mission.image;
    image.alt = mission.title;

    document.getElementById('missionModalTheatre').textContent = mission.theatre;
    document.getElementById('missionModalTitle').textContent = mission.title;
    document.getElementById('missionModalDate').textContent = mission.date;
    document.getElementById('missionModalPilots').textContent =
      mission.pilots ? `Teatro: ${mission.pilots}` : '';
    document.getElementById('missionModalSummary').innerHTML =
      formatMissionText(mission.summary);

    modal.hidden = false;
    document.body.classList.add('modal-open');
  }


  /* ----------------------------------------------------------
     Elenco missioni
     ---------------------------------------------------------- */

  try {
    const response = await fetch(SHEETS.aar);
    const missionsRaw = await response.json();

    const missions = missionsRaw.reverse().map(getMissionData);

    if (loading) loading.hidden = true;
    if (index) index.hidden = false;

    if (!missions.length) {
      if (empty) empty.hidden = false;
      return;
    }

    list.classList.add('mission-event-list');

    list.innerHTML = missions.map((mission, i) => `
      <button class="mission-event-row unified-card" type="button" data-index="${i}">
        <span class="mission-event-date">${escapeHTML(mission.date)}</span>
        <span class="mission-event-title">${escapeHTML(mission.title)}</span>
        <span class="mission-event-theatre">${escapeHTML(mission.theatre)}</span>
      </button>
    `).join('');

    list.querySelectorAll('.mission-event-row').forEach(button => {
      button.addEventListener('click', () => {
        openMissionModal(missions[button.dataset.index]);
      });
    });

  } catch (error) {
    console.error('Errore caricamento Mission Log:', error);

    if (loading) loading.hidden = true;

    list.innerHTML = `
      <p class="mission-empty">
        Impossibile caricare i report operativi.
      </p>
    `;
  }
});
