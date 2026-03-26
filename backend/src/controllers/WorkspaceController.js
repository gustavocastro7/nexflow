const Workspace = require('../models/Workspace');
const UserWorkspace = require('../models/UserWorkspace');
const User = require('../models/User');
const OperationLog = require('../models/OperationLog');
const sequelize = require('../config/database');
const AssociationHistory = require('../models/AssociationHistory');
const CostCenter = require('../models/CostCenter');

class WorkspaceController {
  async index(req, res) {
    try {
      if (req.userProfile !== 'jedi') {
        return res.status(403).json({ error: 'Access denied' });
      }
      const workspaces = await Workspace.findAll();
      return res.json(workspaces);
    } catch (error) {
      return res.status(500).json({ error: 'Error listing workspaces' });
    }
  }

  async show(req, res) {
    try {
      const { id } = req.params;
      const workspace = await Workspace.findByPk(id);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      return res.json(workspace);
    } catch (error) {
      return res.status(500).json({ error: 'Error fetching workspace' });
    }
  }

  async store(req, res) {
    const transaction = await sequelize.transaction();
    try {
      if (req.userProfile !== 'jedi') {
        return res.status(403).json({ error: 'Access denied' });
      }
      const { name, schema_name, billing_cycle_start_day } = req.body;

      if (!name || !schema_name) {
        return res.status(400).json({ error: 'name and schema_name are required' });
      }

      const workspace = await Workspace.create({ 
        name, 
        schema_name, 
        billing_cycle_start_day: billing_cycle_start_day || 1 
      }, { transaction });
      await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schema_name}"`, { transaction });

      // Create default "Matriz" cost center
      await CostCenter.create({
        name: 'Matriz',
        code: 'MATRIZ',
        description: 'Centro de Custo Padrão',
        workspace_id: workspace.id,
        phones: []
      }, { transaction });

      await transaction.commit();
      return res.status(201).json(workspace);
    } catch (error) {
      await transaction.rollback();
      console.error('Workspace store error:', error);
      return res.status(500).json({ error: 'Error creating workspace' });
    }
  }

  async update(req, res) {
    try {
      if (req.userProfile !== 'jedi') {
        return res.status(403).json({ error: 'Access denied' });
      }
      const { id } = req.params;
      const { name, status, billing_cycle_start_day } = req.body;
      const workspace = await Workspace.findByPk(id);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      await workspace.update({ name, status, billing_cycle_start_day });
      return res.json(workspace);
    } catch (error) {
      return res.status(500).json({ error: 'Error updating workspace' });
    }
  }

  async destroy(req, res) {
    try {
      if (req.userProfile !== 'jedi') {
        return res.status(403).json({ error: 'Access denied' });
      }
      const { id } = req.params;
      const workspace = await Workspace.findByPk(id);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      if (workspace.schema_name === 'teleen_consultoria') {
        return res.status(400).json({ error: 'Cannot delete the main workspace' });
      }
      await workspace.destroy();
      return res.json({ message: 'Workspace deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Error deleting workspace' });
    }
  }

  async listByUser(req, res) {
    try {
      const { userId } = req.params;
      console.log('listByUser called for userId:', userId, 'with profile:', req.userProfile);

      if (req.userProfile === 'jedi') {
        const workspaces = await Workspace.findAll();
        console.log('Jedi detected. Found workspaces count:', workspaces.length);
        console.log('Workspaces data:', JSON.stringify(workspaces, null, 2));
        return res.json(workspaces);
      }

      const associations = await UserWorkspace.findAll({
        where: { user_id: userId },
        include: [{ model: Workspace, as: 'workspace' }]
      });

      let workspaces = associations.map(a => a.workspace).filter(Boolean);

      // Se não houver associações, tenta buscar pelo default_workspace_id do usuário
      if (workspaces.length === 0) {
        const user = await User.findByPk(userId);
        if (user && user.default_workspace_id) {
          const defaultWS = await Workspace.findByPk(user.default_workspace_id);
          if (defaultWS) {
            workspaces = [defaultWS];
          }
        }
      }

      return res.json(workspaces);
    } catch (error) {
      console.error('listByUser error:', error);
      return res.status(500).json({ error: 'Error listing user workspaces' });
    }
  }

  async removeAssociation(req, res) {
    try {
      const { userId, workspaceId } = req.body;
      const association = await UserWorkspace.findOne({
        where: { user_id: userId, workspace_id: workspaceId }
      });
      if (!association) {
        return res.status(404).json({ error: 'Association not found' });
      }
      await association.destroy();
      await AssociationHistory.create({
        user_id: userId,
        workspace_id: workspaceId,
        action: 'removido'
      });
      return res.json({ message: 'Association removed successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Error removing association' });
    }
  }

  async verifyAssociation(req, res) {
    try {
      const { userId } = req.query;
      const targetUserId = userId || req.userId;
      
      // Se não for jedi, não precisamos verificar múltiplas associações aqui
      // pois eles sempre devem cair no seu workspace padrão ou único associado.
      if (req.userProfile !== 'jedi') { 
        return res.json({ multiple: false, count: 1 });
      }

      const associations = await UserWorkspace.findAll({ where: { user_id: targetUserId } });
      if (associations.length > 1) {
        await OperationLog.create({
          user_id: targetUserId,
          workspace_id: 'SYSTEM',
          action: 'MULTIPLE_ASSOCIATIONS_DETECTED',
          payload: { count: associations.length, associations }
        });
        return res.json({ multiple: true, count: associations.length, message: 'User has multiple workspace associations' });
      }
      return res.json({ multiple: false, count: associations.length });
    } catch (error) {
      return res.status(500).json({ error: 'Error verifying associations' });
    }
  }

  async notifyAssociationProblem(req, res) {
    try {
      const { userId, message } = req.body;
      await OperationLog.create({ user_id: userId, workspace_id: 'SYSTEM', action: 'WORKSPACE_ASSOCIATION_PROBLEM', payload: { message } });
      return res.json({ message: 'Problem notified successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Error notifying problem' });
    }
  }

  async setSession(req, res) {
    try {
      const { userId, workspaceId } = req.body;
      
      // Jedi pode entrar em qualquer workspace sem associação prévia necessária no banco
      if (req.userProfile === 'jedi') {
        const workspace = await Workspace.findByPk(workspaceId);
        if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
        return res.json({ message: 'Workspace session started (Master)', workspace });
      }

      const association = await UserWorkspace.findOne({
        where: { user_id: userId, workspace_id: workspaceId },
        include: [{ model: Workspace, as: 'workspace' }]
      });
      if (!association) return res.status(403).json({ error: 'User not associated with this workspace' });
      return res.json({ message: 'Workspace session started', workspace: association.workspace });
    } catch (error) {
      return res.status(500).json({ error: 'Error managing workspace session' });
    }
  }

  async associateUnique(req, res) {
    try {
      const { userId, workspaceId } = req.body;
      const existingAssociation = await UserWorkspace.findOne({ where: { user_id: userId } });
      if (existingAssociation) return res.status(400).json({ error: 'User already associated with a workspace.' });
      const association = await UserWorkspace.create({ user_id: userId, workspace_id: workspaceId });
      return res.status(201).json(association);
    } catch (error) {
      return res.status(500).json({ error: 'Error creating unique association' });
    }
  }

  async associate(req, res) {
    try {
      const { userId, workspaceId } = req.body;
      const association = await UserWorkspace.create({ user_id: userId, workspace_id: workspaceId });
      return res.status(201).json(association);
    } catch (error) {
      return res.status(500).json({ error: 'Error associating user to workspace' });
    }
  }

  async checkAssociation(req, res) {
    try {
      const { userId, workspaceId } = req.query;
      const association = await UserWorkspace.findOne({ where: { user_id: userId, workspace_id: workspaceId } });
      return res.json({ associated: !!association });
    } catch (error) {
      return res.status(500).json({ error: 'Error verifying association' });
    }
  }
}

module.exports = new WorkspaceController();
