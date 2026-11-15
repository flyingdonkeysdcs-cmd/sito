/* ==========================================================
   CALENDARIO EVENTI (calendario.html)
   Vista a mese degli eventi dei calendari "Flying Donkeys Events"
   e "JATF" (stessi dati gia' letti per il "Prossimo evento" in
   home, ma con una finestra temporale piu' ampia: vedi
   /api/calendar-full). Nessuna dipendenza da librerie esterne.
   ========================================================== */

document.addEventListener('DOMContentLoaded', async () => {

  const monthTitleEl = document.getElementById('calMonthTitle');
  const gridEl        = document.getElementById('calGrid');
  const prevBtn        = document.getElementById('calPrevBtn');
  const nextBtn        = document.getElementById('calNextBtn');
  const todayBtn       = document.getElementById('calTodayBtn');

  const bannerEl     = document.getElementById('calNextBanner');
  const countdownEl  = document.getElementById('calNextCountdown');
  const bannerTitle  = document.getElementById('calNextTitle');
  const bannerMeta   = document.getElementById('calNextMeta');

  const modalEl      = document.getElementById('calEventModal');
  const modalTitleEl = document.getElementById('calModalTitle');
  const modalBodyEl  = document.getElementById('calModalBody');
  const modalCloseBtn = document.getElementById('calModalClose');

  if (!gridEl) return;

  const CAL_COLOR_CLASS = {
    'Flying Donkeys Events': 'cal-dot-fd',
    'JATF Events': 'cal-dot-jatf'
  };

  const pad = n => String(n).padStart(2, '0');

  function dayKey(y, m, d) {
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  }

  function eventDate(event) {
    return new Date(event.startValue);
  }

  function eventDayKey(event) {
    const d = eventDate(event);
    if (event.allDay) {
      return dayKey(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
    return dayKey(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function formatTime(event) {
    if (event.allDay) return 'Tutto il giorno';
    return eventDate(event).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDayTitle(date) {
    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  /* Stessa logica usata in home.js: se la descrizione contiene un
     link, diventa il pulsante "ATO" e viene tolto dal testo. */
  function formatEventDescription(description) {
    if (!description) return '';

    const plain = String(description);
    const urlMatch = plain.match(/https?:\/\/[^\s"<]+/);

    if (!urlMatch) return FD.escapeHTML(plain);

    const url = FD.safeExternalUrl ? FD.safeExternalUrl(urlMatch[0]) : urlMatch[0];

    const clean = plain
      .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
      .replace(urlMatch[0], '')
      .replace(/<[^>]+>/g, '')
      .replace(/Discord:/gi, '')
      .trim();

    const safe = FD.escapeHTML(clean);

    return url
      ? `${safe ? `<p>${safe}</p>` : ''}<a class="btn btn-ghost" href="${url}" target="_blank" rel="noopener noreferrer">Apri ATO / Discord</a>`
      : safe;
  }

  let events = [];
  let eventsByDay = new Map();
  let currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  let selectedKey = null;

  function indexEvents() {
    eventsByDay = new Map();
    events.forEach(event => {
      const key = eventDayKey(event);
      if (!eventsByDay.has(key)) eventsByDay.set(key, []);
      eventsByDay.get(key).push(event);
    });
  }

  function renderNextEventBanner() {
    if (!bannerEl) return;

    const now = Date.now();
    const upcoming = events.find(event => eventDate(event).getTime() >= now);

    if (!upcoming) {
      bannerEl.hidden = true;
      return;
    }

    const diffMs = eventDate(upcoming).getTime() - now;
    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);

    countdownEl.textContent = days > 0
      ? `Tra ${days}g ${hours}h`
      : (hours > 0 ? `Tra ${hours}h` : 'A breve');

    bannerTitle.textContent = upcoming.summary || upcoming.calendarLabel;
    bannerMeta.textContent = `${formatDayTitle(eventDate(upcoming))} — ${formatTime(upcoming)} — ${upcoming.serverName}`;

    bannerEl.hidden = false;
  }

  function renderMonth() {
    monthTitleEl.textContent = currentMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // lunedi' = 0

    const today = new Date();
    const todayKey = dayKey(today.getFullYear(), today.getMonth(), today.getDate());

    const cells = [];

    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ outside: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = dayKey(year, month, d);
      cells.push({
        outside: false,
        day: d,
        key,
        isToday: key === todayKey,
        events: eventsByDay.get(key) || []
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ outside: true });
    }

    gridEl.innerHTML = cells.map(cell => {
      if (cell.outside) return '<div class="cal-day cal-day-outside"></div>';

      const dots = cell.events.slice(0, 4).map(event =>
        `<span class="cal-dot ${CAL_COLOR_CLASS[event.calendarName] || 'cal-dot-fd'}" title="${FD.escapeHTML(event.summary)}"></span>`
      ).join('');

      const classes = ['cal-day'];
      if (cell.isToday) classes.push('cal-day-today');
      if (cell.key === selectedKey) classes.push('cal-day-selected');
      if (cell.events.length) classes.push('cal-day-has-events');

      return `
        <button type="button" class="${classes.join(' ')}" data-day-key="${cell.key}">
          <span class="cal-day-num">${cell.day}</span>
          <span class="cal-day-dots">${dots}</span>
        </button>`;
    }).join('');

    gridEl.querySelectorAll('[data-day-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        highlightDay(btn.dataset.dayKey);
        openDayModal(btn.dataset.dayKey);
      });
    });
  }

  /* Evidenzia il giorno nella griglia, senza aprire il popup
     (usato anche al caricamento, per segnare il prossimo evento). */
  function highlightDay(key) {
    selectedKey = key;

    gridEl.querySelectorAll('[data-day-key]').forEach(btn => {
      btn.classList.toggle('cal-day-selected', btn.dataset.dayKey === key);
    });
  }

  /* Apre il popup con gli eventi del giorno cliccato. */
  function openDayModal(key) {
    if (!modalEl) return;

    const [y, m, d] = key.split('-').map(Number);
    modalTitleEl.textContent = formatDayTitle(new Date(y, m - 1, d));

    const dayEvents = (eventsByDay.get(key) || [])
      .slice()
      .sort((a, b) => eventDate(a) - eventDate(b));

    modalBodyEl.innerHTML = dayEvents.length
      ? dayEvents.map(event => `
          <article class="cal-event-item">
            <span class="cal-dot ${CAL_COLOR_CLASS[event.calendarName] || 'cal-dot-fd'}"></span>
            <div>
              <div class="cal-event-item-head">
                <strong>${FD.escapeHTML(event.summary || event.calendarLabel)}</strong>
                <span class="muted small">${formatTime(event)}</span>
              </div>
              ${formatEventDescription(event.description)}
              <p class="muted small">${FD.escapeHTML(event.serverName)}</p>
            </div>
          </article>
        `).join('')
      : '<p class="muted">Nessun evento in questo giorno.</p>';

    modalEl.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeDayModal() {
    if (!modalEl) return;
    modalEl.hidden = true;
    document.body.style.overflow = '';
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeDayModal);

  if (modalEl) {
    modalEl.addEventListener('click', event => {
      if (event.target === modalEl) closeDayModal();
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modalEl && !modalEl.hidden) closeDayModal();
  });

  function goToMonth(offset) {
    currentMonth.setMonth(currentMonth.getMonth() + offset);
    renderMonth();
  }

  prevBtn.addEventListener('click', () => goToMonth(-1));
  nextBtn.addEventListener('click', () => goToMonth(1));

  todayBtn.addEventListener('click', () => {
    currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    renderMonth();

    const today = new Date();
    highlightDay(dayKey(today.getFullYear(), today.getMonth(), today.getDate()));
  });

  try {
    const response = await fetch('/api/calendar-full');
    events = await response.json();

    if (!response.ok || !Array.isArray(events)) {
      throw new Error('Errore caricamento calendario');
    }

    events.sort((a, b) => eventDate(a) - eventDate(b));
    indexEvents();
    renderNextEventBanner();
    renderMonth();

    const now = new Date();
    const upcomingKey = (events.find(event => eventDate(event).getTime() >= now.getTime()) || {});
    highlightDay(upcomingKey.startValue ? eventDayKey(upcomingKey) : dayKey(now.getFullYear(), now.getMonth(), now.getDate()));

  } catch (error) {
    console.error('Errore caricamento calendario:', error);
    renderMonth();
  }
});
