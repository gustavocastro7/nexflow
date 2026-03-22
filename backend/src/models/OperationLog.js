const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
  payload: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  tableName: 'operation_logs',
  schema: 'public',
  timestamps: true,
  underscored: true,
});

module.exports = OperationLog;
