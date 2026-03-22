const CostCenter = require('../models/CostCenter');

class CostCenterController {
  async index(req, res) {
    try {
      const { workspaceId } = req.query;

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
      }

      const centers = await CostCenter.findAll({
        where: { workspace_id: workspaceId },
        order: [['name', 'ASC']]
      });

      return res.json(centers);
    } catch (error) {
      console.error('CostCenter index error:', error);
      return res.status(500).json({ error: 'Error listing cost centers' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const center = await CostCenter.findByPk(id);
      if (!center) {
        return res.status(404).json({ error: 'Cost center not found' });
      }
      return res.json(center);
    } catch (error) {
      return res.status(500).json({ error: 'Error fetching cost center' });
    }
  }

  async store(req, res) {
    try {
      const { name, description, phones, workspaceId } = req.body;

      if (!name || !workspaceId) {
        return res.status(400).json({ error: 'Name and Workspace ID are required' });
      }

      const center = await CostCenter.create({
        name,
        description,
        phones: phones || [],
        workspace_id: workspaceId
      });

      return res.status(201).json(center);
    } catch (error) {
      console.error('CostCenter store error:', error);
      return res.status(500).json({ error: 'Error creating cost center' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, phones } = req.body;

      const center = await CostCenter.findByPk(id);

      if (!center) {
        return res.status(404).json({ error: 'Cost center not found' });
      }

      await center.update({
        name,
        description,
        phones: phones || []
      });

      return res.json(center);
    } catch (error) {
      return res.status(500).json({ error: 'Error updating cost center' });
    }
  }

  async destroy(req, res) {
    try {
      const { id } = req.params;

      const center = await CostCenter.findByPk(id);

      if (!center) {
        return res.status(404).json({ error: 'Cost center not found' });
      }

      await center.destroy();

      return res.json({ message: 'Cost center removed successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Error removing cost center' });
    }
  }
}

module.exports = new CostCenterController();
