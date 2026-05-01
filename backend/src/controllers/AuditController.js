const OperationLog = require('../models/OperationLog');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const { Op } = require('sequelize');

class AuditController {
  async list(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        action, 
        entity, 
        user_id, 
        workspace_id,
        startDate,
        endDate
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (action) where.action = action;
      if (entity) where.entity = entity;
      if (user_id) where.user_id = user_id;
      if (workspace_id) where.workspace_id = workspace_id;

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at[Op.gte] = new Date(startDate);
        if (endDate) where.created_at[Op.lte] = new Date(endDate);
      }

      const { count, rows: logs } = await OperationLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }
        ]
      });

      // Fetch user names for the logs manually if associations are not set up yet
      // To keep it simple and safe for now, just return the logs
      
      res.json({
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        logs
      });
    } catch (error) {
      console.error('Audit list error:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }

  async getActionTypes(req, res) {
    try {
      const actions = await OperationLog.findAll({
        attributes: [[OperationLog.sequelize.fn('DISTINCT', OperationLog.sequelize.col('action')), 'action']],
      });
      res.json(actions.map(a => a.action));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch action types' });
    }
  }

  async getEntityTypes(req, res) {
    try {
      const entities = await OperationLog.findAll({
        attributes: [[OperationLog.sequelize.fn('DISTINCT', OperationLog.sequelize.col('entity')), 'entity']],
      });
      res.json(entities.map(e => e.entity).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch entity types' });
    }
  }
}

module.exports = new AuditController();
