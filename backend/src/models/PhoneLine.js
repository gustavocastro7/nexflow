const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const CostCenter = require('./CostCenter');
const Workspace = require('./Workspace');
const Collaborator = require('./Collaborator');

const PhoneLine = sequelize.define('PhoneLine', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  phone_number: {
    type: DataTypes.STRING(25),
    allowNull: false,
  },
  responsible_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  responsible_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  collaborator_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: Collaborator,
      key: 'id'
    }
  },
  cost_center_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: CostCenter,
      key: 'id'
    }
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
  tableName: 'phone_lines',
  schema: 'public',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['workspace_id'] },
    { fields: ['cost_center_id'] },
    { fields: ['phone_number'] },
    { fields: ['collaborator_id'] },
  ]
});

CostCenter.hasMany(PhoneLine, { foreignKey: 'cost_center_id', as: 'phoneLines' });
PhoneLine.belongsTo(CostCenter, { foreignKey: 'cost_center_id', as: 'costCenter' });

Workspace.hasMany(PhoneLine, { foreignKey: 'workspace_id', as: 'phoneLines' });
PhoneLine.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

Collaborator.hasMany(PhoneLine, { foreignKey: 'collaborator_id', as: 'phoneLines' });
PhoneLine.belongsTo(Collaborator, { foreignKey: 'collaborator_id', as: 'collaborator' });

module.exports = PhoneLine;
