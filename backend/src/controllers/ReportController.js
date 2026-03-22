const Invoice = require('../models/Invoice');
const CostCenter = require('../models/CostCenter');
const { Op, fn, col } = require('sequelize');

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
}

module.exports = new ReportController();
exports = new ReportController();
