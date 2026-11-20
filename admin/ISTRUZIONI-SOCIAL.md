# Pubblicazione automatica su Facebook e Instagram

Lo script `admin/AppsScript.gs` (sezione **SOCIAL**) pubblica a rotazione
le foto della galleria del sito (`images/gallery`) sulla Pagina Facebook e
sull'account Instagram professionale: **lunedì, mercoledì e venerdì tra le
18 e le 19**.

- Prima pubblica le foto mai uscite (1, 2, 3...), poi ricomincia dalla
  pubblicata meno di recente. Le foto nuove caricate in galleria entrano
  in coda da sole.
- Instagram accetta solo JPEG: le foto `.webp` vengono convertite dal sito
  stesso (`/api/social-image`), che le ritaglia anche se troppo larghe.
- Ogni pubblicazione viene registrata nel foglio **SocialLog**. Se qualcosa
  va storto, Google ti manda una mail di errore.

Sono passaggi da fare una volta sola, circa 20 minuti.

## 1. Collega Instagram alla Pagina Facebook

L'API di Meta pubblica su Instagram solo se l'account professionale è
collegato a una Pagina Facebook.

1. Apri **Meta Business Suite** (business.facebook.com) con l'account che
   amministra la Pagina.
2. **Impostazioni → Account → Account Instagram → Collega account**
   e accedi a Instagram.
3. In alternativa, dall'app Instagram: **Profilo → Modifica profilo →
   Pagina → Collega una Pagina Facebook**.

## 2. Crea l'app Meta

1. Vai su **developers.facebook.com** → **Le mie app → Crea app**.
2. Caso d'uso: **Altro** → tipo **Business**.
3. Nome: es. "Flying Donkeys Social". Crea.
4. Non serve la revisione dell'app né metterla "in produzione": restando
   in modalità sviluppo funziona per gli amministratori dell'app, cioè tu.

## 3. Ottieni il token della Pagina (permanente)

1. Apri **Strumento di esplorazione API Graph**
   (developers.facebook.com/tools/explorer).
2. A destra: **App Meta** = la tua app; **Utente o Pagina** = Token utente.
3. In **Autorizzazioni** aggiungi:
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish`, `business_management`.
4. **Generate Access Token** e accetta, selezionando la Pagina e
   l'account Instagram.
5. Copia il token, apri il **Debugger token di accesso**
   (developers.facebook.com/tools/debug/accesstoken), incollalo,
   **Debug**, poi in fondo **Estendi token di accesso**. Copia il token
   esteso (dura 60 giorni).
6. Torna nell'esploratore, incolla il token esteso nel campo in alto ed
   esegui la richiesta GET:

   ```
   me/accounts
   ```

   Nella risposta trovi la tua Pagina con `id` (→ **META_PAGE_ID**) e
   `access_token` (→ **META_PAGE_TOKEN**). Questo token della Pagina,
   ottenuto da un token esteso, **non scade**.
7. Sempre nell'esploratore, esegui (sostituendo l'ID della Pagina):

   ```
   ID_PAGINA?fields=instagram_business_account
   ```

   Il valore `instagram_business_account.id` è **META_IG_USER_ID**.

Il token della Pagina smette di funzionare solo se cambi la password di
Facebook, togli i permessi all'app o non sei più amministratore della
Pagina: in quel caso ripeti questo passaggio.

## 4. Salva i dati nelle Proprietà dello script

Editor di Apps Script → **Impostazioni del progetto → Proprietà dello
script → Aggiungi proprietà dello script**:

| Proprietà         | Valore                              |
|-------------------|-------------------------------------|
| `META_PAGE_ID`    | ID della Pagina (punto 3.6)         |
| `META_PAGE_TOKEN` | token della Pagina (punto 3.6)      |
| `META_IG_USER_ID` | ID Instagram (punto 3.7)            |
| `SOCIAL_CAPTION`  | *(facoltativa)* didascalia standard |

Come la password admin e il token GitHub, **questi valori non vanno mai
scritti nel codice** e non finiscono su GitHub.

## 5. Aggiorna lo script e avvia la programmazione

1. Copia di nuovo **tutto** `admin/AppsScript.gs` nell'editor e salva.
2. Controlla il fuso orario: **Impostazioni del progetto → Fuso orario**
   = `(GMT+01:00) Rome`.
3. Nel menu a tendina in alto scegli **previewNextSocialPost** → **Esegui**.
   Google chiederà di autorizzare lo script (accesso a servizi esterni e
   trigger): accetta. Nel **Log di esecuzione** vedi quale foto e quale
   didascalia userebbe, senza pubblicare nulla.
4. Per una prova vera: scegli **publishNextSocialPost** → **Esegui**.
   Controlla la Pagina, Instagram e il foglio **SocialLog**.
5. Scegli **setupSocialSchedule** → **Esegui**. Da qui in poi pubblica da
   solo. Non serve rifare la distribuzione dell'app web.

Per fermare tutto: esegui **stopSocialSchedule**.

## Personalizzare

- **Didascalia per una singola foto**: crea un foglio chiamato
  **SocialDidascalie** con il nome del file in colonna A (es. `3.webp`) e
  la didascalia in colonna B. Le foto senza riga usano quella standard.
- **Didascalia standard**: proprietà `SOCIAL_CAPTION`, oppure modifica
  `SOCIAL_DEFAULT_CAPTION` nello script.
- **Giorni e ora**: modifica `SOCIAL_SCHEDULE` nello script (giorni in
  inglese: `MONDAY` ... `SUNDAY`), salva e riesegui **setupSocialSchedule**.
- **Rifare una foto subito**: cancella la sua riga nel foglio SocialLog.
