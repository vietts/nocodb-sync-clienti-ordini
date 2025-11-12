# NocoDB Link Records API - 3 Strategie Scoperte

Ricerca completa degli endpoint per collegare ordini a clienti in NocoDB.

## 📊 Riepilogo Trovamenti

Sono stati identificati **3 approcci diversi** per collegare record in NocoDB:

| Strategia | Versione | Status | Difficoltà |
|-----------|----------|--------|-----------|
| **Estrategia 1: API v3 Unified CRUD** | 0.264.0+ | ✅ Ufficiale | 🟢 Facile |
| **Strategia 2: Endpoint `/links/`** | 0.200.0+ | ⚠️ Bug fixed | 🟡 Media |
| **Strategia 3: API v1 Relation** | Storico | ❌ Deprecato | 🔴 Difficile |

---

## ✅ **Strategia 1: API v3 Unified Linking in CRUD** (CONSIGLIATA)

**Release**: NocoDB 0.264.0+ (Luglio 2024)
**Status**: Ufficiale e supportato
**Documentazione**: Menzionato in release notes

### Come Funziona

Puoi aggiornare record con relazioni direttamente nel PATCH della richiesta:

```bash
PATCH /api/v2/tables/{tableId}/records/{recordId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "fieldId": [{id: orderId1}, {id: orderId2}]
}
```

### Vantaggi
✅ Ufficiale e supportato
✅ Documentato nei release notes
✅ Una sola richiesta
✅ Semplice da implementare

### Svantaggi
⚠️ Richiede versione 0.264.0+
⚠️ Non completamente documentato pubblicamente

### Implementazione Attuale
Lo script `src/index.js` usa già questo approccio! È il metodo che abbiamo scelto.

---

## ⚠️ **Strategia 2: Endpoint Dedicato `/links/`**

**Release**: NocoDB 0.200.0+
**Status**: Bug corretto in PR #7017
**Pattern**: `/api/v2/tables/{tableId}/links/{linkFieldId}/records/{recordId}`

### Come Funziona

Usa un endpoint dedicato per gestire i link:

```bash
# GET - Leggi i link
GET /api/v2/tables/{clientsTableId}/links/{relationFieldId}/records/{clientId}

# POST - Aggiungi link
POST /api/v2/tables/{clientsTableId}/links/{relationFieldId}/records/{clientId}
Content-Type: application/json

{
  "data": [{id: orderId1}, {id: orderId2}]
}

# DELETE - Rimuovi link
DELETE /api/v2/tables/{clientsTableId}/links/{relationFieldId}/records/{clientId}/{orderId}
```

### Vantaggi
✅ Endpoint dedicato (separation of concerns)
✅ Flessibilità (GET/POST/DELETE separati)
✅ Disponibile da v0.200.0

### Svantaggi
⚠️ Meno performante (richieste separate)
⚠️ Aveva bug, ora fixed ma meno documentato
⚠️ Più complesso da usare

### Bug Corretto
**Problema**: Quando ID era string, sistema lo trattava come column name
**Soluzione**: PR #7017 ha corretto il binding SQL
**Versione Fix**: 0.202.7+

---

## ❌ **Strategia 3: API v1 Relation (DEPRECATA)**

**Release**: NocoDB 0.96.4
**Status**: ❌ Deprecata (non usare su v0.264.0+)
**Pattern**: `/api/v1/db/data/v1/{database}/{table}/{rowId}/{relationType}/{columnName}/{refRowId}`

### Come Funziona

```bash
POST /api/v1/db/data/v1/postgres/Clients/clientId1/mm/Orders_1/orderId1
```

### Parametri
- `relationType`: `mm` per many-to-many, `oto` per one-to-one
- `columnName`: Nome del campo relazionale
- `refRowId`: ID del record da collegare

### ❌ Perché NON Usarla
- ❌ API v1 è deprecata
- ❌ Nomi database specifici non scalabili
- ❌ Sintassi scomoda
- ❌ Sostituita da API v2 e v3

---

## 🎯 Decisione: Quale Usare?

### Consiglio: **Strategia 1 - API v3 Unified CRUD**

**Motivi**:
1. ✅ È quello che il nostro script usa
2. ✅ Ufficialmente supportato in NocoDB 0.264.0+
3. ✅ Una sola richiesta per update
4. ✅ Pattern REST standard (PATCH record)
5. ✅ Futuro-proof (versione più recente)

### Se non funziona: Plan B

Se la **Strategia 1 fallisce** con 404 o errore:

1. **Primo Fallback**: Estrategia 2 (endpoint `/links/`)
   - Testare con `test-endpoint.js` che lo include
   - Payload: POST con `data: [{id: ...}]`

2. **Secondo Fallback**: Verificare versione NocoDB
   - Se < 0.264.0: Potrebbe richiedere Strategia 2
   - Se < 0.200.0: Potrebbe richiedere Strategia 3

---

## 🧪 Come Testare

Il file `test-endpoint.js` include test per **entrambe le strategie principali**:

```javascript
// Test Strategia 1: PATCH con field name
api.patch(`/tables/${tableId}/records/${clientId}`, {
  'Orders 1': [{id: orderId}]
})

// Test Strategia 2: POST al link endpoint
api.post(
  `/tables/${tableId}/links/${fieldId}/records/${clientId}`,
  {data: [{id: orderId}]}
)
```

---

## 📝 Payload Formats Riassunto

### Strategia 1 - PATCH Record (CONSIGLIATA)
```json
{
  "fieldId": [{id: "order1"}, {id: "order2"}]
}
```

### Strategia 2 - POST Link Endpoint
```json
{
  "data": [{id: "order1"}, {id: "order2"}]
}
```

### Strategia 3 - API v1 (DEPRECATA)
```
/api/v1/db/data/v1/{db}/{table}/{rowId}/mm/{fieldName}/{refId}
```

---

## 🔍 Versione NocoDB Attuale

Per sapere quale strategia funzionerà sulla tua istanza:

```bash
# Visualizza info di versione NocoDB
curl -H "Authorization: Bearer {token}" \
  https://app.nocodb.com/api/v2/meta/health
```

Output atteso:
```json
{
  "version": "0.264.0",
  "apiVersion": "3"
}
```

---

## 📚 Riferimenti

| Risorsa | Link |
|---------|------|
| Release v0.264.0 (API v3) | github.com/nocodb/nocodb/releases |
| Bug fix PR #7017 | github.com/nocodb/nocodb/pull/7017 |
| GitHub Issue #3923 | github.com/nocodb/nocodb/issues/3923 |
| GitHub Issue #6823 | github.com/nocodb/nocodb/issues/6823 |
| Script di esempio | src/index.js |
| Test script | test-endpoint.js |

---

## ✨ Prossimi Passi

1. **Eseguire il test**:
   ```bash
   npm install
   node test-endpoint.js
   ```

2. **Interpretare il risultato**:
   - Se uno dei test stampa `✅ SUCCESS`: quella è la strategia giusta
   - Se entrambi falliscono: controllare versione NocoDB

3. **Aggiornare src/index.js**:
   - Se Strategia 1 funziona: ✅ Già implementata
   - Se Strategia 2 funziona: Aggiornare il PATCH in POST al link endpoint
   - Se Strategia 3 serve: Implementare endpoint v1

4. **Committare i risultati**:
   ```bash
   git add -A
   git commit -m "Confirm working linking strategy"
   ```

---

**Data ricerca**: Novembre 2024
**Fonti**: GitHub NocoDB, release notes, issue tracker
**Conclusione**: Strategia 1 è il metodo moderno e consigliato
