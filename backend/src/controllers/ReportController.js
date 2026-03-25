const Invoice = require('../models/Invoice');
const CostCenter = require('../models/CostCenter');
const PhoneLine = require('../models/PhoneLine');
const sequelize = require('../config/database');
const { Op, fn, col, literal } = require('sequelize');

const PAGE_SIZE = 50;

function buildSearchClause(search) {
  if (!search) return {};
  const like = { [Op.iLike]: `%${search}%` };
  return {
    [Op.or]: [
      { '$costCenter.code$': like },
      { '$costCenter.name$': like },
      { responsible_name: like },
      { phone_number: like },
    ]
  };
}

class ReportController {
  async getDashboardStats(req, res) {
    try {
      const { workspaceId } = req.query;

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
      }

      const [costCentersCount, claroCount, vivoCount, claroTxtCount, totalSpent] = await Promise.all([
        CostCenter.count({ where: { workspace_id: workspaceId } }),
        Invoice.count({ where: { workspace_id: workspaceId, operator: 'claro' } }),
        Invoice.count({ where: { workspace_id: workspaceId, operator: 'vivo' } }),
        Invoice.count({ where: { workspace_id: workspaceId, operator: 'claro_txt' } }),
        Invoice.sum('charged_value', { where: { workspace_id: workspaceId } })
      ]);

      return res.json({
        costCenters: costCentersCount,
        claroInvoices: claroCount + claroTxtCount,
        vivoInvoices: vivoCount,
        totalSpent: parseFloat(totalSpent) || 0
      });
    } catch (error) {
      console.error('Dashboard Stats Error:', error);
      return res.status(500).json({ error: 'Error fetching dashboard statistics' });
    }
  }

  async getSpendingByCostCenter(req, res) {
    try {
      const { workspaceId, mes, ano, centroCustoId, telefone } = req.query;

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
      }

      const replacements = { workspaceId };
      let whereSql = 'WHERE i.workspace_id = :workspaceId';

      if (mes && ano) {
        const startDate = `${ano}-${mes.padStart(2, '0')}-01`;
        const endDate = new Date(ano, mes, 0).toISOString().split('T')[0];
        whereSql += ' AND i.item_date BETWEEN :startDate AND :endDate';
        replacements.startDate = startDate;
        replacements.endDate = endDate;
      } else if (ano) {
        whereSql += " AND i.item_date BETWEEN :anoStart AND :anoEnd";
        replacements.anoStart = `${ano}-01-01`;
        replacements.anoEnd = `${ano}-12-31`;
      }

      if (telefone) {
        whereSql += ' AND i.source_phone = :telefone';
        replacements.telefone = telefone;
      }

      // Fetch all invoices with their cost center association
      const [allInvoices] = await sequelize.query(`
        SELECT 
          i.id, i.operator, i.source_phone, i.item_date, i.item_time, 
          i.description, i.charged_value,
          cc.id AS cc_id, cc.name AS cc_name
        FROM invoices i
        LEFT JOIN phone_lines pl ON pl.phone_number = i.source_phone AND pl.workspace_id = i.workspace_id
        LEFT JOIN cost_centers cc ON cc.id = pl.cost_center_id
        ${whereSql}
      `, { replacements });

      // Calculate summary by cost center
      const summaryMap = new Map();
      
      allInvoices.forEach(f => {
        const ccId = f.cc_id || 'unallocated';
        const ccName = f.cc_name || 'Unallocated';
        
        if (!summaryMap.has(ccId)) {
          summaryMap.set(ccId, { id: ccId, name: ccName, total: 0, phones: new Set() });
        }
        
        const s = summaryMap.get(ccId);
        s.total += parseFloat(f.charged_value || 0);
        if (f.source_phone) s.phones.add(f.source_phone);
      });

      let summary = Array.from(summaryMap.values()).map(s => ({
        ...s,
        phones: Array.from(s.phones)
      }));

      // If a specific cost center was requested, filter the summary
      if (centroCustoId) {
        summary = summary.filter(s => s.id === centroCustoId);
      }

      // Generate detailed data (per phone)
      const detailsMap = new Map();
      allInvoices.forEach(f => {
        const phone = f.source_phone || 'Unknown';
        if (!detailsMap.has(phone)) {
          detailsMap.set(phone, { 
            phone, 
            costCenter: f.cc_name || 'Unallocated', 
            total: 0, 
            recordCount: 0 
          });
        }
        const d = detailsMap.get(phone);
        d.total += parseFloat(f.charged_value || 0);
        d.recordCount++;
      });
      const details = Array.from(detailsMap.values());

      // General records
      const general = allInvoices.map(f => ({
        id: f.id,
        operator: f.operator,
        phone: f.source_phone,
        date: f.item_date,
        time: f.item_time,
        service: f.description,
        value: parseFloat(f.charged_value || 0),
        costCenter: f.cc_name || 'Unallocated'
      })).sort((a, b) => new Date(b.date) - new Date(a.date));

      return res.json({
        summary,
        details,
        general
      });
    } catch (error) {
      console.error('Report Error:', error);
      return res.status(500).json({ error: 'Error generating report' });
    }
  }

  // Report 1: General phone number list
  async getPhoneLines(req, res) {
    try {
      const { workspaceId, search, page = 0 } = req.query;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });

      const offset = parseInt(page, 10) * PAGE_SIZE;
      const searchPattern = search ? `%${search}%` : null;

      const baseSql = `
        FROM (
          SELECT DISTINCT source_phone, workspace_id 
          FROM invoices 
          WHERE workspace_id = :workspaceId AND source_phone IS NOT NULL AND source_phone != ''
          UNION
          SELECT DISTINCT phone_number as source_phone, workspace_id 
          FROM phone_lines 
          WHERE workspace_id = :workspaceId
        ) AS unique_phones
        LEFT JOIN phone_lines pl ON pl.phone_number = unique_phones.source_phone AND pl.workspace_id = unique_phones.workspace_id
        LEFT JOIN cost_centers cc ON cc.id = pl.cost_center_id
        WHERE 1=1
        ${searchPattern ? `AND (
          unique_phones.source_phone ILIKE :search OR 
          pl.responsible_name ILIKE :search OR 
          cc.name ILIKE :search OR 
          cc.code ILIKE :search
        )` : ''}
      `;

      const [rows] = await sequelize.query(`
        SELECT 
          unique_phones.source_phone AS "phoneNumber",
          pl.id AS id,
          COALESCE(pl.responsible_name, (
            SELECT original_user 
            FROM invoices inv 
            WHERE inv.source_phone = unique_phones.source_phone 
              AND inv.workspace_id = unique_phones.workspace_id 
              AND inv.original_user IS NOT NULL 
              AND inv.original_user != ''
            LIMIT 1
          )) AS "responsibleName",
          pl.responsible_id AS "responsibleId",
          cc.code AS "costCenterCode",
          COALESCE(cc.name, 'Unallocated') AS "costCenterName"
        ${baseSql}
        ORDER BY cc.code ASC NULLS LAST, unique_phones.source_phone ASC
        LIMIT :limit OFFSET :offset
      `, { 
        replacements: { 
          workspaceId, 
          search: searchPattern, 
          limit: PAGE_SIZE, 
          offset 
        } 
      });

      const [[{ count }]] = await sequelize.query(`
        SELECT COUNT(*)::int AS count
        ${baseSql}
      `, { replacements: { workspaceId, search: searchPattern } });

      const items = rows.map(r => ({
        id: r.id || `temp-${r.phoneNumber}`,
        costCenterCode: r.costCenterCode || '',
        costCenterName: r.costCenterName,
        phoneNumber: r.phoneNumber,
        responsibleName: r.responsibleName || '',
        responsibleId: r.responsibleId || '',
      }));

      return res.json({ items, total: count, hasMore: offset + rows.length < count });
    } catch (error) {
      console.error('PhoneLines Report Error:', error);
      return res.status(500).json({ error: 'Error generating phone lines report' });
    }
  }

  // Report 2: Consumption by cost center (grouped by reference month)
  async getConsumptionByCostCenter(req, res) {
    try {
      const { workspaceId, search, page = 0 } = req.query;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });

      const offset = parseInt(page, 10) * PAGE_SIZE;
      const like = search ? `%${search}%` : null;

      const baseSql = `
        FROM invoices i
        LEFT JOIN phone_lines pl ON pl.phone_number = i.source_phone AND pl.workspace_id = i.workspace_id
        LEFT JOIN cost_centers cc ON cc.id = pl.cost_center_id
        WHERE i.workspace_id = :workspaceId
          ${like ? "AND (cc.code ILIKE :like OR cc.name ILIKE :like OR pl.responsible_name ILIKE :like OR i.source_phone ILIKE :like)" : ""}
        GROUP BY cc.id, cc.code, cc.name, TO_CHAR(i.item_date, 'YYYY-MM')
      `;

      const [rows] = await sequelize.query(`
        SELECT cc.id AS cc_id, cc.code AS cc_code, COALESCE(cc.name, 'Unallocated') AS cc_name,
               TO_CHAR(i.item_date, 'YYYY-MM') AS reference_month,
               SUM(i.charged_value) AS total
        ${baseSql}
        ORDER BY reference_month DESC, cc_code ASC NULLS LAST
        LIMIT :limit OFFSET :offset
      `, { replacements: { workspaceId, like, limit: PAGE_SIZE, offset } });

      const [[{ count }]] = await sequelize.query(
        `SELECT COUNT(*)::int AS count FROM (SELECT 1 ${baseSql}) t`,
        { replacements: { workspaceId, like } }
      );

      const items = rows.map(r => ({
        costCenterCode: r.cc_code || '',
        costCenterName: r.cc_name,
        referenceMonth: r.reference_month,
        total: parseFloat(r.total || 0),
      }));

      return res.json({ items, total: count, hasMore: offset + rows.length < count });
    } catch (error) {
      console.error('ConsumptionByCC Report Error:', error);
      return res.status(500).json({ error: 'Error generating consumption by cost center report' });
    }
  }

  // Report 3: Consumption by responsible person (requires reference month)
  async getConsumptionByResponsible(req, res) {
    try {
      const { workspaceId, referenceMonth, search, page = 0 } = req.query;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });
      if (!referenceMonth) return res.status(400).json({ error: 'Reference month is required' });

      const offset = parseInt(page, 10) * PAGE_SIZE;
      const like = search ? `%${search}%` : null;

      const whereSql = `
        WHERE i.workspace_id = :workspaceId
          AND TO_CHAR(i.item_date, 'YYYY-MM') = :referenceMonth
          ${like ? "AND (cc.code ILIKE :like OR cc.name ILIKE :like OR pl.responsible_name ILIKE :like OR i.source_phone ILIKE :like OR i.original_user ILIKE :like)" : ""}
      `;

      const fromSql = `
        FROM invoices i
        LEFT JOIN phone_lines pl ON pl.phone_number = i.source_phone AND pl.workspace_id = i.workspace_id
        LEFT JOIN cost_centers cc ON cc.id = pl.cost_center_id
        ${whereSql}
        GROUP BY i.source_phone, pl.responsible_name, i.original_user, pl.responsible_id, cc.code, cc.name
      `;

      const [rows] = await sequelize.query(`
        SELECT 
          i.source_phone AS phone_number,
          COALESCE(pl.responsible_name, i.original_user, '') AS responsible_name,
          pl.responsible_id,
          cc.code AS cc_code, 
          COALESCE(cc.name, 'Unallocated') AS cc_name,
          SUM(i.charged_value) AS total
        ${fromSql}
        ORDER BY responsible_name ASC, i.source_phone ASC
        LIMIT :limit OFFSET :offset
      `, { replacements: { workspaceId, referenceMonth, like, limit: PAGE_SIZE, offset } });

      const [[{ count, grand_total }]] = await sequelize.query(`
        SELECT COUNT(*)::int AS count, COALESCE(SUM(t.total), 0) AS grand_total
        FROM (SELECT SUM(i.charged_value) AS total ${fromSql}) t
      `, { replacements: { workspaceId, referenceMonth, like } });

      const items = rows.map(r => ({
        responsibleName: r.responsible_name || '',
        responsibleId: r.responsible_id || '',
        phoneNumber: r.phone_number,
        costCenterCode: r.cc_code || '',
        costCenterName: r.cc_name,
        total: parseFloat(r.total || 0),
      }));

      return res.json({
        items,
        total: count,
        grandTotal: parseFloat(grand_total || 0),
        hasMore: offset + rows.length < count,
      });
    } catch (error) {
      console.error('ConsumptionByResponsible Report Error:', error);
      return res.status(500).json({ error: 'Error generating consumption by responsible report' });
    }
  }

  // List of available reference months (for the selector)
  async getReferenceMonths(req, res) {
    try {
      const { workspaceId } = req.query;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });

      const [rows] = await sequelize.query(`
        SELECT DISTINCT TO_CHAR(item_date, 'YYYY-MM') AS month
        FROM invoices
        WHERE workspace_id = :workspaceId AND item_date IS NOT NULL
        ORDER BY month DESC
      `, { replacements: { workspaceId } });

      return res.json(rows.map(r => r.month));
    } catch (error) {
      console.error('ReferenceMonths Error:', error);
      return res.status(500).json({ error: 'Error fetching reference months' });
    }
  }
}

module.exports = new ReportController();
