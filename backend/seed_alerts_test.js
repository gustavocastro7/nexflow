const sequelize = require('./src/config/database');
const Invoice = require('./src/models/Invoice');
const RawInvoice = require('./src/models/RawInvoice');
const Workspace = require('./src/models/Workspace');

async function seedAlerts() {
  try {
    console.log('🚀 Starting data insertion for alerts test...');
    
    // 1. Locate Teleen workspace
    const ws = await Workspace.findOne({ where: { schema_name: 'teleen_consultoria' } });
    if (!ws) {
      console.error('❌ Teleen workspace not found. Run the main seeder first.');
      return;
    }

    // 2. Create a test "master invoice"
    const [rawInvoice] = await RawInvoice.findOrCreate({
      where: { workspace_id: ws.id, hash: 'test_alerts_v1' },
      defaults: {
        operator: 'claro',
        processing_status: 'processed',
        content: { info: 'Audit Test' },
        due_date: '2025-05-10'
      }
    });

    const today = new Date().toISOString().split('T')[0];

    // 3. Insert items that trigger audit
    const testItems = [
      {
        description: 'DATA SURPLUS 5GB',
        charged_value: 85.00,
        section: 'DATA',
        sub_section: 'SURPLUS'
      },
      {
        description: 'OUT OF PACKAGE - INTERNATIONAL ROAMING',
        charged_value: 120.50,
        section: 'DATA',
        sub_section: 'INTERNATIONAL'
      },
      {
        description: 'LATE FEE - REF 03/2025',
        charged_value: 12.45,
        section: 'CHARGES',
        sub_section: 'FINES'
      },
      {
        description: 'NON-CONTRACTED SERVICE - DIGITAL TV',
        charged_value: 49.90,
        section: 'OTHERS',
        sub_section: 'ERRORS'
      }
    ];

    for (const item of testItems) {
      await Invoice.create({
        workspace_id: ws.id,
        raw_invoice_id: rawInvoice.id,
        operator: 'claro',
        source_phone: '11900001111',
        item_date: today,
        item_time: '12:00:00',
        description: item.description,
        total_value: item.charged_value,
        charged_value: item.charged_value,
        section: item.section,
        sub_section: item.sub_section
      });
    }

    console.log('✅ Test data inserted successfully!');
    console.log('📊 Surplus Items: R$ 205.50');
    console.log('⚠️ Error/Fine Items: R$ 62.35');
    console.log('\nRefresh the Dashboard at http://localhost:8085/ to see the alerts.');

  } catch (error) {
    console.error('❌ Erro ao inserir dados:', error);
  } finally {
    await sequelize.close();
  }
}

seedAlerts();
