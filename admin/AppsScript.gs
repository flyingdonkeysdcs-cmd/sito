/* ==========================================================
   FLYING DONKEYS — PORTALE ADMIN
   Backend Google Apps Script

   Questo file NON viene eseguito dal sito: va copiato ed
   eseguito dentro al foglio Google (Estensioni > Apps Script).
   Vedi admin/ISTRUZIONI.md per i passaggi di installazione.

   Gestisce, con un unico endpoint "app web":
     - Roster piloti (foglio "Statistiche")
     - Foto e coordinate piloti (foglio "FotoPiloti")
     - Regole medagliere (foglio "RegoleMedaglie")
     - Mission Log (foglio "AAR")
     - Eventi calendario (stessi calendari del sito)
     - Social: didascalie e pubblicazione Facebook/Instagram

   Sicurezza: una password condivisa, salvata come "Proprietà
   dello script" (mai nel codice, mai su GitHub). Ogni richiesta
   del portale deve includerla; senza password corretta nessuna
   lettura o scrittura viene eseguita.
   ========================================================== */

const SHEET_NAMES = {
  roster: 'Statistiche',
  pilotPhotos: 'FotoPiloti',
  medalRules: 'RegoleMedaglie',
  missions: 'AAR'
};

/* Stessi calendari letti da api/calendar-events.js sul sito */
const CALENDARS = [
  { name: 'Flying Donkeys', id: '910d7da6fd44cf9672d6f950c3056f3cf87b33512e902113d9fe82e836adf404@group.calendar.google.com' },
  { name: 'Flying Donkeys Events', id: 'flyingdonkeysdcs@gmail.com' },
  { name: 'JATF', id: '609e54e597d66d5d7ba5605cdde4840b0218a70d2118bcc89b735094d6ff62ba@group.calendar.google.com' }
];


/* ----------------------------------------------------------
   PUNTO D'INGRESSO
   ---------------------------------------------------------- */

function doPost(e) {
  let body;

  try {
    body = JSON.parse(e.postData.contents);
  } catch (error) {
    return jsonResponse({ error: 'Richiesta non valida.' });
  }

  const action = body.action;
  const password = body.password;
  const payload = body.payload || {};

  if (!checkPassword(password)) {
    return jsonResponse({ error: 'Password errata.' });
  }

  try {
    const result = routeAction(action, payload);
    return jsonResponse({ ok: true, data: result });

  } catch (error) {
    return jsonResponse({ error: String(error.message || error) });
  }
}


function routeAction(action, payload) {
  switch (action) {

    case 'getRoster':        return getSheetAsObjects(SHEET_NAMES.roster);
    case 'saveRosterPilot':  return saveRowByKey(SHEET_NAMES.roster, 0, payload);
    case 'deleteRosterPilot': return deleteRosterPilot(payload);

    case 'getPilotPhotos':       return getPilotPhotos();
    case 'savePilotPhoto':       return savePilotPhoto(payload);

    case 'getMedalRules':        return getMedalRules();
    case 'saveMedalRule':        return saveMedalRule(payload);

    case 'getMissions':          return getMissions();
    case 'saveMission':          return saveMission(payload);

    case 'getEvents':            return getEvents();
    case 'saveEvent':            return saveEvent(payload);
    case 'deleteEvent':          return deleteEvent(payload);

    case 'uploadImage':          return uploadImageToGithub(payload);

    case 'recordAttendance':     return recordAttendance(payload);

    case 'getSocial':                return getSocialOverview();
    case 'saveSocialCaption':        return saveSocialCaption(payload);
    case 'saveSocialDefaultCaption': return saveSocialDefaultCaption(payload);
    case 'publishSocialNow':         return publishSocialNow();
    case 'saveSocialSchedule':       return saveSocialSchedule(payload);
    case 'saveSocialQueue':          return saveSocialQueue(payload);

    default:
      throw new Error('Azione sconosciuta: ' + action);
  }
}


function checkPassword(password) {
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  return !!expected && password === expected;
}


function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ----------------------------------------------------------
   UTILITY GENERICHE FOGLIO
   ---------------------------------------------------------- */

function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Foglio non trovato: ' + name);
  return sheet;
}


/*
 * Alcune celle sono di tipo nativo (data, checkbox) e getValues()
 * le restituisce come oggetto Date o booleano JS, non come testo.
 * Il sito legge pero' sempre tutto come stringa (CSV pubblico), con
 * le date in formato gg/mm/aaaa e i booleani come "TRUE"/"FALSE":
 * qui uniformiamo la lettura allo stesso formato, cosi' il portale
 * mostra e riscrive gli stessi valori che il sito si aspetta.
 */
function formatCellValue(value) {
  if (value instanceof Date) {
    const hasTime = value.getHours() || value.getMinutes() || value.getSeconds();
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      hasTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy'
    );
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  return value;
}


/*
 * Legge un intero foglio e lo restituisce come { headers, rows }
 * dove ogni riga e' un oggetto { nomeColonna: valore }.
 * Usato per Roster e Mission Log, i cui fogli hanno intestazioni
 * "vere" e possono crescere di colonne nel tempo.
 */
function getSheetAsObjects(sheetName) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();

  const headers = values[0].map(h => String(h || '').trim());

  const rows = values.slice(1)
    .filter(row => row.some(cell => String(cell || '').trim() !== ''))
    .map((row, index) => {
      const obj = { _row: index + 2 }; // riga reale nel foglio (per debug)

      headers.forEach((header, i) => {
        if (header) obj[header] = formatCellValue(row[i]);
      });

      return obj;
    });

  return { headers: headers.filter(Boolean), rows };
}


/*
 * Aggiorna la riga la cui colonna "keyColumnIndex" combacia con
 * payload.key (confronto case-insensitive), scrivendo i valori
 * in payload.values per nome di colonna. Se non trova la riga
 * (o payload.key e' vuoto) ne aggiunge una nuova in fondo.
 * Restituisce { created: bool }.
 */
function saveRowByKey(sheetName, keyColumnIndex, payload) {
  const sheet = getSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h || '').trim());

  const newValues = payload.values || {};
  const key = String(payload.key || '').trim().toLowerCase();

  let targetRow = -1;

  if (key) {
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][keyColumnIndex] || '').trim().toLowerCase() === key) {
        targetRow = r + 1; // 1-indexed per getRange
        break;
      }
    }
  }

  if (targetRow === -1) {
    // Nuova riga: scrive solo una volta alla fine, colonna per colonna
    const rowArray = headers.map(header => newValues[header] ?? '');
    sheet.appendRow(rowArray);
    return { created: true };
  }

  headers.forEach((header, i) => {
    if (Object.prototype.hasOwnProperty.call(newValues, header)) {
      sheet.getRange(targetRow, i + 1).setValue(newValues[header]);
    }
  });

  return { created: false };
}


/*
 * Elimina un pilota dal Roster (Statistiche).
 *
 * Attenzione: la colonna "Pilota" nel foglio FotoPiloti e' generata
 * da una formula collegata a questo foglio (vedi savePilotPhoto piu'
 * sotto), ma le colonne Foto/Coordinate sono valori fissi per riga.
 * Eliminare una riga da Statistiche fa scorrere verso l'alto tutti i
 * nomi sottostanti (anche in FotoPiloti, via formula), ma SENZA
 * questo resync le foto/coordinate degli altri piloti resterebbero
 * ferme nella vecchia riga, disallineandosi dal nome giusto di una
 * posizione. Per questo si salva prima una mappa nome -> foto/
 * coordinate, si elimina la riga, e poi si riscrivono foto/coordinate
 * nelle righe giuste in base ai nomi aggiornati.
 */
function deleteRosterPilot(payload) {
  const key = String(payload.key || '').trim();
  if (!key) throw new Error('Nessun pilota specificato.');

  const photosByName = {};
  getPilotPhotos().rows.forEach(row => {
    photosByName[row.pilota.trim().toLowerCase()] = {
      fotoProfilo: row.fotoProfilo,
      fotoHeader: row.fotoHeader,
      coordinate: row.coordinate
    };
  });

  const rosterSheet = getSheet(SHEET_NAMES.roster);
  const rosterValues = rosterSheet.getDataRange().getValues();
  const keyLower = key.toLowerCase();

  let targetRow = -1;
  for (let r = 1; r < rosterValues.length; r++) {
    if (String(rosterValues[r][0] || '').trim().toLowerCase() === keyLower) {
      targetRow = r + 1;
      break;
    }
  }
  if (targetRow === -1) throw new Error('Pilota non trovato nel Roster: ' + key);

  rosterSheet.deleteRow(targetRow);
  SpreadsheetApp.flush();

  const photoSheet = getSheet(SHEET_NAMES.pilotPhotos);
  const photoValues = photoSheet.getDataRange().getValues();

  for (let r = 1; r < photoValues.length; r++) {
    const name = String(photoValues[r][0] || '').trim().toLowerCase();
    if (!name) continue;

    const data = photosByName[name] || { fotoProfilo: '', fotoHeader: '', coordinate: '' };
    photoSheet.getRange(r + 1, 2, 1, 3).setValues([[
      data.fotoProfilo || '',
      data.fotoHeader || '',
      data.coordinate || ''
    ]]);
  }

  return { deleted: true };
}


/* ----------------------------------------------------------
   FOTO PILOTI
   Colonne fisse: A nome, B FotoProfilo, C FotoHeader,
   D coordinate "lat,lng" (colonna senza intestazione nel foglio).
   ---------------------------------------------------------- */

function getPilotPhotos() {
  const sheet = getSheet(SHEET_NAMES.pilotPhotos);
  const values = sheet.getDataRange().getValues();

  const rows = values.slice(1)
    .filter(row => String(row[0] || '').trim() !== '')
    .map((row, index) => ({
      _row: index + 2,
      pilota: formatCellValue(row[0]),
      fotoProfilo: formatCellValue(row[1]) || '',
      fotoHeader: formatCellValue(row[2]) || '',
      coordinate: formatCellValue(row[3]) || ''
    }));

  return { rows };
}


function savePilotPhoto(payload) {
  const sheet = getSheet(SHEET_NAMES.pilotPhotos);
  const values = sheet.getDataRange().getValues();

  const key = String(payload.key || '').trim().toLowerCase();
  const v = payload.values || {};

  let targetRow = -1;

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][0] || '').trim().toLowerCase() === key) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    throw new Error(
      'Pilota "' + payload.key + '" non trovato in FotoPiloti. La colonna ' +
      'Pilota qui e\' generata automaticamente da una formula collegata al ' +
      'Roster (Statistiche): aggiungi prima il pilota nel Roster, poi la riga ' +
      'comparira\' qui automaticamente e potrai aggiungere foto/coordinate.'
    );
  }

  /* Scrive SOLO le colonne B,C,D (FotoProfilo, FotoHeader, coordinate).
     La colonna A (Pilota) e' generata da una formula che rispecchia il
     foglio Statistiche: scriverci sopra direttamente rompe l'intervallo
     "versato" dalla formula per TUTTE le righe sottostanti. */
  sheet.getRange(targetRow, 2, 1, 3).setValues([[
    v.fotoProfilo || '',
    v.fotoHeader || '',
    v.coordinate || ''
  ]]);

  return { created: false };
}


/* ----------------------------------------------------------
   REGOLE MEDAGLIERE
   Colonne fisse (posizione, non nome intestazione):
   A medaglia, B statistica, C tipo, D valore/soglia,
   E (immagine incorporata, non gestita), F immagine nastrino,
   G descrizione, H immagine dettaglio, I titolo.
   ---------------------------------------------------------- */

function getMedalRules() {
  const sheet = getSheet(SHEET_NAMES.medalRules);
  const values = sheet.getDataRange().getValues();

  const rows = values.slice(1)
    .filter(row => String(row[0] || '').trim() !== '')
    .map((row, index) => ({
      _row: index + 2,
      medaglia: formatCellValue(row[0]),
      statistica: formatCellValue(row[1]),
      tipo: formatCellValue(row[2]),
      valore: formatCellValue(row[3]),
      immagineNastrino: formatCellValue(row[5]) || '',
      descrizione: formatCellValue(row[6]) || '',
      immagineDettaglio: formatCellValue(row[7]) || '',
      titolo: formatCellValue(row[8]) || ''
    }));

  return { rows };
}


function saveMedalRule(payload) {
  const sheet = getSheet(SHEET_NAMES.medalRules);
  const values = sheet.getDataRange().getValues();

  const key = String(payload.key || '').trim().toLowerCase();
  const v = payload.values || {};

  let targetRow = -1;

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][0] || '').trim().toLowerCase() === key) {
      targetRow = r + 1;
      break;
    }
  }

  if (targetRow === -1) {
    sheet.appendRow([
      payload.key || '',
      v.statistica || '',
      v.tipo || '',
      v.valore || '',
      '',
      v.immagineNastrino || '',
      v.descrizione || '',
      v.immagineDettaglio || '',
      v.titolo || ''
    ]);
    return { created: true };
  }

  sheet.getRange(targetRow, 2, 1, 1).setValue(v.statistica || '');
  sheet.getRange(targetRow, 3, 1, 1).setValue(v.tipo || '');
  sheet.getRange(targetRow, 4, 1, 1).setValue(v.valore || '');
  sheet.getRange(targetRow, 6, 1, 1).setValue(v.immagineNastrino || '');
  sheet.getRange(targetRow, 7, 1, 1).setValue(v.descrizione || '');
  sheet.getRange(targetRow, 8, 1, 1).setValue(v.immagineDettaglio || '');
  sheet.getRange(targetRow, 9, 1, 1).setValue(v.titolo || '');

  return { created: false };
}


/* ----------------------------------------------------------
   MISSION LOG (AAR)
   Identificato per numero di riga (_row), non per nome: non
   esiste una chiave naturale univoca (data+titolo potrebbero
   ripetersi).
   ---------------------------------------------------------- */

function getMissions() {
  return getSheetAsObjects(SHEET_NAMES.missions);
}


function saveMission(payload) {
  const sheet = getSheet(SHEET_NAMES.missions);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h || '').trim());

  const v = payload.values || {};
  const row = payload.row; // numero di riga reale (1-indexed), null se nuova

  const rowArray = headers.map(header => v[header] ?? '');

  if (!row) {
    sheet.appendRow(rowArray);
    return { created: true };
  }

  sheet.getRange(row, 1, 1, headers.length).setValues([rowArray]);
  return { created: false };
}


/* ----------------------------------------------------------
   CALENDARIO EVENTI
   ---------------------------------------------------------- */

function getEvents() {
  const now = new Date();
  const until = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 120); // 120 giorni avanti

  const events = [];

  CALENDARS.forEach(cal => {
    try {
      const calendar = CalendarApp.getCalendarById(cal.id);
      if (!calendar) return;

      calendar.getEvents(now, until).forEach(event => {
        events.push({
          calendarName: cal.name,
          id: event.getId(),
          title: event.getTitle(),
          description: event.getDescription(),
          start: event.getStartTime().toISOString(),
          end: event.getEndTime().toISOString()
        });
      });

    } catch (error) {
      // Un calendario non accessibile non blocca gli altri
      events.push({
        calendarName: cal.name,
        error: String(error.message || error)
      });
    }
  });

  events.sort((a, b) => new Date(a.start || 0) - new Date(b.start || 0));

  return { events };
}


function saveEvent(payload) {
  const calInfo = CALENDARS.find(c => c.name === payload.calendarName);
  if (!calInfo) throw new Error('Calendario sconosciuto: ' + payload.calendarName);

  const calendar = CalendarApp.getCalendarById(calInfo.id);
  if (!calendar) throw new Error('Calendario non accessibile: ' + calInfo.name);

  const start = new Date(payload.start);
  const end = new Date(payload.end || payload.start);

  if (payload.id) {
    const event = calendar.getEventById(payload.id);
    if (!event) throw new Error('Evento non trovato.');

    event.setTitle(payload.title || event.getTitle());
    event.setDescription(payload.description || '');
    event.setTime(start, end);

    return { created: false, id: event.getId() };
  }

  const newEvent = calendar.createEvent(
    payload.title || 'Evento Flying Donkeys',
    start,
    end,
    { description: payload.description || '' }
  );

  return { created: true, id: newEvent.getId() };
}


function deleteEvent(payload) {
  const calInfo = CALENDARS.find(c => c.name === payload.calendarName);
  if (!calInfo) throw new Error('Calendario sconosciuto: ' + payload.calendarName);

  const calendar = CalendarApp.getCalendarById(calInfo.id);
  if (!calendar) throw new Error('Calendario non accessibile: ' + calInfo.name);

  const event = calendar.getEventById(payload.id);
  if (!event) throw new Error('Evento non trovato.');

  event.deleteEvent();

  return { deleted: true };
}


/* ----------------------------------------------------------
   PRESENZE (incrementa un contatore attività + "Ultima attività")
   ---------------------------------------------------------- */

function recordAttendance(payload) {
  const activityColumn = payload.activityColumn;
  const date = payload.date; // stringa gg/mm/aaaa, già formattata dal portale
  const pilots = payload.pilots || [];

  if (!activityColumn) throw new Error('Tipo di attività non specificato.');
  if (!pilots.length) throw new Error('Nessun pilota selezionato.');

  const sheet = getSheet(SHEET_NAMES.roster);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h || '').trim());

  const activityIndex = headers.indexOf(activityColumn);
  if (activityIndex === -1) throw new Error('Colonna attività sconosciuta: ' + activityColumn);

  const lastActivityIndex = headers.findIndex(h => h.trim().toLowerCase() === 'ultima attività');

  const updated = [];
  const notFound = [];

  pilots.forEach(pilotName => {
    const rowIndex = values.findIndex((row, i) =>
      i > 0 && String(row[0]).trim().toLowerCase() === String(pilotName).trim().toLowerCase()
    );

    if (rowIndex === -1) {
      notFound.push(pilotName);
      return;
    }

    const currentValue = Number(String(values[rowIndex][activityIndex] || '0').trim()) || 0;
    sheet.getRange(rowIndex + 1, activityIndex + 1).setValue(currentValue + 1);

    if (lastActivityIndex !== -1) {
      sheet.getRange(rowIndex + 1, lastActivityIndex + 1).setValue(date);
    }

    updated.push(pilotName);
  });

  return { updated, notFound };
}


/* ----------------------------------------------------------
   UPLOAD IMMAGINI SU GITHUB
   Committa un file direttamente sul branch main del repo del
   sito, cosi' l'immagine e' subito disponibile all'URL finale
   dopo il deploy automatico di Vercel.
   ---------------------------------------------------------- */

const GITHUB_OWNER = 'flyingdonkeysdcs-cmd';
const GITHUB_REPO = 'sito';
const GITHUB_BRANCH = 'main';

function uploadImageToGithub(payload) {
  const path = payload.path; // es. "images/pilots/nomepilota_profilo.webp"
  const base64Data = payload.base64; // senza prefisso "data:...;base64,"

  if (!path) throw new Error('Percorso del file non specificato.');
  if (!base64Data) throw new Error('Nessun file ricevuto.');

  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN non configurato nelle Proprietà dello script.');

  const apiUrl = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + path;
  const headers = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json'
  };

  let sha = null;
  const getResponse = UrlFetchApp.fetch(apiUrl + '?ref=' + GITHUB_BRANCH, {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  });

  if (getResponse.getResponseCode() === 200) {
    sha = JSON.parse(getResponse.getContentText()).sha;
  }

  const putBody = {
    message: 'Portale admin: aggiorna ' + path,
    content: base64Data,
    branch: GITHUB_BRANCH
  };
  if (sha) putBody.sha = sha;

  const putResponse = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify(putBody),
    muteHttpExceptions: true
  });

  const code = putResponse.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('Errore GitHub (' + code + '): ' + putResponse.getContentText());
  }

  return {
    path: path,
    url: 'https://www.flyingdonkeysvirtualsquadron.it/' + path
  };
}


/* ----------------------------------------------------------
   SOCIAL — PUBBLICAZIONE AUTOMATICA FACEBOOK + INSTAGRAM

   Pubblica a rotazione le foto della galleria del sito
   (images/gallery) sulla Pagina Facebook e sull'account
   Instagram professionale, nei giorni e all'ora scelti dal
   portale admin (scheda Social). Vedi admin/ISTRUZIONI-SOCIAL.md.

   Proprietà dello script richieste (mai nel codice):
     META_PAGE_ID      ID della Pagina Facebook
     META_PAGE_TOKEN   token della Pagina (permanente)
     META_IG_USER_ID   ID dell'account Instagram professionale
   Gestite dal portale (facoltative):
     SOCIAL_CAPTION    didascalia standard (altrimenti quella sotto)
     SOCIAL_SCHEDULE   giorni e ora (altrimenti SOCIAL_SCHEDULE_DEFAULT)

   Fogli usati (gestiti dal portale, creati da soli se mancano):
     "SocialLog"        storico: data, foto, ID post, errori
     "SocialDidascalie" colonna A = nome file (es. 3.webp),
                        colonna B = testo specifico per quella foto;
                        in fondo viene sempre aggiunta la standard
     "SocialCoda"       colonna A = foto nell'ordine di uscita,
                        colonna B = esclusa (TRUE = mai sui social)
   ---------------------------------------------------------- */

const SOCIAL_SITE_URL = 'https://www.flyingdonkeysvirtualsquadron.it';
const SOCIAL_GRAPH_URL = 'https://graph.facebook.com/v27.0';

/*
 * Giorni e ora di pubblicazione PREDEFINITI (fuso orario del progetto).
 * Dal portale admin (scheda Social) si possono cambiare: la scelta
 * viene salvata nella proprietà SOCIAL_SCHEDULE e ha la precedenza.
 */
const SOCIAL_SCHEDULE_DEFAULT = {
  days: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
  hour: 18
};

const SOCIAL_WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const SOCIAL_DEFAULT_CAPTION =
  'Flying Donkeys Virtual Squadron ✈️\n' +
  'Squadriglia virtuale italiana su DCS World. Unisciti a noi!\n' +
  SOCIAL_SITE_URL + '\n\n' +
  '#DCSWorld #FlyingDonkeys #flightsim #simulazionevolo #aviazione';

const SOCIAL_SHEETS = {
  log: 'SocialLog',
  captions: 'SocialDidascalie',
  queue: 'SocialCoda'
};


/* Programmazione attuale: quella salvata dal portale, o la predefinita. */
function getSocialSchedule() {
  const saved = PropertiesService.getScriptProperties().getProperty('SOCIAL_SCHEDULE');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.days) && parsed.days.length && parsed.hour >= 0 && parsed.hour <= 23) return parsed;
    } catch (error) { /* valore rovinato: si usa la predefinita */ }
  }
  return SOCIAL_SCHEDULE_DEFAULT;
}


/*
 * Attiva (o aggiorna) la pubblicazione automatica con la programmazione
 * attuale. Si può eseguire dall'editor oppure dal portale admin.
 */
function setupSocialSchedule() {
  stopSocialSchedule();

  const schedule = getSocialSchedule();
  schedule.days.forEach(day => {
    ScriptApp.newTrigger('publishNextSocialPost')
      .timeBased()
      .onWeekDay(ScriptApp.WeekDay[day])
      .atHour(schedule.hour)
      .create();
  });

  getSocialLogSheet();
  Logger.log('Pubblicazione programmata: ' + schedule.days.join(', ') +
    ' tra le ' + schedule.hour + ':00 e le ' + (schedule.hour + 1) + ':00.');
}


/* Ferma la pubblicazione automatica. */
function stopSocialSchedule() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'publishNextSocialPost')
    .forEach(t => ScriptApp.deleteTrigger(t));
}


/* Prova senza pubblicare: mostra nel log quale foto e didascalia userebbe. */
function previewNextSocialPost() {
  const file = pickNextGalleryFile();
  Logger.log('Prossima foto: ' + file);
  Logger.log('URL immagine: ' + socialImageUrl(file));
  Logger.log('Didascalia:\n' + getSocialCaption(file));
}


/* Chiamata dai trigger (o a mano, per pubblicare subito). */
function publishNextSocialPost() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;

  try {
    const config = getSocialConfig();
    const file = pickNextGalleryFile();
    const imageUrl = socialImageUrl(file);
    const caption = getSocialCaption(file);

    // Verifica che la conversione in JPEG funzioni prima di pubblicare.
    const check = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true });
    if (check.getResponseCode() !== 200) {
      throw new Error('Immagine non disponibile (' + check.getResponseCode() + '): ' + imageUrl);
    }

    let facebookId = '';
    let instagramId = '';
    const errors = [];

    try {
      facebookId = publishToFacebook(config, imageUrl, caption);
    } catch (error) {
      errors.push('Facebook: ' + (error.message || error));
    }

    try {
      instagramId = publishToInstagram(config, imageUrl, caption);
    } catch (error) {
      errors.push('Instagram: ' + (error.message || error));
    }

    getSocialLogSheet().appendRow([new Date(), file, facebookId, instagramId, errors.join(' | ')]);

    // Fa fallire l'esecuzione: Google manda una mail di errore al proprietario.
    if (errors.length) throw new Error(errors.join(' | '));

  } finally {
    lock.releaseLock();
  }
}


function getSocialConfig() {
  const props = PropertiesService.getScriptProperties();
  const config = {
    pageId: props.getProperty('META_PAGE_ID'),
    pageToken: props.getProperty('META_PAGE_TOKEN'),
    igUserId: props.getProperty('META_IG_USER_ID')
  };

  if (!config.pageId || !config.pageToken || !config.igUserId) {
    throw new Error('Proprietà dello script mancanti: META_PAGE_ID, META_PAGE_TOKEN, META_IG_USER_ID (vedi ISTRUZIONI-SOCIAL.md).');
  }
  return config;
}


function socialImageUrl(file) {
  return SOCIAL_SITE_URL + '/api/social-image?file=' + encodeURIComponent(file);
}


/*
 * Sceglie la foto: prima quelle mai pubblicate, nell'ordine della coda
 * (decisa dal portale admin, altrimenti 1, 2, 3...), poi, finito il
 * giro, quella pubblicata meno di recente. Le foto escluse non escono
 * mai. Le foto nuove aggiunte alla galleria entrano da sole in fondo.
 */
function pickNextGalleryFile(files, lastPosted, queue) {
  files = files || getGalleryFiles();
  lastPosted = lastPosted || getSocialLastPosted();
  queue = queue || getSocialQueue(files);

  if (!files.length) throw new Error('La galleria del sito è vuota.');

  const candidates = queue.order.filter(f => queue.excluded.indexOf(f) === -1);
  if (!candidates.length) throw new Error('Tutte le foto della galleria sono escluse dai social.');

  const never = candidates.filter(f => !lastPosted[f]);
  if (never.length) return never[0];

  // Array.sort è stabile: a parità di data resta l'ordine della coda.
  return candidates.slice().sort((a, b) => lastPosted[a] - lastPosted[b])[0];
}


/*
 * Coda dal foglio SocialCoda (colonna A = foto nell'ordine voluto,
 * colonna B = esclusa). Solo le foto ancora presenti in galleria;
 * quelle non elencate si aggiungono in fondo, nell'ordine del sito.
 */
function getSocialQueue(files) {
  files = files || getGalleryFiles();
  const order = [];
  const excluded = [];

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOCIAL_SHEETS.queue);
  if (sheet) {
    sheet.getDataRange().getValues().slice(1).forEach(r => {
      const file = String(r[0]).trim();
      if (!file || files.indexOf(file) === -1 || order.indexOf(file) !== -1) return;
      order.push(file);
      if (r[1] === true || String(r[1]).toUpperCase() === 'TRUE') excluded.push(file);
    });
  }

  files.forEach(f => { if (order.indexOf(f) === -1) order.push(f); });
  return { order: order, excluded: excluded };
}


/* Nomi dei file in images/gallery, nello stesso ordine del sito. */
function getGalleryFiles() {
  const response = UrlFetchApp.fetch(SOCIAL_SITE_URL + '/api/gallery');
  return JSON.parse(response.getContentText())
    .map(img => String(img.src).split('/').pop());
}


/* { "3.webp": Date ultima pubblicazione riuscita (almeno una piattaforma) } */
function getSocialLastPosted() {
  const lastPosted = {};
  getSocialLogSheet().getDataRange().getValues().slice(1).forEach(row => {
    const date = row[0];
    const file = String(row[1]);
    const ok = row[2] || row[3];
    if (file && ok && date instanceof Date) {
      if (!lastPosted[file] || date > lastPosted[file]) lastPosted[file] = date;
    }
  });
  return lastPosted;
}


/* { "3.webp": "didascalia specifica" } dal foglio SocialDidascalie */
function getSocialCaptionMap() {
  const map = {};
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOCIAL_SHEETS.captions);
  if (sheet) {
    sheet.getDataRange().getValues().forEach(r => {
      const file = String(r[0]).trim();
      const caption = String(r[1]).trim();
      if (file && caption) map[file] = caption;
    });
  }
  return map;
}


function getSocialDefaultCaption() {
  return PropertiesService.getScriptProperties().getProperty('SOCIAL_CAPTION') || SOCIAL_DEFAULT_CAPTION;
}


/* Testo specifico della foto (se c'è) + didascalia standard in fondo. */
function getSocialCaption(file) {
  const custom = getSocialCaptionMap()[file];
  const standard = getSocialDefaultCaption();
  return custom ? custom + '\n\n' + standard : standard;
}


/* ---------- Azioni del portale admin (scheda "Social") ---------- */

function getSocialOverview() {
  const tz = Session.getScriptTimeZone();
  const fmt = d => Utilities.formatDate(d, tz, 'dd/MM/yyyy HH:mm');

  const files = getGalleryFiles();
  const lastPostedDates = getSocialLastPosted();
  const lastPosted = {};
  Object.keys(lastPostedDates).forEach(f => { lastPosted[f] = fmt(lastPostedDates[f]); });

  const log = getSocialLogSheet().getDataRange().getValues().slice(1)
    .filter(row => row[1])
    .map(row => ({
      date: row[0] instanceof Date ? fmt(row[0]) : String(row[0]),
      file: String(row[1]),
      facebook: String(row[2] || ''),
      instagram: String(row[3] || ''),
      errors: String(row[4] || '')
    }))
    .reverse()
    .slice(0, 30);

  const props = PropertiesService.getScriptProperties();
  const triggers = ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'publishNextSocialPost');
  const schedule = getSocialSchedule();
  const queue = getSocialQueue(files);

  let next = '';
  try { next = pickNextGalleryFile(files, lastPostedDates, queue); } catch (error) { /* nessuna foto disponibile */ }

  return {
    files: files,
    order: queue.order,
    excluded: queue.excluded,
    next: next,
    lastPosted: lastPosted,
    captions: getSocialCaptionMap(),
    defaultCaption: getSocialDefaultCaption(),
    log: log,
    schedule: {
      active: triggers.length > 0,
      days: schedule.days,
      hour: schedule.hour
    },
    configured: !!(props.getProperty('META_PAGE_ID') && props.getProperty('META_PAGE_TOKEN') && props.getProperty('META_IG_USER_ID'))
  };
}


/*
 * Salva giorni/ora e attiva o ferma la pubblicazione automatica.
 * payload: { days: ['MONDAY', ...], hour: 18, active: true }
 */
function saveSocialSchedule(payload) {
  const days = (payload.days || []).filter(d => SOCIAL_WEEKDAYS.indexOf(d) !== -1);
  const hour = Number(payload.hour);

  if (!days.length) throw new Error('Scegli almeno un giorno.');
  if (!(hour >= 0 && hour <= 23) || Math.floor(hour) !== hour) throw new Error('Ora non valida.');

  // Giorni in ordine di settimana, senza doppioni.
  const sorted = SOCIAL_WEEKDAYS.filter(d => days.indexOf(d) !== -1);
  PropertiesService.getScriptProperties()
    .setProperty('SOCIAL_SCHEDULE', JSON.stringify({ days: sorted, hour: hour }));

  if (payload.active) setupSocialSchedule();
  else stopSocialSchedule();

  return { days: sorted, hour: hour, active: !!payload.active };
}


/*
 * Salva l'ordine della coda e le foto escluse.
 * payload: { order: ['3.webp', '1.webp', ...], excluded: ['7.webp'] }
 */
function saveSocialQueue(payload) {
  const order = (payload.order || []).map(String);
  const excluded = (payload.excluded || []).map(String);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SOCIAL_SHEETS.queue);
  if (!sheet) sheet = ss.insertSheet(SOCIAL_SHEETS.queue);

  const rows = [['Foto', 'Esclusa']].concat(order.map(f => [f, excluded.indexOf(f) !== -1]));
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.setFrozenRows(1);

  return { saved: order.length };
}


/* Didascalia di una foto: testo vuoto = torna a quella standard. */
function saveSocialCaption(payload) {
  const file = String(payload.file || '').trim();
  const caption = String(payload.caption || '').trim();
  if (!file) throw new Error('Foto non specificata.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SOCIAL_SHEETS.captions);
  if (!sheet) {
    sheet = ss.insertSheet(SOCIAL_SHEETS.captions);
    sheet.appendRow(['Foto', 'Didascalia']);
    sheet.setFrozenRows(1);
  }

  const values = sheet.getDataRange().getValues();
  const index = values.findIndex(r => String(r[0]).trim() === file);

  if (index >= 0) {
    if (caption) sheet.getRange(index + 1, 2).setValue(caption);
    else sheet.deleteRow(index + 1);
  } else if (caption) {
    sheet.appendRow([file, caption]);
  }

  return { file: file, caption: caption };
}


/* Didascalia standard: testo vuoto = torna a quella scritta nello script. */
function saveSocialDefaultCaption(payload) {
  const caption = String(payload.caption || '').trim();
  const props = PropertiesService.getScriptProperties();
  if (caption) props.setProperty('SOCIAL_CAPTION', caption);
  else props.deleteProperty('SOCIAL_CAPTION');
  return { defaultCaption: getSocialDefaultCaption() };
}


/* "Pubblica ora": pubblica la prossima foto e restituisce l'esito. */
function publishSocialNow() {
  const before = getSocialLogSheet().getLastRow();
  let failure = '';

  try {
    publishNextSocialPost();
  } catch (error) {
    failure = String(error.message || error);
  }

  const sheet = getSocialLogSheet();
  if (sheet.getLastRow() === before) {
    throw new Error(failure || 'Pubblicazione già in corso, riprova tra un minuto.');
  }

  const row = sheet.getRange(sheet.getLastRow(), 1, 1, 5).getValues()[0];
  return {
    file: String(row[1]),
    facebook: String(row[2] || ''),
    instagram: String(row[3] || ''),
    errors: String(row[4] || '')
  };
}


function getSocialLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SOCIAL_SHEETS.log);
  if (!sheet) {
    sheet = ss.insertSheet(SOCIAL_SHEETS.log);
    sheet.appendRow(['Data', 'Foto', 'Post Facebook', 'Post Instagram', 'Errori']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}


/* Chiamate alla Graph API di Meta: restituiscono il JSON o lanciano l'errore. */
function metaPost(path, params) {
  const response = UrlFetchApp.fetch(SOCIAL_GRAPH_URL + path, {
    method: 'post',
    payload: params,
    muteHttpExceptions: true
  });
  const data = JSON.parse(response.getContentText());
  if (data.error) throw new Error(data.error.message);
  return data;
}


function metaGet(path, params) {
  const query = Object.keys(params)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
  const response = UrlFetchApp.fetch(SOCIAL_GRAPH_URL + path + '?' + query, { muteHttpExceptions: true });
  const data = JSON.parse(response.getContentText());
  if (data.error) throw new Error(data.error.message);
  return data;
}


function publishToFacebook(config, imageUrl, caption) {
  const data = metaPost('/' + config.pageId + '/photos', {
    url: imageUrl,
    message: caption,
    access_token: config.pageToken
  });
  return data.post_id || data.id;
}


/* Instagram: 1) crea il contenitore, 2) attende che sia pronto, 3) pubblica. */
function publishToInstagram(config, imageUrl, caption) {
  const container = metaPost('/' + config.igUserId + '/media', {
    image_url: imageUrl,
    caption: caption,
    access_token: config.pageToken
  });

  for (let i = 0; i < 10; i++) {
    const status = metaGet('/' + container.id, {
      fields: 'status_code',
      access_token: config.pageToken
    }).status_code;

    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new Error('Instagram non ha accettato la foto (stato ' + status + ').');
    }
    Utilities.sleep(3000);
  }

  const published = metaPost('/' + config.igUserId + '/media_publish', {
    creation_id: container.id,
    access_token: config.pageToken
  });
  return published.id;
}
