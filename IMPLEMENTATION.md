# NocoDB Sync - Implementation Guide

Guida completa per implementare e testare la sincronizzazione ordini-clienti.

## 📊 Cosa Fa Lo Script

Lo script automatizza il collegamento di ordini a clienti in NocoDB:

1. **Legge tutti i clienti** dalla tabella Clienti (con paginazione)
2. **Legge tutti gli ordini** dalla tabella Ordini (con paginazione)
3. **Raggruppa gli ordini per email** per identificare clienti corrispondenti
4. **Collega gli ordini ai clienti** tramite il campo relazionale "Orders 1"
5. **Fornisce un riepilogo** con statistiche di successo/errore

## 🔧 Configurazione

### Step 1: Copia il file .env

```bash
cp .env.example .env
```

### Step 2: Trova gli ID delle tabelle

Nell'URL di NocoDB (es: `https://app.nocodb.com/#/w0s14db0/pw0wt0aa3ck1fmm`):
- Appendi `?page=overview` all'URL
- Apri DevTools (F12) → Network
- Fai click su una tabella
- Cerca la richiesta API che contiene il table ID
- Copia il valore da `tableId` nella risposta

**Oppure** nel codice HTML della pagina tabella:
```javascript
// In browser console
document.querySelector('[data-testid="grid"]')?.__vue__?.ctx?.attrs?.meta?.id
```

### Step 3: Trova gli ID dei campi

Nel NocoDB UI:
1. Vai nella tabella Clienti
2. Click destro sulla colonna "Orders 1"
3. Seleziona "Edit field"
4. Scorri in fondo - vedrai "Field ID"
5. Copia il valore in `NOCODB_RELATION_FIELD_ID`

**Oppure** tramite API:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://app.nocodb.com/api/v2/tables/{tableId}/fields"
```

### Step 4: Configura il token

1. In NocoDB, vai su **Account Settings** (click su avatar)
2. Seleziona **Tokens** o **API Tokens**
3. Crea un nuovo token
4. Copia il valore in `NOCODB_API_TOKEN` nel file `.env`

### Step 5: Aggiorna .env

Modifica il file `.env` con i tuoi valori:

```env
NOCODB_BASE_URL=https://app.nocodb.com
NOCODB_API_TOKEN=your_actual_token_here
NOCODB_CLIENTS_TABLE_ID=mp7uxob9zzcv27o
NOCODB_ORDERS_TABLE_ID=mrdkw8gei42htk4
NOCODB_EMAIL_FIELD_CLIENTS=Email
NOCODB_EMAIL_FIELD_ORDERS=Email (Billing)
NOCODB_RELATION_FIELD_NAME=Orders 1
NOCODB_RELATION_FIELD_ID=c2sinmqx1tdh2yz
LOG_LEVEL=INFO
```

## 🧪 Test della Configurazione

### Test 1: Verifica connessione e lettura dati

```bash
node test-endpoint.js
```

Questo script testa:
- Connessione all'API
- Lettura della prima riga clienti
- Lettura delle prime 3 righe ordini
- 4 diversi approcci di aggiornamento (per trovare quello che funziona)

**Output atteso**:
```
🧪 Testing NocoDB Relation Update Endpoints

1️⃣  Fetching first client...
   Found client: abc123

2️⃣  Fetching first orders...
   Found 3 orders: order1, order2, order3

3️⃣  Test 1 - PATCH with field name (Orders 1)
   ❌ FAILED: 404 Not Found
   ...
```

### Test 2: Run completo (dry-run, senza modifiche)

Attualmente il script non ha modalità dry-run. Per testare senza modificare dati:

1. Crea una copia di test delle tabelle
2. Aggiorna `.env` per puntare alle tabelle di test
3. Esegui lo script

```bash
npm start
```

## 📋 Checklist Pre-Lancio

Prima di eseguire lo script su dati di produzione:

- [ ] Token API è corretto e non scaduto
- [ ] IDs delle tabelle sono verificati (`NOCODB_CLIENTS_TABLE_ID`, `NOCODB_ORDERS_TABLE_ID`)
- [ ] ID del campo relazionale è corretto (`NOCODB_RELATION_FIELD_ID`)
- [ ] I nomi dei campi email sono corretti
- [ ] Il campo "Orders 1" è di tipo "Link to another record"
- [ ] Le email nella tabella Clienti e Ordini sono pulite (trim, lowercase)
- [ ] Hai un backup dei dati
- [ ] Hai testato con `test-endpoint.js`
- [ ] Il `npm start` carica dati senza errori (almeno nella fase di lettura)

## 🚀 Esecuzione

### Caricamento in produzione

```bash
# Installa dipendenze
npm install

# Configura .env con i tuoi valori (vedi step sopra)
cp .env.example .env
# ... edita .env ...

# Esegui il sync
npm start
```

### Output atteso

```
🚀 Avvio sincronizzazione clienti ↔ ordini

==================================================

📖 Step 1: Caricamento clienti...

  📖 Caricamento pagina iniziale...
  📄 Pagina 1: 100 record totali
  📄 Pagina 2: 200 record totali
✅ Caricati 4900 clienti

📖 Step 2: Caricamento ordini...

  📖 Caricamento pagina iniziale...
  📄 Pagina 1: 100 record totali
  📄 Pagina 2: 1329 record totali
✅ Caricati 1329 ordini

🔍 Step 3: Raggruppamento per email...

✅ Raggruppati 1329 ordini per email
   • 476 email uniche
   • 0 ordini senza email

🔗 Step 4: Collegamento ordini a clienti...

  ✅ 1 clienti aggiornati (0%) - cliente@example.com → 3 ordini
  ✅ 10 clienti aggiornati (1%) - cliente2@example.com → 1 ordine
  ...
  ✅ 476 clienti aggiornati (9%) - clienten@example.com → 2 ordini

==================================================
📊 RIEPILOGO

📦 Ordini totali:              1329
📧 Email uniche (ordini):      476
👥 Clienti elaborati:          4900
✅ Clienti aggiornati:         476
⏭️  Clienti senza ordini:     4424
⚠️  Errori:                    0

==================================================

✨ Sincronizzazione completata con successo!
```

## 🔧 Diagnostica Errori

### Errore: "Cannot PATCH"

**Causa**: Uso del nome del campo invece dell'ID
**Soluzione**:
1. Verifica `NOCODB_RELATION_FIELD_ID` nel .env
2. Usa `test-endpoint.js` per trovare il formato corretto
3. L'endpoint giusto è: `PATCH /api/v2/tables/{tableId}/records/{recordId}`

### Errore: "Field not found"

**Causa**: ID del campo errato
**Soluzione**:
1. Vai in NocoDB → Clienti → Edit field su "Orders 1"
2. Copia l'ID esatto dal form
3. Aggiorna `.env` con il valore corretto

### Errore: "401 Unauthorized"

**Causa**: Token errato o scaduto
**Soluzione**:
1. Genera un nuovo token in NocoDB
2. Verifica che non abbia spazi extra
3. Assicurati che il token sia un String, non JSON

### Errore: "429 Too Many Requests"

**Causa**: Rate limiting di NocoDB
**Soluzione**:
1. Aumenta il delay tra richieste in `src/index.js`:
   ```javascript
   await new Promise((resolve) => setTimeout(resolve, 1000)); // aumenta da 100 a 1000
   ```
2. Lo script carica dati con 1s di delay già configurato

### Nessun cliente aggiornato

**Causa**: Nessun matching di email
**Soluzione**:
1. Verifica che le email siano uguali in entrambe le tabelle
2. Controlla il raggruppamento: i log mostrano "email uniche" negli ordini
3. Usas `node test-endpoint.js` e guarda i dati effettivi

## 📝 Note Importanti

### Sicurezza
- **MAI** committare il file `.env` su GitHub
- `.gitignore` previene commit accidentali
- Use una `.env.example` senza credenziali per il template

### Performance
- Paginazione: 100 record per pagina (configurabile in `src/index.js`)
- Rate limiting: 1 secondo tra pagine, 100ms tra aggiornamenti
- Per 5000 clienti: ~50 pagine × 1s = ~50s di caricamento
- Per 1000 clienti da aggiornare: ~100s con rate limiting

### Affidabilità
- Il matching è **case-insensitive** e **trimmed**
- Se un ordine non ha email, è saltato
- Se un cliente non ha email, è saltato
- Errori di aggiornamento non fermano il processo
- I primi 5 errori sono loggati per diagnostica

## 🔄 Prossimi Passi

1. Configura `.env` con i tuoi dati
2. Esegui `node test-endpoint.js` per verificare la connessione
3. Esegui `npm start` per il sync completo
4. Verifica i risultati nella tabella Clienti di NocoDB
5. Controlla che le relazioni "Orders 1" siano state populate

## 📚 Riferimenti

- [NocoDB API Documentation](https://nocodb.com/docs/product-docs/developer-resources/rest-apis)
- [Link Records by Field](https://nocodb.com/docs/scripts/examples/link-records-by-field)
- [GitHub Issues - Linking Records](https://github.com/nocodb/nocodb/discussions/8956)

---

Per supporto o problemi, controlla il file README.md nella sezione Troubleshooting.
