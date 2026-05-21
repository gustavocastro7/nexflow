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
    this.previewClaro = this.previewClaro.bind(this);
    this.previewVivo = this.previewVivo.bind(this);
    this.previewClaroTXT = this.previewClaroTXT.bind(this);
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
      if (dueDate === 'NO_DATE') {
        where.due_date = { [Op.is]: null };
      } else if (dueDate) {
        where.due_date = dueDate;
      }

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

  async _ensurePhoneLine(phoneNumber, workspaceId, costCenterId) {
    if (!phoneNumber) return;
    
    // Check if phone line already exists
    const existing = await PhoneLine.findOne({ 
      where: { phone_number: phoneNumber, workspace_id: workspaceId } 
    });
    
    if (existing) {
      // If existing phone line has no cost center and one was provided, update it
      if (costCenterId && !existing.cost_center_id) {
        await existing.update({ cost_center_id: costCenterId });
      }
      return;
    }
    
    // Determine cost center to associate
    let targetCostCenterId = costCenterId;
    
    if (!targetCostCenterId) {
      // Find or create Matriz cost center (default)
      const [matriz] = await CostCenter.findOrCreate({
        where: { name: 'Matriz', workspace_id: workspaceId },
        defaults: {
          code: 'MATRIZ',
          name: 'Matriz',
          description: 'Centro de Custo Padrão',
          workspace_id: workspaceId
        }
      });
      targetCostCenterId = matriz.id;
    }
    
    // Create new phone line associated with the chosen cost center
    await PhoneLine.create({
      phone_number: phoneNumber,
      cost_center_id: targetCostCenterId,
      workspace_id: workspaceId,
      responsible_name: 'Novo Número (Auto)'
    });
  }

  _validateDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return 'Data vazia ou inválida';
    const parts = dateStr.split('/');
    if (parts.length !== 3) return 'Formato de data inválido (esperado dd/mm/aaaa)';
    const [d, m, y] = parts.map(Number);
    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12) return 'Data inválida';
    return null;
  }

  _validatePhone(phone) {
    if (!phone || phone.trim() === '') return 'Telefone de origem vazio';
    return null;
  }

  _validateNumber(val, label) {
    if (val === undefined || val === null || val === '') return `${label} vazio`;
    const num = typeof val === 'string' ? parseFloat(val.replace(',', '.').replace(/\./g, '')) : val;
    if (isNaN(num)) return `${label} não é um número válido`;
    return null;
  }

  _validateClaroTXTLine(parts, lineIndex) {
    const errors = [];
    if (parts.length < 10) {
      errors.push(`Linha ${lineIndex}: poucos campos (${parts.length}, esperado >= 10)`);
      return errors;
    }
    const phoneErr = this._validatePhone(parts[0]);
    if (phoneErr) errors.push(`Linha ${lineIndex}: ${phoneErr}`);
    const dateErr = parts[2] ? this._validateDate(parts[2]) : null;
    if (dateErr) errors.push(`Linha ${lineIndex}: ${dateErr}`);
    const valErr = this._validateNumber(parts[8], 'Valor total');
    if (valErr) errors.push(`Linha ${lineIndex}: ${valErr}`);
    return errors;
  }

  _validateClaroLine(line, lineIndex) {
    const errors = [];
    if (!line.startsWith('30')) return errors;
    if (line.length < 107) {
      errors.push(`Linha ${lineIndex}: linha muito curta (${line.length} caracteres, esperado >= 107)`);
      return errors;
    }
    const phone = line.substring(2, 27).trim();
    const phoneErr = this._validatePhone(phone);
    if (phoneErr) errors.push(`Linha ${lineIndex}: ${phoneErr}`);
    const valStr = line.substring(93, 106);
    if (valStr.trim() === '' || isNaN(parseFloat(valStr))) {
      errors.push(`Linha ${lineIndex}: Valor total inválido`);
    }
    return errors;
  }

  _validateVivoLine(parts, lineIndex) {
    const errors = [];
    if (parts.length < 7) {
      errors.push(`Linha ${lineIndex}: poucos campos (${parts.length}, esperado >= 7)`);
      return errors;
    }
    const phoneErr = this._validatePhone(parts[2]);
    if (phoneErr) errors.push(`Linha ${lineIndex}: ${phoneErr}`);
    if (parts[0] && parts[0].includes('/')) {
      const dateErr = this._validateDate(parts[0]);
      if (dateErr) errors.push(`Linha ${lineIndex}: ${dateErr}`);
    }
    return errors;
  }

  _parseAndValidateClaroTXT(content, workspaceId) {
    const lines = content.split('\n').map(l => l.trim());
    const items = [];
    const invalidItems = [];
    const processedPhones = new Set();
    let startParsing = false;

    const parseValue = (val) => {
      if (!val) return 0;
      const cleanVal = val.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleanVal) || 0;
    };

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      if (line.startsWith('Tel;Se')) {
        startParsing = true;
        continue;
      }
      if (!startParsing || !line) continue;

      const parts = line.split(';');
      const lineErrors = this._validateClaroTXTLine(parts, li + 1);

      if (lineErrors.length > 0) {
        invalidItems.push({ line: li + 1, content: line.substring(0, 80), errors: lineErrors });
        continue;
      }

      let item_date = parts[2];
      if (item_date && item_date.includes('/')) {
        const [d, m, y] = item_date.split('/');
        item_date = `${y}-${m}-${d}`;
      }

      const phone = parts[0];
      if (phone && !processedPhones.has(phone)) {
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
        quantity: parseValue(parts[6]),
        total_value: parseValue(parts[8]),
        charged_value: parseValue(parts[9]),
        original_user: parts[10],
        original_cost_center: parts[11],
        sub_section: parts[13],
        tax_type: parts[14],
        description: parts[15],
      });
    }

    return { items, invalidItems, processedPhones };
  }

  _parseAndValidateClaro(content, workspaceId) {
    const lines = content.split('\n');
    const items = [];
    const invalidItems = [];
    const processedPhones = new Set();

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      if (!line.startsWith('30')) continue;

      const lineErrors = this._validateClaroLine(line, li + 1);
      if (lineErrors.length > 0) {
        invalidItems.push({ line: li + 1, content: line.substring(0, 80), errors: lineErrors });
        continue;
      }

      const source_phone = line.substring(2, 27).trim();
      const data_servico_raw = line.substring(27, 35);
      const item_date = `${data_servico_raw.substring(0, 4)}-${data_servico_raw.substring(4, 6)}-${data_servico_raw.substring(6, 8)}`;
      const hora_servico_raw = line.substring(43, 49);
      const item_time = `${hora_servico_raw.substring(0, 2)}:${hora_servico_raw.substring(2, 4)}:${hora_servico_raw.substring(4, 6)}`;
      const total_value = parseFloat(line.substring(93, 106)) / 100;

      if (source_phone && !processedPhones.has(source_phone)) {
        processedPhones.add(source_phone);
      }

      items.push({
        workspace_id: workspaceId,
        operator: 'claro',
        source_phone,
        item_date,
        item_time,
        description: line.substring(49, 93).trim(),
        total_value,
        charged_value: total_value,
      });
    }

    return { items, invalidItems, processedPhones };
  }

  _parseAndValidateVivo(content, workspaceId) {
    const lines = content.split('\n');
    const items = [];
    const invalidItems = [];
    const processedPhones = new Set();
    const startIndex = lines[0].includes('Data') ? 1 : 0;

    for (let li = startIndex; li < lines.length; li++) {
      const line = lines[li].trim();
      if (!line) continue;

      const parts = line.split('\t');
      const lineErrors = this._validateVivoLine(parts, li + 1);

      if (lineErrors.length > 0) {
        invalidItems.push({ line: li + 1, content: line.substring(0, 80), errors: lineErrors });
        continue;
      }

      let item_date = parts[0];
      if (item_date.includes('/')) {
        const [d, m, y] = item_date.split('/');
        item_date = `${y}-${m}-${d}`;
      }

      const phone = parts[2];
      if (phone && !processedPhones.has(phone)) {
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
      });
    }

    return { items, invalidItems, processedPhones };
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

  async previewClaro(req, res) {
    try {
      let { content, workspaceId } = req.body;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });
      if (!content) return res.status(400).json({ error: 'Content is required' });

      content = this._cleanContent(content);
      const { items, invalidItems, processedPhones } = this._parseAndValidateClaro(content, workspaceId);

      return res.json({
        total: items.length + invalidItems.length,
        validCount: items.length,
        invalidCount: invalidItems.length,
        invalidItems: invalidItems.slice(0, 100),
        phonesDiscovered: Array.from(processedPhones),
        preview: items.slice(0, 5),
      });
    } catch (error) {
      console.error('Claro Preview Error:', error);
      return res.status(500).json({ error: 'Error previewing Claro invoices' });
    }
  }

  async importClaro(req, res) {
    try {
      let { content, workspaceId, costCenterId } = req.body;
      content = this._cleanContent(content);

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required for import' });
      }

      // Validate costCenterId if provided
      if (costCenterId) {
        const cc = await CostCenter.findOne({ where: { id: costCenterId, workspace_id: workspaceId } });
        if (!cc) return res.status(400).json({ error: 'Centro de custo não encontrado neste workspace' });
      }

      const hash = crypto.createHash('md5').update(content).digest('hex');
      const existing = await RawInvoice.findOne({ where: { hash, workspace_id: workspaceId, operator: 'claro' } });
      if (existing) {
        return res.status(400).json({ error: 'This invoice has already been imported for this workspace.' });
      }

      const { items, invalidItems, processedPhones } = this._parseAndValidateClaro(content, workspaceId);

      if (items.length === 0) {
        return res.status(400).json({ error: 'Nenhum registro válido encontrado para importar' });
      }

      const raw = await RawInvoice.create({
        workspace_id: workspaceId,
        operator: 'claro',
        content: { raw: content, validation: { total: items.length + invalidItems.length, skipped: invalidItems.length } },
        hash,
        processing_status: 'processado',
        due_date: null
      });

      // Associate phone lines with cost center
      for (const phone of processedPhones) {
        await this._ensurePhoneLine(phone, workspaceId, costCenterId);
      }

      // Assign raw_invoice_id to items and batch insert
      const itemsToInsert = items.map(item => ({ ...item, raw_invoice_id: raw.id }));
      await Invoice.bulkCreate(itemsToInsert);

      await logOperation({
        user_id: req.userId,
        workspace_id: workspaceId,
        action: 'IMPORT',
        entity: 'RawInvoice',
        entity_id: raw.id,
        ip_address: req.ip,
        payload: { operator: 'claro', itemCount: items.length, skipped: invalidItems.length, costCenterId }
      });

      const msg = `${items.length} Claro items imported successfully` +
        (invalidItems.length > 0 ? ` (${invalidItems.length} lines skipped due to errors)` : '');
      return res.status(201).json({ message: msg, imported: items.length, skipped: invalidItems.length });
    } catch (error) {
      console.error('Claro Import Error:', error);
      return res.status(500).json({ error: 'Error importing Claro invoices' });
    }
  }

  async previewVivo(req, res) {
    try {
      const { content, workspaceId } = req.body;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });
      if (!content) return res.status(400).json({ error: 'Content is required' });

      const { items, invalidItems, processedPhones } = this._parseAndValidateVivo(content, workspaceId);

      return res.json({
        total: items.length + invalidItems.length,
        validCount: items.length,
        invalidCount: invalidItems.length,
        invalidItems: invalidItems.slice(0, 100),
        phonesDiscovered: Array.from(processedPhones),
        preview: items.slice(0, 5),
      });
    } catch (error) {
      console.error('Vivo Preview Error:', error);
      return res.status(500).json({ error: 'Error previewing Vivo invoices' });
    }
  }

  async importVivo(req, res) {
    try {
      const { content, workspaceId, costCenterId } = req.body;

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required for import' });
      }

      if (costCenterId) {
        const cc = await CostCenter.findOne({ where: { id: costCenterId, workspace_id: workspaceId } });
        if (!cc) return res.status(400).json({ error: 'Centro de custo não encontrado neste workspace' });
      }

      const hash = crypto.createHash('md5').update(content).digest('hex');
      const existing = await RawInvoice.findOne({ where: { hash, workspace_id: workspaceId, operator: 'vivo' } });
      if (existing) {
        return res.status(400).json({ error: 'This invoice has already been imported for this workspace.' });
      }

      const { items, invalidItems, processedPhones } = this._parseAndValidateVivo(content, workspaceId);

      if (items.length === 0) {
        return res.status(400).json({ error: 'Nenhum registro válido encontrado para importar' });
      }

      const raw = await RawInvoice.create({
        workspace_id: workspaceId,
        operator: 'vivo',
        content: { raw: content, validation: { total: items.length + invalidItems.length, skipped: invalidItems.length } },
        hash,
        processing_status: 'processado',
        due_date: null
      });

      for (const phone of processedPhones) {
        await this._ensurePhoneLine(phone, workspaceId, costCenterId);
      }

      const itemsToInsert = items.map(item => ({ ...item, raw_invoice_id: raw.id }));
      await Invoice.bulkCreate(itemsToInsert);

      await logOperation({
        user_id: req.userId,
        workspace_id: workspaceId,
        action: 'IMPORT',
        entity: 'RawInvoice',
        entity_id: raw.id,
        ip_address: req.ip,
        payload: { operator: 'vivo', itemCount: items.length, skipped: invalidItems.length, costCenterId }
      });

      const msg = `${items.length} Vivo items imported successfully` +
        (invalidItems.length > 0 ? ` (${invalidItems.length} lines skipped due to errors)` : '');
      return res.status(201).json({ message: msg, imported: items.length, skipped: invalidItems.length });
    } catch (error) {
      console.error('Vivo Import Error:', error);
      return res.status(500).json({ error: 'Error importing Vivo invoices' });
    }
  }

  async previewClaroTXT(req, res) {
    try {
      let { content, workspaceId } = req.body;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });
      if (!content) return res.status(400).json({ error: 'Content is required' });

      content = this._cleanContent(content);
      const { items, invalidItems, processedPhones } = this._parseAndValidateClaroTXT(content, workspaceId);

      // Extract header info for preview
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

      return res.json({
        total: items.length + invalidItems.length,
        validCount: items.length,
        invalidCount: invalidItems.length,
        invalidItems: invalidItems.slice(0, 100),
        phonesDiscovered: Array.from(processedPhones),
        header: headerInfo,
        preview: items.slice(0, 5),
      });
    } catch (error) {
      console.error('Claro TXT Preview Error:', error);
      return res.status(500).json({ error: 'Error previewing Claro TXT: ' + error.message });
    }
  }

  async importClaroTXT(req, res) {
    try {
      let { content, workspaceId, costCenterId } = req.body;
      content = this._cleanContent(content);
      
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });

      if (costCenterId) {
        const cc = await CostCenter.findOne({ where: { id: costCenterId, workspace_id: workspaceId } });
        if (!cc) return res.status(400).json({ error: 'Centro de custo não encontrado neste workspace' });
      }

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

      const { items, invalidItems, processedPhones } = this._parseAndValidateClaroTXT(content, workspaceId);

      if (items.length === 0) {
        return res.status(400).json({ error: 'Nenhum registro válido encontrado para importar' });
      }

      const raw = await RawInvoice.create({
        workspace_id: workspaceId,
        operator: 'claro_txt',
        content: { raw: content, header: headerInfo, validation: { total: items.length + invalidItems.length, skipped: invalidItems.length } },
        due_date,
        hash,
        processing_status: 'processado'
      });

      // Associate phone lines with cost center
      for (const phone of processedPhones) {
        await this._ensurePhoneLine(phone, workspaceId, costCenterId);
      }

      // Assign raw_invoice_id to items
      const itemsToInsert = items.map(item => ({ ...item, raw_invoice_id: raw.id }));

      // Batch bulkCreate to avoid memory/Postgres limits
      const chunkSize = 1000;
      for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
        const chunk = itemsToInsert.slice(i, i + chunkSize);
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
        payload: { operator: 'claro_txt', itemCount: items.length, skipped: invalidItems.length, due_date, costCenterId }
      });

      const msg = `${items.length} Claro TXT items imported successfully` +
        (invalidItems.length > 0 ? ` (${invalidItems.length} lines skipped due to errors)` : '');
      return res.status(201).json({ message: msg, imported: items.length, skipped: invalidItems.length });
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
      if (dueDate === 'NO_DATE') {
        include.push({
          model: RawInvoice,
          as: 'header',
          attributes: [],
          where: { due_date: { [Op.is]: null } },
          required: true
        });
      } else if (dueDate) {
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
