#!/usr/bin/env node

/**
 * Test different NocoDB API endpoints for updating relational fields
 */

import 'dotenv/config';
import axios from 'axios';

const config = {
  baseUrl: process.env.NOCODB_BASE_URL || 'https://app.nocodb.com',
  token: process.env.NOCODB_API_TOKEN,
  clientsTableId: process.env.NOCODB_CLIENTS_TABLE_ID,
  ordersTableId: process.env.NOCODB_ORDERS_TABLE_ID,
  relationFieldName: process.env.NOCODB_RELATION_FIELD_NAME || 'Orders 1',
  relationFieldId: process.env.NOCODB_RELATION_FIELD_ID,
};

const api = axios.create({
  baseURL: `${config.baseUrl}/api/v2`,
  headers: {
    'Authorization': `Bearer ${config.token}`,
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

async function testEndpoints() {
  console.log('\n🧪 Testing NocoDB Relation Update Endpoints\n');

  try {
    // Get first client
    console.log('1️⃣  Fetching first client...');
    const clientRes = await api.get(`/tables/${config.clientsTableId}/records`, {
      params: { limit: 1 }
    });

    const client = clientRes.data.list[0];
    if (!client) {
      console.error('❌ No clients found');
      return;
    }

    console.log(`   Found client: ${client.id}\n`);

    // Get first few orders
    console.log('2️⃣  Fetching first orders...');
    const ordersRes = await api.get(`/tables/${config.ordersTableId}/records`, {
      params: { limit: 3 }
    });

    const orders = ordersRes.data.list || [];
    const orderIds = orders.map(o => o.id);
    console.log(`   Found ${orderIds.length} orders: ${orderIds.join(', ')}\n`);

    // Test Approach 1: PATCH with field name
    console.log('3️⃣  Test 1 - PATCH with field name (Orders 1)');
    try {
      const res1 = await api.patch(
        `/tables/${config.clientsTableId}/records/${client.id}`,
        {
          ['Orders 1']: orderIds.map(id => ({ id }))
        }
      );
      console.log('   ✅ SUCCESS');
      console.log('   Response:', JSON.stringify(res1.data, null, 2));
    } catch (err) {
      console.log(`   ❌ FAILED: ${err.response?.status} ${err.response?.statusText}`);
      console.log(`      Error: ${err.response?.data?.message || err.message}\n`);
    }

    await new Promise(r => setTimeout(r, 500));

    // Test Approach 2: PATCH with field ID
    console.log('4️⃣  Test 2 - PATCH with field ID');
    try {
      const res2 = await api.patch(
        `/tables/${config.clientsTableId}/records/${client.id}`,
        {
          [config.relationFieldId]: orderIds.map(id => ({ id }))
        }
      );
      console.log('   ✅ SUCCESS');
      console.log('   Response:', JSON.stringify(res2.data, null, 2));
    } catch (err) {
      console.log(`   ❌ FAILED: ${err.response?.status} ${err.response?.statusText}`);
      console.log(`      Error: ${err.response?.data?.message || err.message}\n`);
    }

    await new Promise(r => setTimeout(r, 500));

    // Test Approach 3: POST to /links endpoint
    console.log('5️⃣  Test 3 - POST to /links endpoint');
    try {
      const res3 = await api.post(
        `/tables/${config.clientsTableId}/links/${config.relationFieldId}/records/${client.id}`,
        {
          data: orderIds.map(id => ({ id }))
        }
      );
      console.log('   ✅ SUCCESS');
      console.log('   Response:', JSON.stringify(res3.data, null, 2));
    } catch (err) {
      console.log(`   ❌ FAILED: ${err.response?.status} ${err.response?.statusText}`);
      console.log(`      Error: ${err.response?.data?.message || err.message}\n`);
    }

    await new Promise(r => setTimeout(r, 500));

    // Test Approach 4: Check current state
    console.log('6️⃣  Check current record state');
    try {
      const res4 = await api.get(`/tables/${config.clientsTableId}/records/${client.id}`);
      console.log('   Record data:');
      console.log('   ', JSON.stringify(res4.data, null, 2));
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEndpoints();
