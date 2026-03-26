const PhoneLine = require('../models/PhoneLine');
const Collaborator = require('../models/Collaborator');
const CostCenter = require('../models/CostCenter');

class PhoneLineController {
  async index(req, res) {
    try {
      const { workspaceId } = req.query;
      if (!workspaceId) return res.status(400).json({ error: 'Workspace ID is required' });

      const lines = await PhoneLine.findAll({
        where: { workspace_id: workspaceId },
        include: [
          { model: Collaborator, as: 'collaborator', attributes: ['id', 'name'] },
          { model: CostCenter, as: 'costCenter', attributes: ['id', 'name', 'code'] }
        ],
        order: [['phone_number', 'ASC']]
      });

      return res.json(lines);
    } catch (error) {
      console.error('PhoneLine index error:', error);
      return res.status(500).json({ error: 'Error listing phone lines' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { collaborator_id, cost_center_id, responsible_name, responsible_id } = req.body;

      const line = await PhoneLine.findByPk(id);
      if (!line) return res.status(404).json({ error: 'Phone line not found' });

      await line.update({
        collaborator_id: collaborator_id || null,
        cost_center_id: cost_center_id || null,
        responsible_name,
        responsible_id
      });

      return res.json(line);
    } catch (error) {
      console.error('PhoneLine update error:', error);
      return res.status(500).json({ error: 'Error updating phone line' });
    }
  }
}

module.exports = new PhoneLineController();
