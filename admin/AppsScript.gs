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
