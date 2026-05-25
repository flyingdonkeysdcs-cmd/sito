async function loadHomeMissionPreview() {
  const container = document.getElementById('homeMissionPreview');
  if (!container) return;

  const SHEET_ID = '1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk';
  const SHEET_NAME = 'AAR';
  const url = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;

  try {
    const response = await fetch(url);
    const missions = await response.json();

    if (!response.ok || !missions.length) {
      container.innerHTML = '<p class="muted">Nessuna missione disponibile.</p>';
      return;
    }

    const latestMissions = missions.slice(-3).reverse();
	window.homeLatestMissions = latestMissions;

    container.innerHTML = latestMissions.map((mission, index) => {
      const image = mission.immagine || 'images/default-mission.jpg';
      const title = mission.titolo || 'Operazione Flying Donkeys';
      const date = mission.data || '';
      const theatre = mission.teatro || '';
      const summary =
        mission['riassunto debriefing'] ||
        mission['riassunto debriefeing'] ||
        '';

      return `
        <article class="mission-preview-card unified-card"
         data-mission-index="${index}"
         role="button"
         tabindex="0">
          <div class="mission-preview-image">
            <img src="${image}" alt="${title}" loading="lazy">
          </div>

          <div class="mission-preview-content">
            <span class="mission-preview-date">${date}</span>

            <h3>${title}</h3>

            <p>${theatre}</p>

            <p>${summary.slice(0, 160)}...</p>

           
          </div>
        </article>
      `;
    }).join('');
	
container.querySelectorAll('.mission-preview-card').forEach(card => {
  card.addEventListener('click', () => {
    openHomeMissionModal(window.homeLatestMissions[card.dataset.missionIndex]);
  });

  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openHomeMissionModal(window.homeLatestMissions[card.dataset.missionIndex]);
    }
  });
});
  } catch (error) {
    console.error('Errore caricamento anteprima missioni:', error);
    container.innerHTML = '<p class="muted">Mission Log momentaneamente non disponibile.</p>';
  }
}

loadHomeMissionPreview();

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
  text = text.replace(/^###\s(.+)$/gm, '<strong class="mission-subheading">$1</strong>');
  text = text.replace(/^-+\s(.+)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*?<\/li>)+/gs, match => `<ul class="mission-list">${match}</ul>`);
  text = text.replace(/\n\s*\n/g, '<br><br>');
  text = text.replace(/\n/g, '<br>');

  return text;
}

function openHomeMissionModal(mission) {
  const modal = document.getElementById('homeMissionModal');
  const content = document.getElementById('homeMissionModalContent');
  if (!modal || !content || !mission) return;

  const image = mission.immagine || 'images/default-mission.jpg';
  const title = mission.titolo || 'Operazione Flying Donkeys';
  const date = mission.data || '';
  const theatre = mission.teatro || '';
  const pilots = mission['piloti coinvolti'] || '';
  const summary =
    mission['riassunto debriefing'] ||
    mission['riassunto debriefeing'] ||
    '';

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

document.addEventListener('click', event => {
  if (event.target.id === 'homeMissionModal' || event.target.id === 'homeMissionModalClose') {
    closeHomeMissionModal();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeHomeMissionModal();
  }
});

