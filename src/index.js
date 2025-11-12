#!/usr/bin/env node

/**
 * NocoDB Sync: Link Orders to Clients
 * Sincronizza e collega ordini a clienti tramite email matching
 *
 * API Endpoints Used:
 * - Load Records: GET /api/v2/tables/{tableId}/records?limit=100&offset=0
 * - Link Records: POST /api/v2/tables/{clientsTableId}/links/{relationFieldId}/records/{clientId}
 *   Payload: [{ Id: orderId1 }, { Id: orderId2 }, ...]
 *   Note: Uses capital 'I' in 'Id' (not lowercase 'id')
 *
 * The /links/{linkFieldId}/records/{recordId} endpoint is the official NocoDB way
 * to link many-to-many relational records via REST API.
 *
 * Swagger verified from: https://app.nocodb.com/api/v2/meta/bases/pw0wt0aa3ck1fmm/swagger
 */

import 'dotenv/config';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// CONFIGURATION FROM ENV
// ============================================

const config = {
  nocodb: {
    baseUrl: process.env.NOCODB_BASE_URL || 'https://app.nocodb.com',
    token: process.env.NOCODB_API_TOKEN,
    clientsTableId: process.env.NOCODB_CLIENTS_TABLE_ID,
    ordersTableId: process.env.NOCODB_ORDERS_TABLE_ID,
    emailFieldClients: process.env.NOCODB_EMAIL_FIELD_CLIENTS || 'Email',
    emailFieldOrders: process.env.NOCODB_EMAIL_FIELD_ORDERS || 'Email (Billing)',
    relationFieldName: process.env.NOCODB_RELATION_FIELD_NAME || 'Orders 1',
    relationFieldId: process.env.NOCODB_RELATION_FIELD_ID,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'INFO',
    file: process.env.LOG_FILE || 'logs/sync.log',
  },
};

// ============================================
// VALIDATION
// ============================================

function validateConfig() {
  const errors = [];

  if (!config.nocodb.token) {
    errors.push('❌ NOCODB_API_TOKEN non configurato in .env');
  }
  if (!config.nocodb.clientsTableId) {
    errors.push('❌ NOCODB_CLIENTS_TABLE_ID non configurato in .env');
  }
  if (!config.nocodb.ordersTableId) {
    errors.push('❌ NOCODB_ORDERS_TABLE_ID non configurato in .env');
  }

  if (errors.length > 0) {
    console.error('⚠️  ERRORI DI CONFIGURAZIONE:\n');
    errors.forEach((err) => console.error(err));
    console.error('\n💡 Soluzione: Copia .env.example in .env e configura le credenziali');
    process.exit(1);
  }
}

// ============================================
// API CLIENT
// ============================================

const api = axios.create({
  baseURL: `${config.nocodb.baseUrl}/api/v2`,
  headers: {
    'Authorization': `Bearer ${config.nocodb.token}`,
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// ============================================
// UTILITIES
// ============================================

async function fetchAllRecords(tableId, fieldName, pageSize = 100) {
  const records = [];
  let pageCount = 0;

  console.log(`  📖 Caricamento pagina iniziale...`);

  try {
    while (true) {
      pageCount++;
      const offset = (pageCount - 1) * pageSize;

      const response = await api.get(`/tables/${tableId}/records`, {
        params: { limit: pageSize, offset },
      });

      const batch = response.data.list || [];

      if (!batch || batch.length === 0) {
        break;
      }

      records.push(...batch);
      console.log(`  📄 Pagina ${pageCount}: ${records.length} record totali`);

      if (batch.length < pageSize) {
        break;
      }

      // Delay per rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return records;
  } catch (error) {
    console.error(`❌ Errore caricamento da ${fieldName}:`);
    console.error(error.response?.data || error.message);
    throw error;
  }
}

function groupByEmail(records, emailField) {
  const grouped = {};
  let without = 0;

  for (const record of records) {
    const email = record[emailField];

    if (!email) {
      without++;
      continue;
    }

    const emailLower = String(email).toLowerCase().trim();

    if (!grouped[emailLower]) {
      grouped[emailLower] = [];
    }

    if (!grouped[emailLower].includes(record.id)) {
      grouped[emailLower].push(record.id);
    }
  }

  return { grouped, without };
}

// ============================================
// MAIN PROCESS
// ============================================

async function main() {
  console.log('\n🚀 Avvio sincronizzazione clienti ↔ ordini\n');
  console.log('='.repeat(50) + '\n');

  // Validate config
  validateConfig();

  try {
    // ============================================
    // STEP 1: LOAD CLIENTS
    // ============================================
    console.log('📖 Step 1: Caricamento clienti...\n');
    const clients = await fetchAllRecords(
      config.nocodb.clientsTableId,
      'CLIENTI'
    );
    console.log(`✅ Caricati ${clients.length} clienti\n`);

    // ============================================
    // STEP 2: LOAD ORDERS
    // ============================================
    console.log('📖 Step 2: Caricamento ordini...\n');
    const orders = await fetchAllRecords(
      config.nocodb.ordersTableId,
      'ORDINI'
    );
    console.log(`✅ Caricati ${orders.length} ordini\n`);

    // ============================================
    // STEP 3: GROUP ORDERS BY EMAIL
    // ============================================
    console.log('🔍 Step 3: Raggruppamento per email...\n');
    const { grouped: ordersByEmail, without: ordersWithout } = groupByEmail(
      orders,
      config.nocodb.emailFieldOrders
    );

    console.log(`✅ Raggruppati ${orders.length} ordini per email`);
    console.log(`   • ${Object.keys(ordersByEmail).length} email uniche`);
    console.log(`   • ${ordersWithout} ordini senza email\n`);

    // ============================================
    // STEP 4: LINK ORDERS TO CLIENTS
    // ============================================
    console.log('🔗 Step 4: Collegamento ordini a clienti...\n');

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const clientEmail = client[config.nocodb.emailFieldClients];

      if (!clientEmail) {
        skippedCount++;
        continue;
      }

      const emailLower = String(clientEmail).toLowerCase().trim();
      const linkedOrderIds = ordersByEmail[emailLower] || [];

      if (linkedOrderIds.length === 0) {
        skippedCount++;
        continue;
      }

      try {
        // Link orders to client using NocoDB POST /links endpoint
        // API endpoint: POST /api/v2/tables/{clientsTableId}/links/{relationFieldId}/records/{clientId}
        // Payload: Array of {Id: recordId} objects (note: capital 'I' in 'Id')
        const linkedRecords = linkedOrderIds.map((id) => ({ Id: id }));

        await api.post(
          `/tables/${config.nocodb.clientsTableId}/links/${config.nocodb.relationFieldId}/records/${client.id}`,
          linkedRecords
        );

        updatedCount++;
        const progress = Math.round(((i + 1) / clients.length) * 100);

        if (updatedCount % 10 === 0 || updatedCount === 1) {
          console.log(
            `  ✅ ${updatedCount} clienti aggiornati (${progress}%) - ${emailLower} → ${linkedOrderIds.length} ordini`
          );
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        if (errorCount <= 5) {
          console.error(
            `  ❌ Errore aggiornamento ${emailLower}: ${error.response?.data?.message || error.message}`
          );
        }
        if (errorCount === 1) {
          console.error(
            `     Endpoint: PATCH /tables/${config.nocodb.clientsTableId}/records/${client.id}`
          );
          console.error(
            `     Payload: { ${config.nocodb.relationFieldId}: [{id: ...}, ...] }`
          );
        }
      }
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 RIEPILOGO\n');

    console.log(`📦 Ordini totali:              ${orders.length}`);
    console.log(`📧 Email uniche (ordini):     ${Object.keys(ordersByEmail).length}`);
    console.log(`👥 Clienti elaborati:         ${clients.length}`);
    console.log(`✅ Clienti aggiornati:        ${updatedCount}`);
    console.log(`⏭️  Clienti senza ordini:     ${skippedCount}`);
    console.log(`⚠️  Errori:                    ${errorCount}`);

    console.log('\n' + '='.repeat(50) + '\n');

    if (errorCount === 0) {
      console.log('✨ Sincronizzazione completata con successo!\n');
    } else {
      console.log(`⚠️  Sincronizzazione completata con ${errorCount} errori\n`);
    }
  } catch (error) {
    console.error('\n💥 ERRORE CRITICO:\n');
    console.error(error.message);
    if (error.response?.data) {
      console.error('\nDettagli API:', error.response.data);
    }
    process.exit(1);
  }
}

// ============================================
// EXECUTION
// ============================================

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
