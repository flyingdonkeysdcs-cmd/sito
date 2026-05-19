document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('missionLogGrid');
  const loading = document.getElementById('missionLogLoading');
  const empty = document.getElementById('missionLogEmpty');

  if (!list) return;

  const SHEET_ID = '1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk';
  const SHEET_NAME = 'AAR';
  const url = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;

  function escapeHTML(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatMissionText(text) {
    if (!text) return '';

    text = String(text).replace(/\r\n/g, '\n');

    text = escapeHTML(text);

    text = text.replace(/^##\s(.+)$/gm, '<strong class="mission-heading">$1</strong>');
    text = text.replace(/^-+\s(.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*?<\/li>)+/gs, match => `<ul class="mission-list">${match}</ul>`);
    text = text.replace(/\n\s*\n/g, '<br><br>');
    text = text.replace(/\n/g, '<br>');

    return text;
  }

  function getMissionData(mission) {
    return {
      image: mission.immagine || 'images/default-mission.jpg',
      title: mission.titolo || 'Untitled Operation',
      date: mission.data || '',
      theatre: mission.teatro || '',
      pilots: mission['piloti coinvolti'] || '',
      summary: mission['riassunto debriefeing'] || mission['riassunto debriefing'] || ''
    };
  }

  function createModal() {
    const modal = document.createElement('div');
    modal.className = 'mission-modal-backdrop';
    modal.id = 'missionModal';
    modal.hidden = true;

    modal.innerHTML = `
      <div class="mission-modal" role="dialog" aria-modal="true">
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

    const closeBtn = modal.querySelector('.mission-modal-close');

    function closeModal() {
      modal.hidden = true;
      document.body.classList.remove('modal-open');
    }

    closeBtn.addEventListener('click', closeModal);

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
    document.getElementById('missionModalImage').src = mission.image;
    document.getElementById('missionModalImage').alt = mission.title;
    document.getElementById('missionModalTheatre').textContent = mission.theatre;
    document.getElementById('missionModalTitle').textContent = mission.title;
    document.getElementById('missionModalDate').textContent = mission.date;
    document.getElementById('missionModalPilots').textContent = mission.pilots ? `Piloti: ${mission.pilots}` : '';
    document.getElementById('missionModalSummary').innerHTML = formatMissionText(mission.summary);

    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  try {
    const response = await fetch(url);
    const missionsRaw = await response.json();

    const missions = missionsRaw
      .reverse()
      .map(getMissionData);

    if (loading) loading.hidden = true;

    if (!missions.length) {
      if (empty) empty.hidden = false;
      return;
    }

    list.classList.add('mission-event-list');

    list.innerHTML = missions.map((mission, index) => `
      <button class="mission-event-row unified-card" type="button" data-index="${index}">
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