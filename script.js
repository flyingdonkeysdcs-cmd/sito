document.addEventListener('DOMContentLoaded', () => {
	const apiKey = 'AIzaSyBJMaFZsCPu_MxWWjUogryUTwJ1i6BG9hk';
    
const calendars = [
  {
    name: 'Flying Donkeys',
    id: '910d7da6fd44cf9672d6f950c3056f3cf87b33512e902113d9fe82e836adf404@group.calendar.google.com',
    label: 'Evento Flying Donkeys',
    server: 'Server Flying Donkeys'
  },

  {
    name: 'JATF',
    id: '609e54e597d66d5d7ba5605cdde4840b0218a70d2118bcc89b735094d6ff62ba@group.calendar.google.com',
    label: 'Evento JATF',
    server: 'Server JATF'
  }
];
// ==========================================================
// MOBILE HAMBURGER MENU
// ==========================================================

const mobileMenuToggle =
  document.getElementById('mobileMenuToggle');

const mobileMenu =
  document.getElementById('mobileMenu');

const siteHeader =
  document.querySelector('.site-header');

if (mobileMenuToggle && mobileMenu) {

  function closeMobileMenu() {

    mobileMenu.classList.remove('is-open');

    mobileMenuToggle.classList.remove('is-open');

    mobileMenuToggle.setAttribute(
      'aria-expanded',
      'false'
    );

  }

  mobileMenuToggle.addEventListener(
    'click',
    function(event){

      event.preventDefault();

      event.stopPropagation();

      const isOpen =
        mobileMenu.classList.toggle('is-open');

      mobileMenuToggle.classList.toggle(
        'is-open',
        isOpen
      );

      mobileMenuToggle.setAttribute(
        'aria-expanded',
        String(isOpen)
      );

    }
  );

  // chiude menu cliccando i link nav

  mobileMenu
    .querySelectorAll('.header-nav a')
    .forEach(function(link){

      link.addEventListener(
        'click',
        closeMobileMenu
      );

    });

  // chiude cliccando fuori

  document.addEventListener(
    'click',
    function(event){

      if (
        !mobileMenu.classList.contains('is-open')
      ) return;

      if (
        siteHeader &&
        siteHeader.contains(event.target)
      ) return;

      closeMobileMenu();

    }
  );

  // ESC chiude menu

  document.addEventListener(
    'keydown',
    function(event){

      if (event.key === 'Escape') {

        closeMobileMenu();

      }

    }
  );

}

function formatEventDate(dateValue) {

  const date = new Date(dateValue);

  return date.toLocaleString('it-IT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

}

async function fetchCalendarEvents(calendar) {

  const now = new Date().toISOString();

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events` +
    `?key=${apiKey}` +
    `&timeMin=${now}` +
    `&singleEvents=true` +
    `&orderBy=startTime` +
    `&maxResults=10`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Errore calendario ${calendar.name}`);
  }

  const data = await response.json();

  return (data.items || []).map(event => ({

    ...event,

    calendarLabel: calendar.label,
    serverName: calendar.server,
    calendarName: calendar.name

  }));

}

async function loadNextCalendarEvent() {

  const titleEl = document.getElementById('nextEventTitle');
  const descriptionEl = document.getElementById('nextEventDescription');
  const dateEl = document.getElementById('nextEventDate');
  const locationEl = document.getElementById('nextEventLocation');
  const programListEl = document.getElementById('programEventsList');

  if (!titleEl || !dateEl || !locationEl) return;

  try {

    const calendarResults = await Promise.all(
      calendars.map(calendar => fetchCalendarEvents(calendar))
    );

    const events = calendarResults
      .flat()
      .map(event => {

        const startValue =
          event.start.dateTime || event.start.date;

        return {

          ...event,

          startValue,

          startDate: new Date(startValue)

        };

      })
      .sort((a, b) => a.startDate - b.startDate);

    if (!events.length) {

      titleEl.textContent = 'Nessun evento programmato';

      if (descriptionEl) {
        descriptionEl.textContent = '';
      }

      dateEl.textContent = 'Da definire';

      locationEl.textContent =
        'Server Flying Donkeys';

      if (programListEl) {
        programListEl.innerHTML = '';
      }

      return;
    }

    // Evento principale
   const nextEvent = events[0];

titleEl.textContent =
  nextEvent.summary || nextEvent.calendarLabel;

if (descriptionEl) {
  descriptionEl.innerHTML =
    formatEventDescription(nextEvent.description || '');
}

dateEl.textContent =
  formatEventDate(nextEvent.startValue);

locationEl.textContent =
  nextEvent.serverName;

    // Lista prossimi eventi
    if (programListEl) {

		const nextEvents = events.slice(1, 5);

	if (!nextEvents.length) {
    programListEl.innerHTML = '<p class="muted">Nessun altro evento programmato.</p>';
    return;
	}

	programListEl.innerHTML = nextEvents.map(event => `

    <article class="program-event-card">
	
      <div>
        <p class="muted small">${event.calendarLabel}</p>

        <h3>${event.summary || event.calendarLabel}</h3>

        <p>${formatEventDescription(event.description || '')}</p>
      </div>

      <div class="program-event-meta">
        <span>${formatEventDate(event.startValue)}</span>
        <strong>${event.serverName}</strong>
      </div>

    </article>

  `).join('');

	}

  } catch (error) {

    console.error(
      'Errore caricamento calendario:',
      error
    );

    titleEl.textContent =
      'Prossimo Evento';

    if (descriptionEl) {
      descriptionEl.textContent = '';
    }

    dateEl.textContent =
      'Martedì e Giovedì — 21:00 CEST';

    locationEl.textContent =
      'Server Flying Donkeys';

    if (programListEl) {
      programListEl.innerHTML = '';
    }

  }

}

loadNextCalendarEvent();
function formatEventDescription(description) {

  if (!description) return '';

  // Cerca un URL
  const urlMatch =
    description.match(/https?:\/\/[^\s<]+/);

  // Nessun link
  if (!urlMatch) {
    return description;
  }

  const url = urlMatch[0];

  // Pulisce il testo
  const cleanDescription = description
    .replace(url, '')
    .replace(/Discord:/gi, '')
    .trim();

  // Ritorna HTML formattato
  return `
    <span>${cleanDescription}</span>

    <div class="event-links">
      <a class="ato-link"
         href="${url}"
         target="_blank"
         rel="noopener noreferrer">
        ATO
      </a>
    </div>
  `;
}
  // Smooth scrolling
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Modal contatti
  const openBtn = document.getElementById('openContact');
  const closeBtn = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelModal');
  const modal = document.getElementById('modalBackdrop');

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  // Contact Form
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const message = document.getElementById('message').value;

      const recipient = 'flyingdonkeysdcs@gmail.com';
      const subject = encodeURIComponent(`Messaggio da ${name}`);
      const body = encodeURIComponent(
`Nome: ${name}

Email: ${email}

Messaggio:
${message}`
      );

      window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
      closeModal();
    });
  }

  // Copyright
  const copyright = document.getElementById('copyright');
  if (copyright) {
    copyright.textContent = `© ${new Date().getFullYear()} Flying Donkeys Virtual Squadron`;
  }

  // Slideshow
  const slides = document.querySelectorAll('.slide');
  let currentSlide = 0;

  function showSlide(index) {
    if (!slides.length) return;
    slides.forEach(slide => slide.classList.remove('active-slide'));
    slides[index].classList.add('active-slide');
  }

  if (slides.length) {
    setInterval(() => {
      currentSlide++;
      if (currentSlide >= slides.length) currentSlide = 0;
      showSlide(currentSlide);
    }, 4000);
  }

  // Google Sheets CSV
  const statsSheetUrl =
    'https://docs.google.com/spreadsheets/d/1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk/gviz/tq?tqx=out:csv&gid=1481970459';

  const medalsSheetUrl =
    'https://docs.google.com/spreadsheets/d/1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk/gviz/tq?tqx=out:csv&gid=707505776';
	
	const medalRulesSheetUrl =
  'https://docs.google.com/spreadsheets/d/1EM0RGmnRNoso32nElUh-hn_Bjv5AvMneL7ks-pedZwk/gviz/tq?tqx=out:csv&gid=2068617911';
  
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
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (char === '\r' && next === '\n') i++;
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

    return rows.filter(r => r.some(c => c !== ''));
  }

  async function loadSheet(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Impossibile leggere il foglio Google');
    return parseCSV(await response.text());
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  // Roster dropdown: al click apre pilota.html?nome=NOME
  const openRoster = document.getElementById('openRoster');
  const rosterMenu = document.getElementById('rosterMenu');
  const pilotList = document.getElementById('pilotList');

  if (openRoster && rosterMenu && pilotList) {
    openRoster.addEventListener('click', function () {
		rosterMenu.hidden = !rosterMenu.hidden;
	});

		document.addEventListener('click', function (e) {
		const clickedInsideRoster =
			openRoster.contains(e.target) || rosterMenu.contains(e.target);

		if (!clickedInsideRoster) {
			rosterMenu.hidden = true;
	}
	});

    loadSheet(statsSheetUrl)
      .then(rows => {
        pilotList.innerHTML = '';

        rows.slice(1).forEach(row => {
          const pilotName = row[0];
          if (!pilotName) return;

         const link = document.createElement('a');
		link.className = 'pilot-item';
		link.textContent = pilotName;
		link.href = './pilota.html?nome=' + encodeURIComponent(pilotName.trim());

		pilotList.appendChild(link);
		});
      })
      .catch(error => {
        pilotList.innerHTML = `<p class="muted small">${error.message}</p>`;
      });
  }

  // Pagina dettaglio pilota
  const pilotNameTitle = document.getElementById('pilotNameTitle');
  const pilotStats = document.getElementById('pilotStats');
  const pilotMedals = document.getElementById('pilotMedals');
	
	const pilotHeroCard = document.getElementById('pilotHeroCard');
	const pilotProfileImage = document.getElementById('pilotProfileImage');
	const pilotAircraftLogo = document.getElementById('pilotAircraftLogo');
	
	function getCellByHeader(headers, row, headerName) {
  const index = headers.findIndex(h =>
    normalize(h) === normalize(headerName)
  );

  return index >= 0 ? String(row[index] || '').trim() : '';
}

function loadPilotVisuals(selectedPilot, pilotRow) {
  const aircraft = String(pilotRow[3] || '').trim().toUpperCase();

  if (pilotAircraftLogo) {
    let logoUrl = '';

    if (aircraft === 'F-16C') {
      logoUrl = 'images/logo-f16.png';
    }

    if (aircraft === 'F/A-18C') {
      logoUrl = 'images/logo-fa18.png';
    }

    if (logoUrl) {
      pilotAircraftLogo.src = logoUrl;
      pilotAircraftLogo.hidden = false;
    }
  }

  loadSheet(pilotPhotosSheetUrl)
    .then(photoRows => {
      const photoHeaders = photoRows[0] || [];

      const photoRow = photoRows
        .slice(1)
        .find(row => normalize(row[0]) === normalize(selectedPilot));

      if (!photoRow) {
        setupPilotImagePopups(selectedPilot, pilotRow);
        return;
      }

      const profileUrl = getCellByHeader(photoHeaders, photoRow, 'FotoProfilo');
      const headerUrl = getCellByHeader(photoHeaders, photoRow, 'FotoHeader');

      if (profileUrl && pilotProfileImage) {
        pilotProfileImage.src = profileUrl;
      }

      if (headerUrl) {
        document.body.style.setProperty('--pilot-page-bg', `url("${headerUrl}")`);
        document.body.classList.add('has-pilot-page-bg');
      }

      setupPilotImagePopups(selectedPilot, pilotRow);
    })
    .catch(error => {
      console.warn('Immagini pilota non disponibili:', error);
      setupPilotImagePopups(selectedPilot, pilotRow);
    });
}

function setupPilotImagePopups(selectedPilot, pilotRow) {
  const modal = document.getElementById('pilotImageModal');
  const closeBtn = document.getElementById('closePilotImageModal');
  const modalImg = document.getElementById('pilotImageModalImg');
  const modalTitle = document.getElementById('pilotImageModalTitle');
  const modalDescription = document.getElementById('pilotImageModalDescription');

  if (!modal || !closeBtn || !modalImg || !modalTitle || !modalDescription) return;

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

  modal.onclick = e => {
    if (e.target === modal) closePilotImageModal();
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
      const aircraft = String(pilotRow[3] || '').trim().toUpperCase();

      let title = 'Reparto';
      let description = 'Logo di appartenenza del pilota.';

      if (aircraft === 'F-16C') {
        title = 'F-16C Fighting Falcon';
        description = 'Pilota assegnato al reparto F-16C.';
      }

      if (aircraft === 'F/A-18C') {
        title = 'F/A-18C Hornet';
        description = 'Pilota assegnato al reparto F/A-18C.';
      }

      openPilotImageModal(
        pilotAircraftLogo.src,
        title,
        description
      );
    };
  }
}


  if (pilotNameTitle && pilotStats) {
    const params = new URLSearchParams(window.location.search);
    const selectedPilot = params.get('nome');

    if (!selectedPilot) {
      pilotNameTitle.textContent = 'Pilota non selezionato';
      pilotStats.innerHTML = '<p class="muted">Torna al roster e seleziona un pilota.</p>';
      return;
    }

    pilotNameTitle.textContent = selectedPilot;

    loadSheet(statsSheetUrl)
      .then(rows => {
        const headers = rows[0] || [];
		console.log(headers);
        const pilotRow = rows.slice(1).find(row => normalize(row[0]) === normalize(selectedPilot));

        if (!pilotRow) {
          pilotStats.innerHTML = '<p class="muted">Statistiche non trovate per questo pilota.</p>';
          return;
        }
	loadPilotVisuals(selectedPilot, pilotRow);
	
	function setupPilotImagePopups() {
  const modal = document.getElementById('pilotImageModal');
  const closeBtn = document.getElementById('closePilotImageModal');
  const modalImg = document.getElementById('pilotImageModalImg');
  const modalTitle = document.getElementById('pilotImageModalTitle');
  const modalDescription = document.getElementById('pilotImageModalDescription');

  if (!modal || !closeBtn || !modalImg || !modalTitle || !modalDescription) return;

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

  closeBtn.addEventListener('click', closePilotImageModal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closePilotImageModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) {
      closePilotImageModal();
    }
  });

  if (pilotProfileImage) {
    pilotProfileImage.classList.add('pilot-clickable-image');

    pilotProfileImage.addEventListener('click', () => {
      openPilotImageModal(
        pilotProfileImage.src,
        selectedPilot,
        'Foto profilo del pilota.'
      );
    });
  }

  if (pilotAircraftLogo) {
    pilotAircraftLogo.classList.add('pilot-clickable-image');

    pilotAircraftLogo.addEventListener('click', () => {
      const aircraft = String(pilotRow[3] || '').trim().toUpperCase();

      let title = 'Reparto';
      let description = 'Logo di appartenenza del pilota.';

      if (aircraft === 'F-16C') {
        title = 'F-16C Fighting Falcon';
        description = 'Pilota assegnato al reparto F-16C.';
      }

      if (aircraft === 'F/A-18C') {
        title = 'F/A-18C Hornet';
        description = 'Pilota assegnato al reparto F/A-18C.';
      }

      openPilotImageModal(
        pilotAircraftLogo.src,
        title,
        description
      );
    });
  }
}


     const html = headers.map((header, index) => {

		// salta colonna nome pilota
		if (!header || index === 0) return '';

		// nasconde "Ultima Attività"
		if (header.trim().toLowerCase() === 'ultima attività') return '';

		const value = String(pilotRow[index] || '').trim();

		// nasconde celle vuote
		if (value === '') return '';

		// nasconde valori 0
		if (value === '0') return '';

		// boolean FALSE -> nasconde
		if (value.toUpperCase() === 'FALSE') {
    return '';
		}

		// boolean TRUE -> mostra solo il nome statistica
		if (value.toUpperCase() === 'TRUE') {
			return `
			<div class="stat-card boolean-true">
				<strong>${header}</strong>
			</div>
			`;
		}

		// statistiche normali
		return `
			<div class="stat-card">
		<span>${header}</span>
			<strong>${value}</strong>
			</div>
		`;

		}).join('');

        pilotStats.innerHTML = html || '<p class="muted">Nessuna statistica disponibile.</p>';
      })
      .catch(error => {
        pilotStats.innerHTML = `<p class="muted">${error.message}</p>`;
      });

if (pilotMedals) {
  Promise.all([
    loadSheet(statsSheetUrl),
    loadSheet(medalRulesSheetUrl)
  ])
    .then(([statsRows, rulesRows]) => {
		console.log('STATISTICHE:', statsRows);
		console.log('REGOLE MEDAGLIE:', rulesRows);
      const pilotRow = statsRows
        .slice(1)
        .find(row => normalize(row[0]) === normalize(selectedPilot));

      if (!pilotRow) {
        pilotMedals.innerHTML = '<p class="muted">Medagliere non disponibile.</p>';
        return;
      }

      function colIndex(letter) {
        let n = 0;
        for (let i = 0; i < letter.length; i++) {
          n = n * 26 + letter.charCodeAt(i) - 64;
        }
        return n - 1;
      }

      function valCol(letter) {
        return pilotRow[colIndex(letter)] || '';
      }

      function toNumber(value) {
        const n = Number(String(value || '').replace(',', '.'));
        return isNaN(n) ? 0 : n;
      }

      function isTrue(value) {
        return ['TRUE', 'VERO'].includes(String(value || '').trim().toUpperCase());
      }

		const rules = rulesRows.slice(1).map(r => ({
			med: String(r[0] || '').trim(),
			col: String(r[1] || '').trim().toUpperCase(),
			tipo: String(r[2] || '').trim().toUpperCase(),
			valore: String(r[3] || '').trim(),
			img: String(r[5] || '').trim(),
			descrizione: String(r[6] || '').trim(),
			immagineDettaglio: String(r[7] || '').trim(),
			titolo: String(r[8] || '').trim()
			}));
		console.log('REGOLE NORMALIZZATE:', rules);
		console.log('RIGA PILOTA:', pilotRow);
		console.log('TEST COLONNA C:', valCol('C'));
		console.log('TEST COLONNA H:', valCol('H'));
		console.log('TEST COLONNA J:', valCol('J'));
      const medals = [];

      const isVet =
        String(valCol('C')).trim().toUpperCase() === 'FCR' &&
        toNumber(valCol('H')) >= 4;

      // BOOL e TESTO
      rules.forEach(rule => {
        if (!rule.med || !rule.img) return;
        if (['FCR_VET', 'ASTRA', 'ASTRA_MAJ'].includes(rule.med)) return;
        if (
			!rule.tipo.includes('BOOL') &&
			!rule.tipo.includes('TESTO')
			) return;
        if (rule.med === 'FCR' && isVet) return;

        const dato = valCol(rule.col);

        if (rule.tipo.includes('BOOL') && isTrue(dato)) {
          medals.push(rule);
        }

        if (rule.tipo.includes('TESTO') && String(dato) === String(rule.valore)) {
          medals.push(rule);
        }
      });

      // FCR Veteran
      if (isVet) {
        const fcrVet = rules.find(r => r.med === 'FCR_VET');
        if (fcrVet && fcrVet.img) medals.unshift(fcrVet);
      }

      // Medaglie NUM: prende la soglia massima raggiunta
      function addBestNumMedal(columnLetter) {
        const value = toNumber(valCol(columnLetter));

        const candidates = rules
			.filter(r =>
			r.col === columnLetter &&
			r.tipo.includes('NUM') &&
			toNumber(r.valore) <= value
		)
          .sort((a, b) => toNumber(b.valore) - toNumber(a.valore));

        if (candidates[0] && candidates[0].img) {
          medals.push(candidates[0]);
        }
      }

      [
        'J',  // Valor
        'H',  // Fugit
        'U',  // Raduni
        'V',  // Addestramenti
        'W',  // Mix
        'X',  // JATF Add
        'Y',  // JATF Mix
        'Z',  // 527 Mix
        'AA', // BAS Mix
        'AB', // Levantine
        'AC', // INIOCHOS
        'AD'  // SHADDER
      ].forEach(addBestNumMedal);

      // ASTRA
      const astraValue = toNumber(valCol('T'));

		const allAstraValues = statsRows
		.slice(1)
		.map(row => toNumber(row[colIndex('T')]))
		.filter(v => v > 0);

		const maxAstraValue = allAstraValues.length ? Math.max(...allAstraValues) : 0;

		if (astraValue >= 65000) {
		const astraRule = rules.find(r =>
			r.med === (astraValue === maxAstraValue ? 'ASTRA_MAJ' : 'ASTRA')
		);

		if (astraRule && astraRule.img) {
			medals.push(astraRule);
		}
		}
	  
	console.log('MEDAGLIE FINALI:', medals);
	
  const medalsHtml = medals.slice(0, 20).map(rule => `
  <div class="ribbon-slot">
    <img
      src="${rule.img.trim()}"
      alt="${rule.med}"
      class="ribbon-clickable"
      data-title="${rule.titolo || rule.med}"
      data-description="${rule.descrizione || ''}"
      data-image="${rule.img.trim()}"
      data-extra="${rule.immagineDettaglio || ''}"
    >
  </div>
`).join('');

pilotMedals.innerHTML =
  medalsHtml || '<p class="muted">Nessun nastrino assegnato.</p>';

document.querySelectorAll('.ribbon-clickable').forEach(ribbon => {
  ribbon.addEventListener('click', () => {
    document.getElementById('ribbonModalImage').src = ribbon.dataset.image;
    document.getElementById('ribbonModalTitle').textContent = ribbon.dataset.title;
    document.getElementById('ribbonModalDescription').textContent = ribbon.dataset.description;

    const extraImg = document.getElementById('ribbonModalExtraImage');

    if (ribbon.dataset.extra) {
      extraImg.src = ribbon.dataset.extra;
      extraImg.style.display = 'block';
    } else {
      extraImg.style.display = 'none';
    }

    document.getElementById('ribbonModal').hidden = false;
  });
});

document.getElementById('closeRibbonModal').addEventListener('click', () => {
  document.getElementById('ribbonModal').hidden = true;
});

document.getElementById('ribbonModal').addEventListener('click', e => {
  if (e.target.id === 'ribbonModal') {
    document.getElementById('ribbonModal').hidden = true;
  }
});

    })
    .catch(error => {
      console.error('Errore medagliere:', error);
      pilotMedals.innerHTML =
        '<p class="muted">Errore medagliere: ' + error.message + '</p>';
    });
  }
}

  /* =========================
     POPUP FOTO/VIDEO RADUNI
  ========================= */

  const mediaModal = document.getElementById('mediaModal');
  const mediaModalContent = document.getElementById('mediaModalContent');
  const closeMediaModal = document.getElementById('closeMediaModal');
  const prevMediaModal = document.getElementById('prevMediaModal');
  const nextMediaModal = document.getElementById('nextMediaModal');

  const raduniMedia = Array.from(document.querySelectorAll('.raduno-gallery img, .raduno-gallery video'));
  let currentMediaIndex = 0;

  function getMediaSource(element) {
    if (!element) return '';

    if (element.tagName.toLowerCase() === 'video') {
      const source = element.querySelector('source');
      return element.dataset.fullSrc || element.currentSrc || element.src || (source ? source.src : '');
    }

    return element.dataset.fullSrc || element.src;
  }

  function getMediaType(element) {
    if (!element) return 'image';
    return element.tagName.toLowerCase() === 'video' ? 'video' : 'image';
  }

  function showMedia(index) {
    if (!mediaModal || !mediaModalContent || !raduniMedia.length) return;

    currentMediaIndex = (index + raduniMedia.length) % raduniMedia.length;
    const item = raduniMedia[currentMediaIndex];
    const type = getMediaType(item);
    const src = getMediaSource(item);
    const alt = item.getAttribute('alt') || 'Media raduno';

    mediaModalContent.innerHTML = '';

    if (type === 'video') {
      const video = document.createElement('video');
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      if (item.poster) video.poster = item.poster;
      mediaModalContent.appendChild(video);
    } else {
      const image = document.createElement('img');
      image.src = src;
      image.alt = alt;
      mediaModalContent.appendChild(image);
    }
  }

  function openMediaModal(index) {
    if (!mediaModal) return;
    showMedia(index);
    mediaModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeRaduniMediaModal() {
    if (!mediaModal || !mediaModalContent) return;
    mediaModal.hidden = true;
    mediaModalContent.innerHTML = '';
    document.body.style.overflow = '';
  }

  raduniMedia.forEach((item, index) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      openMediaModal(index);
    });
  });

  if (closeMediaModal) {
    closeMediaModal.addEventListener('click', closeRaduniMediaModal);
  }

  if (prevMediaModal) {
    prevMediaModal.addEventListener('click', (e) => {
      e.stopPropagation();
      showMedia(currentMediaIndex - 1);
    });
  }

  if (nextMediaModal) {
    nextMediaModal.addEventListener('click', (e) => {
      e.stopPropagation();
      showMedia(currentMediaIndex + 1);
    });
  }

  if (mediaModal) {
    mediaModal.addEventListener('click', (e) => {
      if (e.target === mediaModal) {
        closeRaduniMediaModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!mediaModal || mediaModal.hidden) return;

    if (e.key === 'Escape') closeRaduniMediaModal();
    if (e.key === 'ArrowLeft') showMedia(currentMediaIndex - 1);
    if (e.key === 'ArrowRight') showMedia(currentMediaIndex + 1);
  });


// =====================
// Mappa piloti FD da Google Sheet FotoPiloti
// Colonna A = nome/callsign
// Colonna D = coordinate Lat, Long
// =====================

function parsePilotCoordinates(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/;/g, ',')
    .replace(/\s+/g, ' ');

  const match = cleaned.match(/(-?\d+(?:[\.,]\d+)?)\s*[, ]\s*(-?\d+(?:[\.,]\d+)?)/);
  if (!match) return null;

  const lat = parseFloat(match[1].replace(',', '.'));
  const lng = parseFloat(match[2].replace(',', '.'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

function buildPilotMapGroups(rows) {
  const groups = new Map();

  rows.slice(1).forEach(row => {
    const pilotName = String(row[0] || '').trim();
    const coordinates = parsePilotCoordinates(row[3]);

    if (!pilotName || !coordinates) return;

    const key = `${coordinates.lat.toFixed(4)},${coordinates.lng.toFixed(4)}`;

    if (!groups.has(key)) {
      groups.set(key, {
        lat: coordinates.lat,
        lng: coordinates.lng,
        pilots: []
      });
    }

    groups.get(key).pilots.push(pilotName);
  });

  return Array.from(groups.values());
}

async function initPilotMapFromSheet() {
  const mapEl = document.getElementById('pilotMap');
  const listEl = document.getElementById('pilotMapList');
  const statusEl = document.getElementById('pilotMapStatus');

  if (!mapEl || typeof L === 'undefined') return;

  try {
    const photoRows = await loadSheet(pilotPhotosSheetUrl);
    const pilotLocations = buildPilotMapGroups(photoRows);

    if (!pilotLocations.length) {
      if (statusEl) {
        statusEl.textContent = 'Nessuna coordinata trovata. Inserisci le coordinate nella colonna D del foglio FotoPiloti.';
      }
      if (listEl) {
        listEl.innerHTML = '';
      }
      return;
    }

    const map = L.map('pilotMap', {
      scrollWheelZoom: false
    }).setView([42.8, 12.6], 5.6);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 18
      }
    ).addTo(map);

    const bounds = [];

    pilotLocations.forEach(location => {
      bounds.push([location.lat, location.lng]);

      const markerHtml = location.pilots.length > 1
        ? `<div class="fd-map-marker-count">${location.pilots.length}</div>`
        : '<div class="fd-map-marker"></div>';

      const markerIcon = L.divIcon({
        className: '',
        html: markerHtml,
        iconSize: location.pilots.length > 1 ? [26, 26] : [18, 18],
        iconAnchor: location.pilots.length > 1 ? [13, 13] : [9, 9]
      });

      const pilotsHtml = location.pilots
        .sort((a, b) => a.localeCompare(b, 'it'))
        .map(p => `<li>${p}</li>`)
        .join('');

      L.marker([location.lat, location.lng], { icon: markerIcon })
        .addTo(map)
        .bindPopup(`
          <div class="fd-map-popup">
            <strong>${location.pilots.length} pilota/i</strong>
            <ul>${pilotsHtml}</ul>
          </div>
        `);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [42, 42] });
    } else {
      map.setView(bounds[0], 8);
    }

    const totalPilots = pilotLocations.reduce((sum, location) => sum + location.pilots.length, 0);

    if (statusEl) {
      statusEl.textContent = `${totalPilots} pilota/i geolocalizzati in ${pilotLocations.length} posizione/i.`;
    }

    if (listEl) {
      listEl.innerHTML = pilotLocations
        .sort((a, b) => b.pilots.length - a.pilots.length)
        .map(location => `
          <div class="pilot-map-item">
            <strong>${location.pilots.join(', ')}</strong>
            <span>${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}</span>
          </div>
        `)
        .join('');
    }
  } catch (error) {
    console.error('Errore caricamento mappa piloti:', error);

    if (statusEl) {
      statusEl.textContent = 'Impossibile caricare le coordinate dal foglio FotoPiloti.';
    }
  }
}

initPilotMapFromSheet();


async function loadDcsNews() {
  const listEl = document.getElementById('dcsNewsList');
  if (!listEl) return;

  const news = [
    {
      title: 'DCS Newsletter',
      date: 'Test locale',
      url: 'https://www.digitalcombatsimulator.com/en/news/newsletters/',
      summary: 'Questa è una card di prova. Qui comparirà il riassunto automatico in italiano della newsletter Eagle Dynamics.'
    }
  ];

  listEl.innerHTML = news.map(item => `
    <article class="dcs-news-card unified-card">
      <span class="news-date">${item.date}</span>
      <h3>${item.title}</h3>
      <p>${item.summary}</p>
      <a class="btn btn-ghost" href="${item.url}" target="_blank" rel="noopener noreferrer">
        Leggi newsletter
      </a>
    </article>
  `).join('');
}

loadDcsNews();
});
