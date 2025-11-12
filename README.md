# NocoDB Sync: Clienti ↔ Ordini

Sincronizza automaticamente e collega ordini a clienti in NocoDB tramite email matching.

## 🎯 Funzionalità

✅ **Lettura paginata** di clienti e ordini (supporta dataset grandi)
✅ **Matching per email** tra tabelle
✅ **Linking automatico** via NocoDB API
✅ **Retry con backoff esponenziale** per errori temporanei
✅ **Rate limiting intelligente** per evitare throttling
✅ **Logging strutturato** (JSON + console)
✅ **Zero chiavi API pubbliche** (usa .env)

## 📋 Prerequisiti

- **Node.js 18+**
- **Accesso a NocoDB** con API token valido
- **Dati sensibili** in `.env` (vedi `.env.example`)

## 🚀 Setup

### 1. Clona il repository
```bash
git clone https://github.com/vietts/nocodb-sync-clienti-ordini.git
cd nocodb-sync-clienti-ordini
```

### 2. Installa dipendenze
```bash
npm install
```

### 3. Configura credenziali
```bash
cp .env.example .env
# Edita .env con le tue credenziali NocoDB
```

⚠️ **IMPORTANTE**: Il file `.env` NON viene mai committato (vedi `.gitignore`)

### 4. Crea le cartelle
```bash
mkdir -p logs
```

## 💻 Utilizzo

### Esegui il sync
```bash
npm start
```

### Modalità sviluppo (verbose logging)
```bash
npm run dev
```

## 📊 Output Atteso

```
🚀 Avvio sincronizzazione...

📖 Caricamento clienti (paginazione)...
  📄 Pagina 1: 100 record
  📄 Pagina 2: 100 record
✅ Caricati 4900 clienti

📖 Caricamento ordini...
  📄 Pagina 1: 100 record
  📄 Pagina 2: 100 record
✅ Caricati 1329 ordini

🔍 Raggruppamento per email...
✅ Raggruppati: 476 email uniche

🔗 Linking ordini a clienti...
  ✅ cliente@example.com → 3 ordini collegati
  ✅ cliente2@example.com → 1 ordine collegato
  ...

📊 RIEPILOGO
─────────────────────────
Ordini totali:        1329
Email uniche ordini:  476
Clienti elaborati:    4900
Clienti aggiornati:   XXX
Clienti senza ordini: XXX
Errori:               XXX

✨ Sincronizzazione completata!
```

## 🔧 Configurazione

Vedi `.env.example` per tutte le variabili disponibili:

| Variabile | Descrizione |
|-----------|-------------|
| `NOCODB_BASE_URL` | URL base di NocoDB |
| `NOCODB_API_TOKEN` | Token API (🔐 mai commitare!) |
| `NOCODB_CLIENTS_TABLE_ID` | ID tabella clienti |
| `NOCODB_ORDERS_TABLE_ID` | ID tabella ordini |
| `LOG_LEVEL` | INFO, DEBUG, WARNING, ERROR |

## 🐛 Troubleshooting

### "401 Unauthorized"
- Verifica che `NOCODB_API_TOKEN` sia corretto
- Assicurati che il token non sia scaduto

### "404 Not Found"
- Verifica gli ID delle tabelle
- Verifica i nomi dei campi in NocoDB

### "429 Too Many Requests"
- NocoDB sta limitando le richieste
- Lo script ha retry automatico, riprova dopo qualche secondo

## 📝 Note Tecniche

- Usa **Bearer token** per autenticazione
- **Paginazione**: 100 record per pagina (configurabile)
- **Delay**: 1 secondo tra richieste per evitare throttling
- **Retry**: Fino a 5 tentativi con backoff esponenziale
- **Timeout**: 60 secondi per richiesta

## 📄 Licenza

MIT

## 🤝 Contributi

Per segnalare bug o richiedere feature, apri un issue su GitHub.

---

**Creato con ❤️ per automatizzare la sincronizzazione dati**
