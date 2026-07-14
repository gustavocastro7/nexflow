const Workspace = require('./src/models/Workspace');
const CostCenter = require('./src/models/CostCenter');
const Invoice = require('./src/models/Invoice');
const PhoneLine = require('./src/models/PhoneLine');
const sequelize = require('./src/config/database');

async function backfillMatriz() {
  try {
    console.log('Starting Matriz cost center and Phone Lines backfill...');
    const workspaces = await Workspace.findAll();
    
    for (const ws of workspaces) {
      console.log(`Processing workspace: ${ws.name} (${ws.id})`);
      
      const [matriz, created] = await CostCenter.findOrCreate({
        where: { name: 'Matriz', workspace_id: ws.id },
        defaults: {
          code: 'MATRIZ',
          name: 'Matriz',
          description: 'Centro de Custo Padrão',
          workspace_id: ws.id
        }
      });
      
      if (created) {
        console.log(`✅ Created "Matriz" for workspace: ${ws.name}`);
      } else {
        console.log(`ℹ️ "Matriz" already exists for workspace: ${ws.name}`);
      }

      // Find all unique source_phones in invoices for this workspace
      const uniquePhones = await Invoice.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('source_phone')), 'source_phone']],
        where: { workspace_id: ws.id },
        raw: true
      });

      console.log(`Found ${uniquePhones.length} unique phone numbers in invoices for ${ws.name}`);

      let createdCount = 0;
      for (const item of uniquePhones) {
        const phoneNumber = item.source_phone;
        if (!phoneNumber) continue;

        const [phoneLine, lineCreated] = await PhoneLine.findOrCreate({
          where: { phone_number: phoneNumber, workspace_id: ws.id },
          defaults: {
            phone_number: phoneNumber,
            cost_center_id: matriz.id,
            workspace_id: ws.id,
            responsible_name: 'Novo Número (Auto)'
          }
        });

        if (lineCreated) {
          createdCount++;
        }
      }
      console.log(`✅ Created ${createdCount} new phone lines for workspace: ${ws.name}`);
    }
    
    console.log('Backfill completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  }
}

backfillMatriz();
