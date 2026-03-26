const Collaborator = require('../models/Collaborator');

class CollaboratorController {
  async index(req, res) {
    try {
      const { workspaceId, search } = req.query;
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID is required' });
      }

      const where = { workspace_id: workspaceId };
      
      // search logic could be added here using Sequelize Op.iLike

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
      await collaborator.destroy();
      return res.json({ message: 'Collaborator removed successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Error removing collaborator' });
    }
  }
}

module.exports = new CollaboratorController();
