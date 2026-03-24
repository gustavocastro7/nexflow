const sequelize = require('../config/database');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const CostCenter = require('../models/CostCenter');
const UserWorkspace = require('../models/UserWorkspace');
const RawInvoice = require('../models/RawInvoice');
const Invoice = require('../models/Invoice');
const PhoneLine = require('../models/PhoneLine');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class MockSeeder {
  async run() {
    try {
      console.log('Running Mock Seeder...');

      // 1. Create Workspaces
      const [nexflowMatriz] = await Workspace.findOrCreate({
        where: { schema_name: 'nexflow_matriz' },
        defaults: {
          name: 'Nexflow Matriz',
          schema_name: 'nexflow_matriz',
          status: 'active'
        }
      });
      console.log('🏢 Workspace "Nexflow Matriz" created or found.');

      const [teleen] = await Workspace.findOrCreate({
        where: { schema_name: 'teleen_consultoria' },
        defaults: {
          name: 'Teleen Consultoria',
          schema_name: 'teleen_consultoria',
          status: 'active'
        }
      });
      console.log('🏢 Workspace "Teleen Consultoria" created or found.');


      // 2. Create Users
      const [gustavo] = await User.findOrCreate({
        where: { email: 'gustavocastro73@gmail.com' },
        defaults: {
          name: 'Gustavo Castro',
          email: 'gustavocastro73@gmail.com',
          password_hash: 'castro',
          profile: 'jedi',
          default_workspace_id: nexflowMatriz.id
        }
      });
      console.log('👤 User "Gustavo Castro" created or found.');

      const [fabio] = await User.findOrCreate({
        where: { email: 'fabioluckmann79@gmail.com' },
        defaults: {
          name: 'Fabio Luckmann',
          email: 'fabioluckmann79@gmail.com',
          password_hash: 'fabio',
          profile: 'jedi',
          default_workspace_id: nexflowMatriz.id
        }
      });
      console.log('👤 User "Fabio Luckmann" created or found.');


      // 3. Associate users with workspaces
      await UserWorkspace.findOrCreate({ where: { user_id: gustavo.id, workspace_id: nexflowMatriz.id } });
      await UserWorkspace.findOrCreate({ where: { user_id: gustavo.id, workspace_id: teleen.id } });
      await UserWorkspace.findOrCreate({ where: { user_id: fabio.id, workspace_id: nexflowMatriz.id } });
      await UserWorkspace.findOrCreate({ where: { user_id: fabio.id, workspace_id: teleen.id } });
      console.log('🔗 Users associated with workspaces.');


      const workspacesData = [
        {
          ws: teleen,
          name: 'Teleen Consultoria',
          schema_name: 'teleen_consultoria',
          costCenters: [
            { code: 'CC-001', name: 'Diretoria', phones: [
              { number: '11900001111', respName: 'Ana Souza', respId: 'EMP-001' },
              { number: '11900002222', respName: 'Ana Souza', respId: 'EMP-001' },
            ] },
            { code: 'CC-002', name: 'TI / Operações', phones: [
              { number: '11900003333', respName: 'Bruno Lima', respId: 'EMP-002' },
              { number: '11900004444', respName: 'Carla Dias', respId: 'EMP-003' },
            ] },
            { code: 'CC-003', name: 'Vendas', phones: [
              { number: '11900005555', respName: 'Diego Alves', respId: 'EMP-004' },
              { number: '11900006666', respName: 'Diego Alves', respId: 'EMP-004' },
            ] },
            { code: 'CC-004', name: 'Financeiro', phones: [
              { number: '11900007777', respName: 'Elisa Rocha', respId: 'EMP-005' },
            ] }
          ],
          users: [],
          claroInvoices: [
            { source_phone: '11900001111', item_date: '2025-02-10', item_time: '10:00:00', description: 'SERVIÇO VOZ', total_value: 150.50, charged_value: 150.50 },
            { source_phone: '11900003333', item_date: '2025-02-12', item_time: '11:00:00', description: 'DADOS MÓVEIS', total_value: 89.90, charged_value: 89.90 },
            { source_phone: '11900005555', item_date: '2025-02-15', item_time: '09:00:00', description: 'SERVIÇO VOZ', total_value: 210.00, charged_value: 210.00 },
            { source_phone: '11900001111', item_date: '2025-03-01', item_time: '08:30:00', description: 'SERVIÇO VOZ', total_value: 120.00, charged_value: 120.00 },
            { source_phone: '11900003333', item_date: '2025-03-02', item_time: '14:00:00', description: 'INTERNET 5G', total_value: 95.00, charged_value: 95.00 },
            { source_phone: '11999999999', item_date: '2025-03-03', item_time: '15:00:00', description: 'LIGAÇÃO LOCAL (NÃO ALOCADO)', total_value: 25.00, charged_value: 25.00 }
          ],
          vivoInvoices: [
            { item_date: '2025-02-05', item_time: '14:00:00', source_phone: '11900002222', destination_phone: '11988887777', duration: '00:05:00', description: 'VOZ', charged_value: 12.00, total_value: 12.00 },
            { item_date: '2025-02-08', item_time: '16:00:00', source_phone: '11900004444', destination_phone: '11988887777', duration: '00:10:00', description: 'ROAMING', charged_value: 45.00, total_value: 45.00 },
            { item_date: '2025-03-02', item_time: '09:00:00', source_phone: '11900007777', destination_phone: '11911111111', duration: '00:10:00', description: 'SUPORTE VIVO', charged_value: 35.50, total_value: 35.50 },
            { item_date: '2025-03-04', item_time: '10:30:00', source_phone: '11900002222', destination_phone: '11911111111', duration: '00:02:00', description: 'VOZ', charged_value: 5.00, total_value: 5.00 }
          ]
        },
      ];

      for (const wsInfo of workspacesData) {
        const ws = wsInfo.ws;
        await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${wsInfo.schema_name}"`);

        for (const ccData of wsInfo.costCenters) {
          const phoneNumbers = ccData.phones.map(p => p.number);
          const [cc] = await CostCenter.findOrCreate({
            where: { name: ccData.name, workspace_id: ws.id },
            defaults: {
              code: ccData.code,
              name: ccData.name,
              description: `Cost center for ${ccData.name}`,
              phones: phoneNumbers,
              workspace_id: ws.id
            }
          });
          if (!cc.code) await cc.update({ code: ccData.code });

          for (const p of ccData.phones) {
            await PhoneLine.findOrCreate({
              where: { phone_number: p.number, workspace_id: ws.id },
              defaults: {
                phone_number: p.number,
                responsible_name: p.respName,
                responsible_id: p.respId,
                cost_center_id: cc.id,
                workspace_id: ws.id,
              }
            });
          }
        }

        const rawClaro = await RawInvoice.findOrCreate({
            where: { workspace_id: ws.id, operator: 'claro', hash: 'mock_claro' },
            defaults: { content: { info: 'Mock Data' }, processing_status: 'processado' }
        });
        const rawVivo = await RawInvoice.findOrCreate({
            where: { workspace_id: ws.id, operator: 'vivo', hash: 'mock_vivo' },
            defaults: { content: { info: 'Mock Data' }, processing_status: 'processado' }
        });

        for (const f of wsInfo.claroInvoices) {
          await Invoice.findOrCreate({
            where: {
                source_phone: f.source_phone,
                item_date: f.item_date,
                item_time: f.item_time,
                workspace_id: ws.id,
                operator: 'claro'
            },
            defaults: {
              workspace_id: ws.id,
              operator: 'claro',
              raw_invoice_id: rawClaro[0].id,
              source_phone: f.source_phone,
              item_date: f.item_date,
              item_time: f.item_time,
              description: f.description,
              total_value: f.total_value,
              charged_value: f.charged_value
            }
          });
        }
        for (const f of wsInfo.vivoInvoices) {
          await Invoice.findOrCreate({
            where: {
                source_phone: f.source_phone,
                item_date: f.item_date,
                item_time: f.item_time,
                workspace_id: ws.id,
                operator: 'vivo'
            },
            defaults: {
              workspace_id: ws.id,
              operator: 'vivo',
              raw_invoice_id: rawVivo[0].id,
              item_date: f.item_date,
              item_time: f.item_time,
              source_phone: f.source_phone,
              destination_phone: f.destination_phone,
              duration: f.duration,
              description: f.description,
              charged_value: f.charged_value,
              total_value: f.total_value
            }
          });
        }
      }

      console.log('Mock Seeder finished successfully.');
    } catch (error) {
      console.error('[MockSeeder] Error:', error);
    }
  }
}

module.exports = new MockSeeder();
