const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Workspace = require('./Workspace');

const CostCenter = sequelize.define('CostCenter', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  phones: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Workspace,
      key: 'id'
    }
  },
}, {
  tableName: 'cost_centers',
  schema: 'public',
  timestamps: true,
  underscored: true,
});

// Associations
Workspace.hasMany(CostCenter, { foreignKey: 'workspace_id', as: 'costCenters' });
CostCenter.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

module.exports = CostCenter;
