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

      const [costCentersCount, invoicesCount, totalSpent] = await Promise.all([
        CostCenter.count({ where: { workspace_id: workspaceId } }),
        Invoice.count({ where: { workspace_id: workspaceId } }),
        Invoice.sum('charged_value', { where: { workspace_id: workspaceId } })
      ]);

      return res.json({
        costCenters: costCentersCount,
        invoicesCount: invoicesCount,
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

      const filter = { workspace_id: workspaceId };

      if (mes && ano) {
        const startDate = `${ano}-${mes.padStart(2, '0')}-01`;
        const endDate = new Date(ano, mes, 0).toISOString().split('T')[0];
        filter.item_date = { [Op.between]: [startDate, endDate] };
      } else if (ano) {
        filter.item_date = { [Op.between]: [`${ano}-01-01`, `${ano}-12-31`] };
      }

      if (telefone) {
        filter.source_phone = telefone;
      }

      const [costCenters, allInvoices] = await Promise.all([
        CostCenter.findAll({
          where: { 
            workspace_id: workspaceId,
            ...(centroCustoId && centroCustoId !== 'unallocated' ? { id: centroCustoId } : {})
          }
        }),
        Invoice.findAll({ where: filter })
      ]);

      const normalize = (tel) => tel ? String(tel).replace(/\D/g, '') : '';

      // 2. Map CC to their spending
      let summary = costCenters.map(cc => {
        const ccPhones = (cc.phones || []).map(normalize);

        const spending = allInvoices
          .filter(f => ccPhones.includes(normalize(f.source_phone)))
          .reduce((acc, f) => acc + parseFloat(f.charged_value || 0), 0);

        return {
          id: cc.id,
          name: cc.name, // Renamed from name
          total: spending,
          phones: cc.phones || [] // Renamed from telefones
        };
      });

      // Handle unallocated
      if (!centroCustoId || centroCustoId === 'unallocated') {
        const allCcPhonesNormalized = costCenters.flatMap(cc => (cc.phones || []).map(normalize));
        const unallocatedItems = allInvoices.filter(f => !allCcPhonesNormalized.includes(normalize(f.source_phone)));
        const unallocatedTotal = unallocatedItems.reduce((acc, f) => acc + parseFloat(f.charged_value || 0), 0);

        if (unallocatedTotal > 0) {
          summary.push({
            id: 'unallocated',
            name: 'Unallocated', // Renamed from Não Alocado
            total: unallocatedTotal,
            phones: []
          });
        }
      }

      // 3. Generate detailed data (per phone)
      const details = [];
      const allPhones = [...new Set(allInvoices.map(f => f.source_phone).filter(Boolean))];

      allPhones.forEach(phone => {
        const normalizedPhone = normalize(phone);
        const cc = summary.find(s => s.id !== 'unallocated' && s.phones.map(normalize).includes(normalizedPhone));

        const phoneItems = allInvoices.filter(f => normalize(f.source_phone) === normalizedPhone);
        const total = phoneItems.reduce((acc, f) => acc + parseFloat(f.charged_value || 0), 0);

        details.push({
          phone: phone, // Renamed from telefone
          costCenter: cc ? cc.name : 'Unallocated', // Renamed from centroCusto and Não Alocado
          total: total,
          recordCount: phoneItems.length // Renamed from qtdRegistros
        });
      });

      // 4. General records
      const general = allInvoices.map(f => {
        const normalizedPhone = normalize(f.source_phone);
        const cc = summary.find(s => s.id !== 'unallocated' && s.phones.map(normalize).includes(normalizedPhone));
        return {
          id: f.id,
          operator: f.operator, // Renamed from operadora
          phone: f.source_phone, // Renamed from telefone
          date: f.item_date, // Renamed from data
          time: f.item_time, // Renamed from hora
          service: f.description, // Renamed from servico
          value: parseFloat(f.charged_value || 0), // Renamed from valor
          costCenter: cc ? cc.name : 'Unallocated' // Renamed from centroCusto and Não Alocado
        };
      }).sort((a, b) => new Date(b.date) - new Date(a.date));

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

      const { rows, count } = await PhoneLine.findAndCountAll({
        where: { workspace_id: workspaceId, ...buildSearchClause(search) },
        include: [{ model: CostCenter, as: 'costCenter', attributes: ['id', 'code', 'name'] }],
        order: [[{ model: CostCenter, as: 'costCenter' }, 'code', 'ASC'], ['phone_number', 'ASC']],
        limit: PAGE_SIZE,
        offset,
      });

      const items = rows.map(r => ({
        id: r.id,
        costCenterCode: r.costCenter?.code || '',
        costCenterName: r.costCenter?.name || 'Unallocated',
        phoneNumber: r.phone_number,
        responsibleName: r.responsible_name || '',
        responsibleId: r.responsible_id || '',
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
        JOIN phone_lines pl ON pl.phone_number = i.source_phone AND pl.workspace_id = i.workspace_id
        JOIN cost_centers cc ON cc.id = pl.cost_center_id
        WHERE i.workspace_id = :workspaceId
          ${like ? "AND (cc.code ILIKE :like OR cc.name ILIKE :like OR pl.responsible_name ILIKE :like OR pl.phone_number ILIKE :like)" : ""}
        GROUP BY cc.id, cc.code, cc.name, TO_CHAR(i.item_date, 'YYYY-MM')
      `;

      const [rows] = await sequelize.query(`
        SELECT cc.id AS cc_id, cc.code AS cc_code, cc.name AS cc_name,
               TO_CHAR(i.item_date, 'YYYY-MM') AS reference_month,
               SUM(i.charged_value) AS total
        ${baseSql}
        ORDER BY reference_month DESC, cc.code ASC
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
        WHERE pl.workspace_id = :workspaceId
          AND TO_CHAR(i.item_date, 'YYYY-MM') = :referenceMonth
          ${like ? "AND (cc.code ILIKE :like OR cc.name ILIKE :like OR pl.responsible_name ILIKE :like OR pl.phone_number ILIKE :like)" : ""}
      `;

      const fromSql = `
        FROM phone_lines pl
        LEFT JOIN cost_centers cc ON cc.id = pl.cost_center_id
        LEFT JOIN invoices i ON i.source_phone = pl.phone_number AND i.workspace_id = pl.workspace_id
        ${whereSql}
        GROUP BY pl.responsible_name, pl.responsible_id, pl.phone_number, cc.code, cc.name
      `;

      const [rows] = await sequelize.query(`
        SELECT pl.responsible_name, pl.responsible_id, pl.phone_number,
               cc.code AS cc_code, cc.name AS cc_name,
               COALESCE(SUM(i.charged_value), 0) AS total
        ${fromSql}
        ORDER BY pl.responsible_name ASC, pl.phone_number ASC
        LIMIT :limit OFFSET :offset
      `, { replacements: { workspaceId, referenceMonth, like, limit: PAGE_SIZE, offset } });

      const [[{ count, grand_total }]] = await sequelize.query(`
        SELECT COUNT(*)::int AS count, COALESCE(SUM(t.total), 0) AS grand_total
        FROM (SELECT COALESCE(SUM(i.charged_value), 0) AS total ${fromSql}) t
      `, { replacements: { workspaceId, referenceMonth, like } });

      const items = rows.map(r => ({
        responsibleName: r.responsible_name || '',
        responsibleId: r.responsible_id || '',
        phoneNumber: r.phone_number,
        costCenterCode: r.cc_code || '',
        costCenterName: r.cc_name || 'Unallocated',
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
