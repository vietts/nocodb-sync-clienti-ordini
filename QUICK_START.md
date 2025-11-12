# Quick Start - NocoDB Sync Clienti ↔ Ordini

⚡ Guida veloce per far partire lo script in 5 minuti

## 1️⃣ Clona e Setup (1 min)

```bash
cd /path/to/your/project
git clone https://github.com/vietts/nocodb-sync-clienti-ordini.git
cd nocodb-sync-clienti-ordini
npm install
```

## 2️⃣ Configura .env (2 min)

```bash
cp .env.example .env
# Edita .env e aggiungi:
# - NOCODB_API_TOKEN (dal tuo account NocoDB)
# - NOCODB_CLIENTS_TABLE_ID
# - NOCODB_ORDERS_TABLE_ID
# - NOCODB_RELATION_FIELD_ID
```

**Come trovare gli ID velocemente:**

| Valore | Come trovarla |
|--------|---------------|
| Token | Account Settings → Tokens → New API Token |
| Table IDs | URL di NocoDB: `#/.../{tableId}/...` |
| Field ID | Edit campo → vedi in fondo al form |

## 3️⃣ Test (1 min)

```bash
# Verifica che la configurazione sia corretta
node test-endpoint.js
```

Se vedi `✅ SUCCESS` per almeno uno dei test, sei pronto!

## 4️⃣ Run! (1 min)

```bash
npm start
```

Aspetta che legga tutti i clienti e ordini, poi collega automaticamente!

## ✨ Fatto!

Vai su NocoDB e verifica che la colonna "Orders 1" nella tabella Clienti sia stata popolata con gli ordini.

---

## 🆘 Quick Troubleshooting

| Problema | Soluzione |
|----------|-----------|
| ❌ 401 Unauthorized | Token sbagliato o scaduto |
| ❌ 404 Not Found | Verifica `NOCODB_RELATION_FIELD_ID` |
| ❌ Nessun cliente aggiornato | Controlla che le email corrispondano tra tabelle |
| ⚠️ 429 Too Many Requests | Aumenta delay in src/index.js |

## 📚 Documentazione Completa

Per istruzioni dettagliate vedi:
- `IMPLEMENTATION.md` - Guida completa con diagnostica
- `README.md` - Documentazione tecnica
- `src/index.js` - Codice con commenti

---

**Tempo totale**: ~5 minuti ⏱️
