const sequelize = require('./src/config/database');
const Invoice = require('./src/models/Invoice');
const RawInvoice = require('./src/models/RawInvoice');
const Workspace = require('./src/models/Workspace');

async function seedAlerts() {
  try {
    console.log('🚀 Iniciando inserção de dados para teste de alertas...');
    
    // 1. Localizar o workspace da Teleen
    const ws = await Workspace.findOne({ where: { schema_name: 'teleen_consultoria' } });
    if (!ws) {
      console.error('❌ Workspace Teleen não encontrado. Rode o seeder principal primeiro.');
      return;
    }

    // 2. Criar uma "fatura mestre" de teste
    const [rawInvoice] = await RawInvoice.findOrCreate({
      where: { workspace_id: ws.id, hash: 'test_alerts_v1' },
      defaults: {
        operator: 'claro',
        processing_status: 'processado',
        content: { info: 'Teste de Auditoria' },
        due_date: '2025-05-10'
      }
    });

    const today = new Date().toISOString().split('T')[0];

    // 3. Inserir itens que disparam a auditoria
    const testItems = [
      {
        description: 'EXCEDENTE DE DADOS 5GB',
        charged_value: 85.00,
        section: 'DADOS',
        sub_section: 'EXCEDENTE'
      },
      {
        description: 'FORA DO PACOTE - ROAMING INTERNACIONAL',
        charged_value: 120.50,
        section: 'DADOS',
        sub_section: 'INTERNACIONAL'
      },
      {
        description: 'MULTA POR ATRASO - REF 03/2025',
        charged_value: 12.45,
        section: 'ENCARGOS',
        sub_section: 'MULTAS'
      },
      {
        description: 'SERVIÇO NÃO CONTRATADO - TV DIGITAL',
        charged_value: 49.90,
        section: 'OUTROS',
        sub_section: 'ERROS'
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

    console.log('✅ Dados de teste inseridos com sucesso!');
    console.log('📊 Itens de Excedente: R$ 205.50');
    console.log('⚠️ Itens de Erro/Multa: R$ 62.35');
    console.log('\nAtualize o Dashboard em http://localhost:8085/ para ver os alertas.');

  } catch (error) {
    console.error('❌ Erro ao inserir dados:', error);
  } finally {
    await sequelize.close();
  }
}

seedAlerts();
