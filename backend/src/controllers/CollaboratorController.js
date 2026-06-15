const Collaborator = require('../models/Collaborator');
const CostCenter = require('../models/CostCenter');
const PhoneLine = require('../models/PhoneLine');
const { Op } = require('sequelize');
const { logOperation } = require('../utils/auditLogger');

class CollaboratorController {
  constructor() {
    this.previewCSV = this.previewCSV.bind(this);
    this.importCSV = this.importCSV.bind(this);
  }

  async index(req, res) {
    try {
      const { workspaceId, search } = req.query;
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
      }

      const where = { workspace_id: workspaceId };
      
      if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
      }

      const collaborators = await Collaborator.findAll({
        where,
        order: [['name', 'ASC']]
      });

      return res.json(collaborators);
    } catch (error) {
      console.error('Collaborator index error:', error);
      return res.status(500).json({ error: 'Error listing collaborators' });
    }
  }

  async store(req, res) {
    try {
      const { name, external_id, email, department, workspace_id } = req.body;

      if (!name || !workspace_id) {
        return res.status(400).json({ error: 'Name and Workspace ID are required' });
      }

      const collaborator = await Collaborator.create({
        name,
        external_id,
        email,
        department,
        workspace_id
      });

      await logOperation({
        user_id: req.userId,
        workspace_id,
        action: 'CREATE',
        entity: 'Collaborator',
        entity_id: collaborator.id,
        ip_address: req.ip,
        payload: { name, email, external_id }
      });

      return res.status(201).json(collaborator);
    } catch (error) {
      console.error('Collaborator store error:', error);
      return res.status(500).json({ error: 'Error creating collaborator' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const collaborator = await Collaborator.findByPk(id);
      if (!collaborator) {
        return res.status(404).json({ error: 'Collaborator not found' });
      }
      return res.json(collaborator);
    } catch (error) {
      return res.status(500).json({ error: 'Error fetching collaborator' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, external_id, email, department } = req.body;

      const collaborator = await Collaborator.findByPk(id);
      if (!collaborator) {
        return res.status(404).json({ error: 'Collaborator not found' });
      }

      await collaborator.update({
        name,
        external_id,
        email,
        department
      });

      await logOperation({
        user_id: req.userId,
        workspace_id: collaborator.workspace_id,
        action: 'UPDATE',
        entity: 'Collaborator',
        entity_id: collaborator.id,
        ip_address: req.ip,
        payload: { name, email, external_id }
      });

      return res.json(collaborator);
    } catch (error) {
      return res.status(500).json({ error: 'Error updating collaborator' });
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;
      const collaborator = await Collaborator.findByPk(id);
      if (!collaborator) {
        return res.status(404).json({ error: 'Collaborator not found' });
      }
      
      const workspace_id = collaborator.workspace_id;
      const collaborator_id = collaborator.id;
      const collaborator_name = collaborator.name;

      await collaborator.destroy();

      await logOperation({
        user_id: req.userId,
        workspace_id,
        action: 'DELETE',
        entity: 'Collaborator',
        entity_id: collaborator_id,
        ip_address: req.ip,
        payload: { name: collaborator_name }
      });

      return res.json({ message: 'Collaborator removed successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Error removing collaborator' });
    }
  }

  _detectDelimiter(firstLine) {
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    return semicolons >= commas ? ';' : ',';
  }

  _parseCSV(content) {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return { rows: [], columnMap: null, error: 'CSV must have a header and at least one line of data' };

    const delimiter = this._detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_ ]/g, ''));

    const columnMap = {};
    const colNames = { 'nr': 'phone', 'numero': 'phone', 'telefone': 'phone', 'phone': 'phone', 
                        'nome': 'name', 'name': 'name',
                        'cpf': 'cpf', 'documento': 'cpf', 'doc': 'cpf',
                        'centrodecusto': 'costcenter', 'centro de custo': 'costcenter', 'cc': 'costcenter', 'costcenter': 'costcenter', 'cost_center': 'costcenter' };
    
    headers.forEach((h, i) => {
      const mapped = colNames[h] || colNames[h.replace(/[\s_-]/g, '')];
      if (mapped) columnMap[mapped] = i;
    });

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map(p => p.trim());
      rows.push({
        phone: columnMap.phone !== undefined ? parts[columnMap.phone] || '' : '',
        name: columnMap.name !== undefined ? parts[columnMap.name] || '' : '',
        cpf: columnMap.cpf !== undefined ? parts[columnMap.cpf] || '' : '',
        costCenter: columnMap.costcenter !== undefined ? parts[columnMap.costcenter] || '' : '',
      });
    }

    return { rows, columnMap, error: null };
  }

  _validateRow(row, index) {
    const errors = [];
    if (!row.cpf || row.cpf.trim() === '') errors.push('Empty CPF');
    if (!row.name || row.name.trim() === '') errors.push('Empty name');
    return errors;
  }

  async previewCSV(req, res) {
    try {
      const { content, workspaceId } = req.body;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });
      if (!content) return res.status(400).json({ error: 'Content is required' });

      const { rows, columnMap, error } = this._parseCSV(content);
      if (error) return res.status(400).json({ error });

      if (!columnMap.name || !columnMap.cpf) {
        return res.status(400).json({ error: 'CSV must contain name and CPF columns' });
      }

      const invalidRows = [];
      const validRows = [];

      rows.forEach((row, i) => {
        const errors = this._validateRow(row, i + 2);
        if (errors.length > 0) {
          invalidRows.push({ row: i + 2, data: row, errors });
        } else {
          validRows.push(row);
        }
      });

      // Check which cost centers exist and which would be created
      const costCenterNames = [...new Set(validRows.map(r => r.costCenter).filter(Boolean))];
      const existingCCs = costCenterNames.length > 0 ? await CostCenter.findAll({
        where: { name: { [Op.in]: costCenterNames }, workspace_id: workspaceId }
      }) : [];
      const existingCCNames = new Set(existingCCs.map(cc => cc.name));

      const costCentersToCreate = costCenterNames.filter(n => !existingCCNames.has(n));

      // Check which CPFs already exist
      const existingCpf = await Collaborator.findAll({
        where: { external_id: { [Op.in]: validRows.map(r => r.cpf) }, workspace_id: workspaceId },
        attributes: ['external_id']
      });
      const existingCpfs = new Set(existingCpf.map(c => c.external_id));

      const toCreate = validRows.filter(r => !existingCpfs.has(r.cpf)).length;
      const toUpdate = validRows.length - toCreate;

      return res.json({
        total: rows.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        invalidRows: invalidRows.slice(0, 100),
        toCreate,
        toUpdate,
        costCentersFound: existingCCs.length,
        costCentersToCreate: costCentersToCreate.length,
        costCentersToCreateNames: costCentersToCreate.slice(0, 20),
      });
    } catch (error) {
      console.error('CSV Preview Error:', error);
      return res.status(500).json({ error: 'Error previewing CSV' });
    }
  }

  async importCSV(req, res) {
    try {
      const { content, workspaceId } = req.body;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });
      if (!content) return res.status(400).json({ error: 'Content is required' });

      const { rows, error } = this._parseCSV(content);
      if (error) return res.status(400).json({ error });

      if (!rows.length) return res.status(400).json({ error: 'No valid rows found' });

      const stats = {
        collaboratorsCreated: 0,
        collaboratorsUpdated: 0,
        costCentersCreated: 0,
        costCentersFound: 0,
        phoneLinesCreated: 0,
        phoneLinesUpdated: 0,
        skipped: 0,
        costCentersCreatedNames: [],
        costCenterCache: {},
        collaboratorCache: {},
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowErrors = this._validateRow(row, i + 2);
        if (rowErrors.length > 0) { stats.skipped++; continue; }

        try {
          // Find or create cost center
          let costCenterId = null;
          if (row.costCenter) {
            const ccName = row.costCenter.trim();
            if (stats.costCenterCache[ccName]) {
              costCenterId = stats.costCenterCache[ccName];
            } else {
              const [cc, created] = await CostCenter.findOrCreate({
                where: { name: ccName, workspace_id: workspaceId },
                defaults: { name: ccName, code: ccName.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50), workspace_id: workspaceId }
              });
              costCenterId = cc.id;
              stats.costCenterCache[ccName] = cc.id;
              if (created) { stats.costCentersCreated++; stats.costCentersCreatedNames.push(ccName); }
              else { stats.costCentersFound++; }
            }
          }

          // Find or create collaborator by CPF (external_id)
          let collaboratorId;
          if (stats.collaboratorCache[row.cpf]) {
            collaboratorId = stats.collaboratorCache[row.cpf];
          } else {
            const [collab, collabCreated] = await Collaborator.findOrCreate({
              where: { external_id: row.cpf, workspace_id: workspaceId },
              defaults: { name: row.name, external_id: row.cpf, workspace_id: workspaceId }
            });
            if (!collabCreated) {
              await collab.update({ name: row.name });
              stats.collaboratorsUpdated++;
            } else {
              stats.collaboratorsCreated++;
            }
            collaboratorId = collab.id;
            stats.collaboratorCache[row.cpf] = collab.id;
          }

          // Find or create phone line
          if (row.phone) {
            const [pl, plCreated] = await PhoneLine.findOrCreate({
              where: { phone_number: row.phone, workspace_id: workspaceId },
              defaults: {
                phone_number: row.phone,
                responsible_name: row.name,
                collaborator_id: collaboratorId,
                cost_center_id: costCenterId,
                workspace_id: workspaceId
              }
            });
            if (!plCreated) {
              const updates = { responsible_name: row.name, collaborator_id: collaboratorId };
              if (costCenterId) updates.cost_center_id = costCenterId;
              await pl.update(updates);
              stats.phoneLinesUpdated++;
            } else {
              stats.phoneLinesCreated++;
            }
          }
        } catch (err) {
          console.error(`Error processing row ${i + 2}:`, err.message);
          stats.skipped++;
        }
      }

      // Log import
      await logOperation({
        user_id: req.userId,
        workspace_id: workspaceId,
        action: 'IMPORT',
        entity: 'Collaborator',
        entity_id: 'csv-batch',
        ip_address: req.ip,
        payload: stats
      });

      return res.status(201).json({
        message: `${stats.collaboratorsCreated + stats.collaboratorsUpdated} collaborators processed (${stats.collaboratorsCreated} created, ${stats.collaboratorsUpdated} updated), ${stats.phoneLinesCreated + stats.phoneLinesUpdated} phone lines, ${stats.costCentersCreated} cost centers created`,
        ...stats,
      });
    } catch (error) {
      console.error('CSV Import Error:', error);
      return res.status(500).json({ error: 'Error importing CSV' });
    }
  }
}

module.exports = new CollaboratorController();
