# Portale Admin — Istruzioni di installazione

Il portale (`admin/index.html`) ha bisogno di un "motore" che possa
scrivere sul foglio Google e sul calendario. Questo motore è lo script
`admin/AppsScript.gs`, che però **non viene eseguito dal sito**: va
incollato ed eseguito dentro al tuo foglio Google. Sono passaggi da
fare una volta sola, circa 10 minuti.

## 1. Apri l'editor di Apps Script

1. Apri il foglio Google del roster.
2. Menu **Estensioni → Apps Script**.
3. Si apre un editor con un file `Code.gs` vuoto (o con del codice
   di esempio): cancella tutto il contenuto.
4. Apri il file `admin/AppsScript.gs` di questo repository, copia
   **tutto** il contenuto e incollalo nell'editor di Apps Script.
5. Salva (icona del dischetto, o Ctrl+S).

## 2. Imposta la password dell'admin

1. Nell'editor di Apps Script, icona a sinistra con l'ingranaggio
   **Impostazioni del progetto**.
2. Scorri fino a **Proprietà dello script** → **Aggiungi proprietà dello script**.
3. Nome proprietà: `ADMIN_PASSWORD`
   Valore: la password che vuoi usare per entrare nel portale
   (scegline una non banale: la useranno tutti gli admin della
   squadriglia per modificare i dati).
4. Salva.

Questa password **non va mai scritta nel codice** e non finisce mai
su GitHub: resta solo dentro al tuo foglio Google.

## 3. Token GitHub (serve per caricare foto, nastrini e screenshot)

Per far funzionare i pulsanti "carica immagine" (foto piloti, nastrini
medaglie, galleria), lo script deve poter scrivere sul repository
GitHub del sito.

1. Vai su GitHub → icona del tuo profilo → **Settings**.
2. In fondo al menu a sinistra: **Developer settings**.
3. **Personal access tokens → Fine-grained tokens → Generate new token**.
4. Dai un nome (es. "Portale Admin Flying Donkeys"), scegli una scadenza.
5. **Repository access** → "Only select repositories" → seleziona il
   repository `sito`.
6. **Permissions → Repository permissions → Contents** → imposta
   **Read and write**.
7. Genera il token e copialo (comincia con `github_pat_...`): GitHub lo
   mostra una sola volta.
8. Torna nell'editor di Apps Script → **Impostazioni del progetto →
   Proprietà dello script → Aggiungi proprietà dello script**.
9. Nome proprietà: `GITHUB_TOKEN`
   Valore: il token appena copiato.
10. Salva.

Anche questo token **non va mai scritto nel codice** e non finisce mai
su GitHub: resta solo nelle Proprietà dello script.

## 4. Pubblica lo script come "app web"

1. In alto a destra nell'editor di Apps Script: **Esegui la distribuzione → Nuova distribuzione**.
2. Tipo: **App web**.
3. "Esegui come": **Io (il tuo indirizzo email)**.
4. "Chi ha accesso": **Chiunque**.
   (Questo non rende pubblici i tuoi dati: senza la password
   corretta, salvata nel passaggio 2, lo script rifiuta ogni
   richiesta. "Chiunque" serve solo perché il browser di chi usa il
   portale deve poter raggiungere l'indirizzo dello script.)
5. Premi **Distribuisci**.
6. La prima volta Google chiederà di autorizzare lo script ad
   accedere al foglio e al calendario: segui la procedura e accetta
   (comparirà un avviso "App non verificata" perché è uno script
   personale, non pubblicato da Google — è normale, premi
   "Avanzate" poi "Vai a [nome progetto] (non sicuro)").
7. Copia l'**URL dell'app web** che compare (inizia con
   `https://script.google.com/macros/s/..../exec`): ti servirà al
   passo successivo.

## 5. Apri il portale e configuralo

1. Apri `admin/index.html` (una volta pubblicato sul sito, sarà
   all'indirizzo `https://www.flyingdonkeysvirtualsquadron.it/admin/`).
2. Inserisci la password impostata al passaggio 2.
3. Alla prima apertura ti chiederà l'URL dell'app web: incolla
   quello copiato al passaggio 4.7. Resta salvato in questo browser,
   non dovrai reinserirlo ogni volta (ma su un altro computer/browser
   sì, una volta sola).

## 6. Da ricordare

- **Se modifichi di nuovo `AppsScript.gs`** (in futuro, con il mio
  aiuto o da solo), dopo averlo incollato nell'editor dovrai rifare
  il passaggio 4 come **"Gestisci distribuzioni" → modifica
  (icona matita) → Nuova versione → Distribuisci**, altrimenti le
  modifiche non hanno effetto (l'URL resta lo stesso, non serve
  riconfigurare il portale).
- Il portale non è linkato da nessuna pagina del sito e non è
  indicizzato da Google (`<meta name="robots" content="noindex">`
  e blocco in `robots.txt`), ma l'URL non è segreto in senso
  stretto: chi lo scopre può comunque arrivare alla schermata di
  login. La password è l'unica vera protezione — tienila riservata
  agli admin.
- Ogni admin che userà il portale deve solo conoscere: l'indirizzo
  `admin/index.html`, la password, e (la prima volta sul proprio
  browser) l'URL dell'app web del passaggio 4.7.
- **Caricamento immagini (foto, nastrini, galleria)**: funziona solo
  se hai completato il passaggio 3 (token GitHub). Senza quel token
  i pulsanti "carica immagine" daranno un errore, ma puoi comunque
  continuare a scrivere un percorso/URL manualmente negli stessi campi.
- Dopo aver caricato un'immagine, il sito mostra la nuova versione
  dopo il deploy automatico di Vercel (di solito 1-2 minuti).
