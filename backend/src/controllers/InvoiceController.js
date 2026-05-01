const crypto = require('crypto');
const RawInvoice = require('../models/RawInvoice');
const Invoice = require('../models/Invoice');
const CostCenter = require('../models/CostCenter');
const PhoneLine = require('../models/PhoneLine');
const Workspace = require('../models/Workspace');
const { Op } = require('sequelize');
const { logOperation } = require('../utils/auditLogger');

class InvoiceController {
  constructor() {
    this.importClaro = this.importClaro.bind(this);
    this.importVivo = this.importVivo.bind(this);
    this.importClaroTXT = this.importClaroTXT.bind(this);
    this.index = this.index.bind(this);
    this.indexClaro = this.indexClaro.bind(this);
    this.indexVivo = this.indexVivo.bind(this);
    this.listRawInvoices = this.listRawInvoices.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const { workspaceId } = req.query;

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID é obrigatório' });
      }

      const rawInvoice = await RawInvoice.findOne({
        where: { id, workspace_id: workspaceId }
      });

      if (!rawInvoice) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }

      const operator = rawInvoice.operator;
      const dueDate = rawInvoice.due_date;

      // Delete associated items first (or rely on CASCADE if set, but manual is safer here)
      await Invoice.destroy({
        where: { raw_invoice_id: id, workspace_id: workspaceId }
      });

      await rawInvoice.destroy();

      // Log deletion
      await logOperation({
        user_id: req.userId,
        workspace_id: workspaceId,
        action: 'DELETE',
        entity: 'RawInvoice',
        entity_id: id,
        ip_address: req.ip,
        payload: { operator, due_date: dueDate }
      });

      return res.json({ message: 'Fatura e itens removidos com sucesso' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao remover fatura' });
    }
  }

  async listRawInvoices(req, res) {
    try {
      const { workspaceId, dueDate } = req.query;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID é obrigatório' });

      const where = { workspace_id: workspaceId };
      if (dueDate) where.due_date = dueDate;

      const raws = await RawInvoice.findAll({
        where,
        attributes: ['id', 'operator', 'content', 'created_at', 'due_date'],
        order: [['due_date', 'DESC'], ['created_at', 'DESC']]
      });

      return res.json(raws);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar faturas importadas' });
    }
  }

  async _ensurePhoneLine(phoneNumber, workspaceId) {
    if (!phoneNumber) return;
    
    // Check if phone line already exists
    const existing = await PhoneLine.findOne({ 
      where: { phone_number: phoneNumber, workspace_id: workspaceId } 
    });
    
    if (!existing) {
      // Find or create Matriz cost center
      const [matriz] = await CostCenter.findOrCreate({
        where: { name: 'Matriz', workspace_id: workspaceId },
        defaults: {
          code: 'MATRIZ',
          name: 'Matriz',
          description: 'Centro de Custo Padrão',
          workspace_id: workspaceId
        }
      });
      
      // Create new phone line associated with Matriz
      await PhoneLine.create({
        phone_number: phoneNumber,
        cost_center_id: matriz.id,
        workspace_id: workspaceId,
        responsible_name: 'Novo Número (Auto)'
      });
    }
  }

  _cleanContent(content) {
    if (!content) return content;
    
    let cleaned = content;

    const mapping = [
      { pattern: /Per\uFFFDo/g, replacement: 'Periodo' },
      { pattern: /Refer\uFFFDncia/g, replacement: 'Referencia' },
      { pattern: /N\uFFFD Cliente/g, replacement: 'No. Cliente' },
      { pattern: /N\uFFFD/g, replacement: 'No.' },
      { pattern: /Identifica\uFFFD\uFFFDo/g, replacement: 'Identificacao' },
      { pattern: /d\uFFFDbito/g, replacement: 'debito' },
      { pattern: /autom\uFFFDtico/g, replacement: 'automatico' },
      { pattern: /Se\uFFFD\uFFFDo/g, replacement: 'Secao' },
      { pattern: /Dura\uFFFD\uFFFDo/g, replacement: 'Duracao' },
      { pattern: /Matr\uFFFDcula/g, replacement: 'Matricula' },
      { pattern: /Descri\uFFFD\uFFFDo/g, replacement: 'Descricao' },
      { pattern: /C\uFFFDdigo/g, replacement: 'Codigo' },
      { pattern: /B\uFFFDnus/g, replacement: 'Bonus' },
      { pattern: /Sinaliza\uFFFD\uFFFDo/g, replacement: 'Sinalizacao' },
      { pattern: /N\uFFFDmero/g, replacement: 'Numero' },
      { pattern: /Sub-Se\uFFFD\uFFFDo/g, replacement: 'Sub-Secao' },
      { pattern: /Navega\uFFFD\uFFFDo/g, replacement: 'Navegacao' },
      { pattern: /Padr\uFFFDo/g, replacement: 'Padrao' },
      { pattern: /P\uFFFDs/g, replacement: 'Pos' },
      { pattern: /Servi\uFFFDos/g, replacement: 'Servicos' },
      { pattern: /Opera\uFFFD\uFFFDo/g, replacement: 'Operacao' },
      { pattern: /Promo\uFFFD\uFFFDo/g, replacement: 'Promocao' }
    ];

    mapping.forEach(item => {
      cleaned = cleaned.replace(item.pattern, item.replacement);
    });

    // Final pass for any stray replacement characters that might have different patterns
    cleaned = cleaned.replace(/\uFFFD/g, '');

    return cleaned;
  }

  async importClaro(req, res) {
    try {
      let { content, workspaceId } = req.body;
      content = this._cleanContent(content);

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required for import' });
      }

      const hash = crypto.createHash('md5').update(content).digest('hex');
      const existing = await RawInvoice.findOne({ where: { hash, workspace_id: workspaceId, operator: 'claro' } });
      if (existing) {
        return res.status(400).json({ error: 'This invoice has already been imported for this workspace.' });
      }

      const raw = await RawInvoice.create({
        workspace_id: workspaceId,
        operator: 'claro',
        content: { raw: content },
        hash,
        processing_status: 'processado',
        due_date: null // Claro record format doesn't seem to have a clear single due date line like TXT
      });

      const lines = content.split('\n');
      const items = [];
      const processedPhones = new Set();

      for (const line of lines) {
        if (line.startsWith('30')) {
          const source_phone = line.substring(2, 27).trim();
          const data_servico_raw = line.substring(27, 35);
          const item_date = `${data_servico_raw.substring(0, 4)}-${data_servico_raw.substring(4, 6)}-${data_servico_raw.substring(6, 8)}`;
          const hora_servico_raw = line.substring(43, 49);
          const item_time = `${hora_servico_raw.substring(0, 2)}:${hora_servico_raw.substring(2, 4)}:${hora_servico_raw.substring(4, 6)}`;
          const description = line.substring(49, 93).trim();
          const total_value = parseFloat(line.substring(93, 106)) / 100;

          if (source_phone && !processedPhones.has(source_phone)) {
            await this._ensurePhoneLine(source_phone, workspaceId);
            processedPhones.add(source_phone);
          }

          items.push({
            workspace_id: workspaceId,
            operator: 'claro',
            source_phone,
            item_date,
            item_time,
            description,
            total_value,
            charged_value: total_value,
            raw_invoice_id: raw.id
          });
        }
      }

      await Invoice.bulkCreate(items);

      // Log import
      await logOperation({
        user_id: req.userId,
        workspace_id: workspaceId,
        action: 'IMPORT',
        entity: 'RawInvoice',
        entity_id: raw.id,
        ip_address: req.ip,
        payload: { operator: 'claro', itemCount: items.length }
      });

      return res.status(201).json({ message: `${items.length} Claro items imported successfully` });
    } catch (error) {
      console.error('Claro Import Error:', error);
      return res.status(500).json({ error: 'Error importing Claro invoices' });
    }
  }

  async importVivo(req, res) {
    try {
      const { content, workspaceId } = req.body;

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required for import' });
      }

      const hash = crypto.createHash('md5').update(content).digest('hex');
      const existing = await RawInvoice.findOne({ where: { hash, workspace_id: workspaceId, operator: 'vivo' } });
      if (existing) {
        return res.status(400).json({ error: 'This invoice has already been imported for this workspace.' });
      }

      const raw = await RawInvoice.create({
        workspace_id: workspaceId,
        operator: 'vivo',
        content: { raw: content },
        hash,
        processing_status: 'processado',
        due_date: null // Vivo tab usually doesn't have it in the rows
      });

      const lines = content.split('\n');
      const items = [];
      const processedPhones = new Set();

      const startIndex = lines[0].includes('Data') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split('	');
        if (parts.length >= 7) {
          let item_date = parts[0];
          if (item_date.includes('/')) {
            const [d, m, y] = item_date.split('/');
            item_date = `${y}-${m}-${d}`;
          }

          const phone = parts[2];
          if (phone && !processedPhones.has(phone)) {
            await this._ensurePhoneLine(phone, workspaceId);
            processedPhones.add(phone);
          }

          items.push({
            workspace_id: workspaceId,
            operator: 'vivo',
            item_date,
            item_time: parts[1],
            source_phone: phone,
            destination_phone: parts[3],
            duration: parts[4],
            description: parts[5],
            charged_value: parseFloat(parts[6].replace(',', '.')), 
            total_value: parseFloat(parts[6].replace(',', '.')), 
            raw_invoice_id: raw.id
          });
        }
      }

      await Invoice.bulkCreate(items);

      // Log import
      await logOperation({
        user_id: req.userId,
        workspace_id: workspaceId,
        action: 'IMPORT',
        entity: 'RawInvoice',
        entity_id: raw.id,
        ip_address: req.ip,
        payload: { operator: 'vivo', itemCount: items.length }
      });

      return res.status(201).json({ message: `${items.length} Vivo items imported successfully` });
    } catch (error) {
      console.error('Vivo Import Error:', error);
      return res.status(500).json({ error: 'Error importing Vivo invoices' });
    }
  }

  async importClaroTXT(req, res) {
    try {
      let { content, workspaceId } = req.body;
      content = this._cleanContent(content);
      
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });

      const hash = crypto.createHash('md5').update(content).digest('hex');
      const existing = await RawInvoice.findOne({ where: { hash, workspace_id: workspaceId, operator: 'claro_txt' } });
      if (existing) return res.status(400).json({ error: 'This invoice has already been imported.' });

      // Header extraction
      const lines = content.split('\n').map(l => l.trim());
      const headerInfo = {};
      lines.forEach(line => {
        if (line.includes('Data de Vencimento:')) {
           const match = line.match(/Data de Vencimento:\s*([\d/]+)/);
           if (match) headerInfo.data_vencimento = match[1];
           const valMatch = line.match(/Valor:\s*R\$\s*([\d.,]+)/);
           if (valMatch) headerInfo.valor_total = valMatch[1];
        }
        if (line.includes('Cliente:')) {
           const parts = line.split('Cliente:');
           if (parts[1]) headerInfo.cliente = parts[1].trim();
        }
      });

      let due_date = null;
      if (headerInfo.data_vencimento) {
        const [d, m, y] = headerInfo.data_vencimento.split('/');
        due_date = `${y}-${m}-${d}`;
      }

      const raw = await RawInvoice.create({
        workspace_id: workspaceId,
        operator: 'claro_txt',
        content: { raw: content, header: headerInfo },
        due_date,
        hash,
        processing_status: 'processado'
      });

      const items = [];
      let startParsing = false;
      
      const parseValue = (val) => {
        if (!val) return 0;
        // Remove thousands dots, replace comma with dot
        const cleanVal = val.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleanVal) || 0;
      };

      // Set of phones already processed in this import to avoid redundant checks
      const processedPhones = new Set();

      for (const line of lines) {
        if (line.startsWith('Tel;Se')) {
          startParsing = true;
          continue;
        }
        if (startParsing && line) {
          const parts = line.split(';');
          if (parts.length >= 10) {
            let item_date = parts[2];
            if (item_date && item_date.includes('/')) {
                const [d, m, y] = item_date.split('/');
                item_date = `${y}-${m}-${d}`;
            }

            const total_value = parseValue(parts[8]);
            const charged_value = parseValue(parts[9]);
            const quantity = parseValue(parts[6]);
            const phone = parts[0];

            if (phone && !processedPhones.has(phone)) {
              await this._ensurePhoneLine(phone, workspaceId);
              processedPhones.add(phone);
            }

            items.push({
              workspace_id: workspaceId,
              operator: 'claro_txt',
              source_phone: phone,
              section: parts[1],
              item_date: (item_date && item_date.length === 10) ? item_date : null,
              item_time: parts[3] || null,
              source_location: parts[4],
              destination_phone: parts[5],
              duration: parts[6],
              quantity: quantity || 0,
              total_value,
              charged_value,
              original_user: parts[10],
              original_cost_center: parts[11],
              sub_section: parts[13],
              tax_type: parts[14],
              description: parts[15],
              raw_invoice_id: raw.id
            });
          }
        }
      }

      // Batch bulkCreate to avoid memory/Postgres limits
      const chunkSize = 1000;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        await Invoice.bulkCreate(chunk);
      }

      // Log import
      await logOperation({
        user_id: req.userId,
        workspace_id: workspaceId,
        action: 'IMPORT',
        entity: 'RawInvoice',
        entity_id: raw.id,
        ip_address: req.ip,
        payload: { operator: 'claro_txt', itemCount: items.length, due_date }
      });

      return res.status(201).json({ message: `${items.length} Claro TXT items imported successfully` });
    } catch (error) {
      console.error('Claro TXT Import Error:', error);
      return res.status(500).json({ error: 'Error importing Claro TXT: ' + error.message });
    }
  }

  async index(req, res) {
    try {
      const { workspaceId, operator, dueDate, page, limit, raw_invoice_id } = req.query;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID é obrigatório' });

      const where = { workspace_id: workspaceId };
      if (operator) where.operator = operator;
      if (raw_invoice_id) where.raw_invoice_id = raw_invoice_id;

      const include = [];
      if (dueDate) {
        include.push({
          model: RawInvoice,
          as: 'header',
          attributes: [],
          where: { due_date: dueDate },
          required: true
        });
      }

      const order = [['item_date', 'DESC'], ['item_time', 'DESC'], ['id', 'ASC']];

      // Paginated response
      if (page !== undefined || limit !== undefined) {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const offset = (pageNum - 1) * pageSize;

        const { rows, count } = await Invoice.findAndCountAll({
          where,
          include,
          order,
          limit: pageSize,
          offset,
        });

        return res.json({
          data: rows,
          page: pageNum,
          limit: pageSize,
          total: count,
          hasMore: offset + rows.length < count,
        });
      }

      const faturas = await Invoice.findAll({ where, include, order });
      return res.json(faturas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error listing invoices' });
    }
  }

  async indexClaro(req, res) {
    req.query.operator = 'claro';
    return this.index(req, res);
  }

  async indexVivo(req, res) {
    req.query.operator = 'vivo';
    return this.index(req, res);
  }
}

module.exports = new InvoiceController();
