document.addEventListener('DOMContentLoaded', async () => {

  const container = document.getElementById('missionLogGrid');

  if (!container) return;
	function formatMissionText(text) {

  if (!text) return '';

  // normalizza newline
  text = text.replace(/\r\n/g, '\n');

  // headings ##
  text = text.replace(
    /^##\s(.+)$/gm,
    '<strong class="mission-heading">$1</strong>'
  );

  // liste -
  text = text.replace(
    /^-\s(.+)$/gm,
    '<li>$1</li>'
  );

  // wrappa liste consecutive
  text = text.replace(
    /(<li>.*?<\/li>)+/gs,
    match => `<ul class="mission-list">${match}</ul>`
  );

  // paragrafi vuoti
  text = text.replace(/\n\s*\n/g, '<br><br>');

  // newline normali
  text = text.replace(/\n/g, '<br>');

  return text;
}
  const SHEET_ID = '1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk';
  const SHEET_NAME = 'AAR';

  const url =
    `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;

  try {

    const response = await fetch(url);
    const missions = await response.json();

    if (!missions.length) {

      container.innerHTML = `
        <p class="muted">
          Nessun report operativo disponibile.
        </p>
      `;

      return;
    }

    container.innerHTML = missions.reverse().map(mission => {

      const image =
        mission.immagine ||
        'images/default-mission.jpg';

      const title =
        mission.titolo ||
        'Untitled Operation';

      const date =
        mission.data || '';

      const theatre =
        mission.teatro || '';

      const pilots =
        mission['piloti coinvolti'] || '';

     
	const summary =
  formatMissionText(mission['riassunto debriefeing'] || '');

      return `
        <article class="mission-card unified-card">

         <div class="mission-card-media">
			<img
			src="${image}"
			alt="${title}"
			loading="lazy"
			decoding="async"
			>
		</div>

		<div class="mission-card-body">

            <div class="mission-card-meta">

              <span class="mission-tag">
                ${theatre}
              </span>

              <span class="mission-date">
                ${date}
              </span>

            </div>

            <h3 class="mission-title">
              ${title}
            </h3>

            <p class="mission-pilots">
              <strong>Piloti:</strong>
              ${pilots}
            </p>

            <div class="mission-summary">
				${summary}
			</div>

          </div>

        </article>
      `;

    }).join('');

  } catch (error) {

    console.error(
      'Errore caricamento Mission Log:',
      error
    );

    container.innerHTML = `
      <p class="muted">
        Impossibile caricare i report operativi.
      </p>
    `;
  }

});