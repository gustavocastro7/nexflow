const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Workspace = require('./Workspace');

const OperationLog = sequelize.define('OperationLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  workspace_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  entity: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: true,
  },
}, {
  tableName: 'operation_logs',
  timestamps: true,
  underscored: true,
});

// Associations
OperationLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
OperationLog.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

module.exports = OperationLog;
